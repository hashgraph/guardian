"""
Unit tests for table_processing.py - TableIsolatedHybridChunker and split table detection.

Uses real DocChunk/DocItem objects for merge tests to survive Pydantic validation
in the parent HybridChunker merge logic (DocMeta validates doc_items as DocItem).
"""

from __future__ import annotations

from unittest.mock import Mock, patch

import pytest

from document_ingestion_worker.document_parsing.table_processing import (
    HybridChunkerAdapter,
    TableIsolatedHybridChunker,
    TableMergeError,
    _cluster_x_positions,
    _reconstruct_rows,
    detect_and_merge_split_tables,
    recover_type2_split_tables,
)

# Mark all tests in this module as unit tests
pytestmark = pytest.mark.unit

# ---------------------------------------------------------------------------
# Helpers for building chunks
# ---------------------------------------------------------------------------


def _make_doc_item(label_value: str):
    """Create a real DocItem with a given label string.

    Uses string labels directly (DocItem coerces to DocItemLabel enum)
    to avoid dependency on DocItemLabel import which can be polluted
    by sys.modules-level mocking in other test modules.
    """
    from docling_core.types.doc import DocItem

    return DocItem(self_ref="#/texts/0", label=label_value)


def _make_chunk(text: str, label: str = "text", headings: list[str] | None = None):
    """Create a real DocChunk with given text, label, and headings."""
    from docling_core.transforms.chunker import DocChunk, DocMeta

    doc_item = _make_doc_item(label)
    meta = DocMeta(doc_items=[doc_item], headings=headings or ["Section A"])
    return DocChunk(text=text, meta=meta)


# ===========================================================================
# TableIsolatedHybridChunker Tests
# ===========================================================================


class TestChunkHasTable:
    """Test _chunk_has_table static method."""

    def test_chunk_with_table_label(self):
        chunk = _make_chunk("table content", label="table")
        assert TableIsolatedHybridChunker._chunk_has_table(chunk) is True

    def test_chunk_with_text_label(self):
        chunk = _make_chunk("paragraph", label="text")
        assert TableIsolatedHybridChunker._chunk_has_table(chunk) is False

    def test_chunk_with_formula_label(self):
        chunk = _make_chunk("E=mc2", label="formula")
        assert TableIsolatedHybridChunker._chunk_has_table(chunk) is False

    def test_chunk_with_no_doc_items(self):
        chunk = Mock()
        chunk.meta = Mock()
        chunk.meta.doc_items = []
        assert TableIsolatedHybridChunker._chunk_has_table(chunk) is False

    def test_chunk_with_no_meta(self):
        chunk = Mock()
        chunk.meta = None
        assert TableIsolatedHybridChunker._chunk_has_table(chunk) is False

    def test_chunk_with_multiple_items_including_table(self):
        text_item = _make_doc_item("text")
        table_item = _make_doc_item("table")
        chunk = Mock()
        chunk.meta = Mock()
        chunk.meta.doc_items = [text_item, table_item]
        assert TableIsolatedHybridChunker._chunk_has_table(chunk) is True

    def test_chunk_with_multiple_non_table_items(self):
        items = [_make_doc_item("text"), _make_doc_item("formula")]
        chunk = Mock()
        chunk.meta = Mock()
        chunk.meta.doc_items = items
        assert TableIsolatedHybridChunker._chunk_has_table(chunk) is False


class TestTableIsolatedMerge:
    """Test _merge_chunks_with_matching_metadata with composition pattern.

    Uses real DocChunk objects so the real HybridChunker merge works correctly
    (DocMeta validates doc_items as real DocItem instances).
    """

    def _make_chunker(self):
        """Create a TableIsolatedHybridChunker with a real HybridChunker adapter."""
        from docling.chunking import HybridChunker
        from docling_core.transforms.chunker.tokenizer.huggingface import HuggingFaceTokenizer
        from transformers import AutoTokenizer

        # Create a real tokenizer for HybridChunker
        tokenizer_model = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
        tokenizer = HuggingFaceTokenizer(
            tokenizer=tokenizer_model,
            max_tokens=5000,
            overlap_tokens=0,
        )

        # Create a real HybridChunker with merge_peers=True
        base_chunker = HybridChunker(tokenizer=tokenizer, merge_peers=True)

        # Wrap in adapter and create TableIsolatedHybridChunker
        adapter = HybridChunkerAdapter(base_chunker)
        return TableIsolatedHybridChunker(adapter)

    def _call_merge(self, chunker, chunks):
        """Call the merge method, delegating non-table groups to base chunker."""
        return chunker._merge_chunks_with_matching_metadata(chunks)

    def test_two_table_chunks_not_merged(self):
        """Two table chunks with same headings should NOT be merged."""
        chunker = self._make_chunker()
        t1 = _make_chunk("Table 1", label="table", headings=["Section A"])
        t2 = _make_chunk("Table 2", label="table", headings=["Section A"])

        result = self._call_merge(chunker, [t1, t2])

        assert len(result) == 2
        assert result[0] is t1
        assert result[1] is t2

    def test_two_text_chunks_still_merged(self):
        """Two text chunks with same headings should be merged via parent."""
        chunker = self._make_chunker()
        p1 = _make_chunk("Paragraph 1", label="text", headings=["Section A"])
        p2 = _make_chunk("Paragraph 2", label="text", headings=["Section A"])

        result = self._call_merge(chunker, [p1, p2])

        # Parent merge combines same-heading chunks into one
        assert len(result) == 1

    def test_table_as_barrier_between_text(self):
        """Text-Table-Text should produce 3 chunks (table is barrier)."""
        chunker = self._make_chunker()
        p1 = _make_chunk("Before", label="text", headings=["Section A"])
        t1 = _make_chunk("Table data", label="table", headings=["Section A"])
        p2 = _make_chunk("After", label="text", headings=["Section A"])

        result = self._call_merge(chunker, [p1, t1, p2])

        assert len(result) == 3
        assert result[1] is t1

    def test_text_groups_merge_around_table_barrier(self):
        """Text-Text-Table-Text-Text -> 3 chunks (texts merge on each side)."""
        chunker = self._make_chunker()
        chunks = [
            _make_chunk("A", label="text", headings=["S"]),
            _make_chunk("B", label="text", headings=["S"]),
            _make_chunk("TABLE", label="table", headings=["S"]),
            _make_chunk("C", label="text", headings=["S"]),
            _make_chunk("D", label="text", headings=["S"]),
        ]

        result = self._call_merge(chunker, chunks)

        # A+B merged, TABLE isolated, C+D merged = 3 chunks
        assert len(result) == 3
        assert result[1] is chunks[2]  # The table chunk

    def test_single_table_chunk_unchanged(self):
        """Single table chunk should pass through unchanged."""
        chunker = self._make_chunker()
        t1 = _make_chunk("Table", label="table")

        result = self._call_merge(chunker, [t1])

        assert len(result) == 1
        assert result[0] is t1

    def test_empty_input(self):
        """Empty input should return empty output."""
        chunker = self._make_chunker()
        result = self._call_merge(chunker, [])
        assert result == []

    def test_only_text_chunks(self):
        """Without tables, all chunks delegated to parent merge."""
        chunker = self._make_chunker()
        chunks = [
            _make_chunk("A", label="text", headings=["S"]),
            _make_chunk("B", label="text", headings=["S"]),
        ]

        result = self._call_merge(chunker, chunks)

        # Parent merge combines same-heading chunks
        assert len(result) == 1

    def test_different_headings_not_merged(self):
        """Text chunks with different headings stay separate (parent behavior)."""
        chunker = self._make_chunker()
        chunks = [
            _make_chunk("A", label="text", headings=["Section 1"]),
            _make_chunk("B", label="text", headings=["Section 2"]),
        ]

        result = self._call_merge(chunker, chunks)

        assert len(result) == 2

    def test_multiple_tables_interspersed_with_text(self):
        """Text-Table-Text-Table-Text -> 5 chunks."""
        chunker = self._make_chunker()
        chunks = [
            _make_chunk("p1", label="text", headings=["S"]),
            _make_chunk("t1", label="table", headings=["S"]),
            _make_chunk("p2", label="text", headings=["S"]),
            _make_chunk("t2", label="table", headings=["S"]),
            _make_chunk("p3", label="text", headings=["S"]),
        ]

        result = self._call_merge(chunker, chunks)

        # Each element is isolated: text can't merge across tables
        assert len(result) == 5

    def test_consecutive_tables_all_isolated(self):
        """Three consecutive tables -> 3 separate chunks."""
        chunker = self._make_chunker()
        chunks = [
            _make_chunk("t1", label="table", headings=["S"]),
            _make_chunk("t2", label="table", headings=["S"]),
            _make_chunk("t3", label="table", headings=["S"]),
        ]

        result = self._call_merge(chunker, chunks)

        assert len(result) == 3


class TestDoclingChunkerIsolateTablesFlag:
    """Test that DoclingChunker uses composition pattern correctly."""

    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunkerAdapter")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.TableIsolatedHybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_isolate_tables_true_uses_composition(
        self, mock_auto, mock_hf, mock_hybrid, mock_table_isolated, mock_adapter
    ):
        """When isolate_tables=True, HybridChunker is wrapped in adapter and TableIsolatedHybridChunker."""
        mock_auto.from_pretrained.return_value = Mock()
        mock_hf.return_value = Mock()
        mock_hybrid_instance = Mock()
        mock_hybrid.return_value = mock_hybrid_instance
        mock_adapter_instance = Mock()
        mock_adapter.return_value = mock_adapter_instance

        from document_ingestion_worker.document_parsing.docling_chunker import DoclingChunker

        _chunker = DoclingChunker(isolate_tables=True)

        # HybridChunker should be created for base_chunker and display_base_chunker
        assert mock_hybrid.call_count == 2
        # HybridChunkerAdapter should be created twice (main + display)
        assert mock_adapter.call_count == 2
        # TableIsolatedHybridChunker should be created twice (main + display)
        assert mock_table_isolated.call_count == 2
        # Adapter should be created with HybridChunker instance
        mock_adapter.assert_any_call(mock_hybrid_instance)
        # TableIsolatedHybridChunker should be created with adapter
        mock_table_isolated.assert_any_call(mock_adapter_instance)

    @patch("document_ingestion_worker.document_parsing.docling_chunker.TableIsolatedHybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_isolate_tables_false_uses_hybrid_directly(
        self, mock_auto, mock_hf, mock_hybrid, mock_table_isolated
    ):
        """When isolate_tables=False (default), HybridChunker is used directly without wrapping."""
        mock_auto.from_pretrained.return_value = Mock()
        mock_hf.return_value = Mock()

        from document_ingestion_worker.document_parsing.docling_chunker import DoclingChunker

        _chunker = DoclingChunker(isolate_tables=False)

        # HybridChunker should be created (base_chunker + display_base_chunker)
        assert mock_hybrid.call_count == 2
        # TableIsolatedHybridChunker should NOT have been called
        assert mock_table_isolated.call_count == 0


# ===========================================================================
# Split Table Detection Tests
# ===========================================================================


def _make_table_dict(
    index: int,
    page_no: int,
    bbox_t: float,
    bbox_b: float,
    num_rows: int = 3,
    num_cols: int = 2,
    cells: list[dict] | None = None,
) -> dict:
    """Create a minimal table dict for testing."""
    if cells is None:
        cells = [
            {
                "text": f"cell_{r}_{c}",
                "start_row_offset_idx": r,
                "end_row_offset_idx": r + 1,
                "start_col_offset_idx": c,
                "end_col_offset_idx": c + 1,
                "col_span": 1,
                "row_span": 1,
            }
            for r in range(num_rows)
            for c in range(num_cols)
        ]
    return {
        "self_ref": f"#/tables/{index}",
        "label": "table",
        "prov": [
            {
                "page_no": page_no,
                "bbox": {"l": 100, "t": bbox_t, "r": 500, "b": bbox_b},
            }
        ],
        "data": {
            "table_cells": cells,
            "num_rows": num_rows,
            "num_cols": num_cols,
        },
        "children": [],
    }


def _make_doc_dict_with_tables(tables: list[dict]) -> dict:
    """Create a minimal doc_dict with given tables."""
    return {
        "tables": tables,
        "texts": [],
        "pictures": [],
        "groups": [],
        "body": {"children": [{"$ref": t["self_ref"]} for t in tables]},
    }


class TestDetectAndMergeSplitTables:
    """Test split table detection and merging."""

    def test_type1_split_detected_and_merged(self):
        """Table near bottom of page + table near top of next page -> merged."""
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=3)
        t2 = _make_table_dict(1, page_no=2, bbox_t=720, bbox_b=200, num_rows=2)
        doc_dict = _make_doc_dict_with_tables([t1, t2])

        result_dict, count = detect_and_merge_split_tables(doc_dict, validate=False)

        assert count == 1
        # Only 1 table remains (continuation removed)
        assert len(result_dict["tables"]) == 1
        # Combined rows: 3 + 2 = 5
        assert result_dict["tables"][0]["data"]["num_rows"] == 5
        # Combined cells count: 3*2 + 2*2 = 10
        assert len(result_dict["tables"][0]["data"]["table_cells"]) == 10

    def test_normal_tables_not_detected(self):
        """Tables not near page boundaries should not be detected."""
        t1 = _make_table_dict(0, page_no=1, bbox_t=500, bbox_b=300)  # Middle of page
        t2 = _make_table_dict(1, page_no=2, bbox_t=500, bbox_b=300)  # Middle of page
        doc_dict = _make_doc_dict_with_tables([t1, t2])

        result_dict, count = detect_and_merge_split_tables(doc_dict, validate=False)

        assert count == 0
        assert len(result_dict["tables"]) == 2

    def test_table_near_bottom_no_continuation(self):
        """Table near bottom but no table on next page -> not detected."""
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80)
        t2 = _make_table_dict(1, page_no=3, bbox_t=720, bbox_b=200)  # Page 3, not 2
        doc_dict = _make_doc_dict_with_tables([t1, t2])

        result_dict, count = detect_and_merge_split_tables(doc_dict, validate=False)

        assert count == 0
        assert len(result_dict["tables"]) == 2

    def test_continuation_not_near_top(self):
        """Table near bottom + table on next page but NOT near top -> not detected."""
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80)
        t2 = _make_table_dict(1, page_no=2, bbox_t=400, bbox_b=200)  # Not near top
        doc_dict = _make_doc_dict_with_tables([t1, t2])

        result_dict, count = detect_and_merge_split_tables(doc_dict, validate=False)

        assert count == 0
        assert len(result_dict["tables"]) == 2

    def test_empty_document(self):
        """Empty document should return 0 merges."""
        doc_dict = {
            "tables": [],
            "texts": [],
            "pictures": [],
            "groups": [],
            "body": {"children": []},
        }

        result_dict, count = detect_and_merge_split_tables(doc_dict, validate=False)

        assert count == 0

    def test_single_table(self):
        """Single table cannot be split."""
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80)
        doc_dict = _make_doc_dict_with_tables([t1])

        result_dict, count = detect_and_merge_split_tables(doc_dict, validate=False)

        assert count == 0
        assert len(result_dict["tables"]) == 1

    def test_custom_thresholds(self):
        """Custom thresholds should be respected."""
        # With default thresholds (120, 700), this would be detected
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80)
        t2 = _make_table_dict(1, page_no=2, bbox_t=720, bbox_b=200)
        doc_dict = _make_doc_dict_with_tables([t1, t2])

        # Tighten bottom threshold so 80 is no longer "near bottom"
        result_dict, count = detect_and_merge_split_tables(
            doc_dict, bottom_threshold=50.0, top_threshold=700.0, validate=False
        )

        assert count == 0
        assert len(result_dict["tables"]) == 2

    def test_column_mismatch_not_merged(self):
        """Tables with different column counts should NOT be merged."""
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_cols=4)
        t2 = _make_table_dict(1, page_no=2, bbox_t=720, bbox_b=200, num_cols=2)
        doc_dict = _make_doc_dict_with_tables([t1, t2])

        result_dict, count = detect_and_merge_split_tables(doc_dict, validate=False)

        assert count == 0
        assert len(result_dict["tables"]) == 2

    def test_multiple_splits_detected(self):
        """Multiple split table pairs detected across pages."""
        tables = [
            _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=2),
            _make_table_dict(1, page_no=2, bbox_t=720, bbox_b=80, num_rows=2),
            _make_table_dict(2, page_no=3, bbox_t=720, bbox_b=200, num_rows=2),
        ]
        doc_dict = _make_doc_dict_with_tables(tables)

        result_dict, count = detect_and_merge_split_tables(doc_dict, validate=False)

        # t0 -> t1 (split across page 1-2), t1 -> t2 (split across page 2-3)
        assert count == 2
        # Only 1 table remains after both merges
        assert len(result_dict["tables"]) == 1
        # Combined: 2+2+2 = 6 rows
        assert result_dict["tables"][0]["data"]["num_rows"] == 6


class TestMergeCorrectness:
    """Test that merged tables have correct cell data."""

    def test_continuation_row_indices_offset(self):
        """Continuation table cells should have row indices offset."""
        ending_cells = [
            {
                "text": "a",
                "start_row_offset_idx": 0,
                "end_row_offset_idx": 1,
                "start_col_offset_idx": 0,
                "end_col_offset_idx": 1,
                "col_span": 1,
                "row_span": 1,
            },
            {
                "text": "b",
                "start_row_offset_idx": 1,
                "end_row_offset_idx": 2,
                "start_col_offset_idx": 0,
                "end_col_offset_idx": 1,
                "col_span": 1,
                "row_span": 1,
            },
        ]
        continuation_cells = [
            {
                "text": "c",
                "start_row_offset_idx": 0,
                "end_row_offset_idx": 1,
                "start_col_offset_idx": 0,
                "end_col_offset_idx": 1,
                "col_span": 1,
                "row_span": 1,
            },
        ]

        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=2, cells=ending_cells)
        t2 = _make_table_dict(
            1, page_no=2, bbox_t=720, bbox_b=200, num_rows=1, cells=continuation_cells
        )
        doc_dict = _make_doc_dict_with_tables([t1, t2])

        result_dict, count = detect_and_merge_split_tables(doc_dict, validate=False)

        assert count == 1
        merged_cells = result_dict["tables"][0]["data"]["table_cells"]
        assert len(merged_cells) == 3

        # First two cells unchanged
        assert merged_cells[0]["start_row_offset_idx"] == 0
        assert merged_cells[1]["start_row_offset_idx"] == 1

        # Third cell (from continuation) offset by 2 (ending table's num_rows)
        assert merged_cells[2]["start_row_offset_idx"] == 2
        assert merged_cells[2]["end_row_offset_idx"] == 3

    def test_continuation_table_removed_from_body(self):
        """Continuation table reference should be removed from body children."""
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=2)
        t2 = _make_table_dict(1, page_no=2, bbox_t=720, bbox_b=200, num_rows=1)
        doc_dict = _make_doc_dict_with_tables([t1, t2])

        result_dict, count = detect_and_merge_split_tables(doc_dict, validate=False)

        assert count == 1
        # Body should only have 1 child reference now
        body_refs = [c["$ref"] for c in result_dict["body"]["children"]]
        assert len(body_refs) == 1
        assert body_refs[0] == "#/tables/0"

    def test_self_refs_updated_after_removal(self):
        """Remaining tables should have correct self_ref after removal."""
        tables = [
            _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=2),
            _make_table_dict(1, page_no=2, bbox_t=720, bbox_b=200, num_rows=1),
            _make_table_dict(2, page_no=3, bbox_t=500, bbox_b=300, num_rows=3),
        ]
        doc_dict = _make_doc_dict_with_tables(tables)

        result_dict, count = detect_and_merge_split_tables(doc_dict, validate=False)

        assert count == 1
        assert len(result_dict["tables"]) == 2
        # Self refs should be reindexed
        assert result_dict["tables"][0]["self_ref"] == "#/tables/0"
        assert result_dict["tables"][1]["self_ref"] == "#/tables/1"


class TestTableMergeError:
    """Test TableMergeError exception handling."""

    def test_table_merge_error_stores_context(self):
        """TableMergeError should store indices and original exception."""
        original = KeyError("table_cells")
        error = TableMergeError(
            ending_idx=5,
            continuation_idx=6,
            original_exception=original,
        )

        assert error.ending_idx == 5
        assert error.continuation_idx == 6
        assert error.original_exception is original
        assert "ending_idx=5" in str(error)
        assert "continuation_idx=6" in str(error)
        assert "KeyError" in str(error)

    def test_table_merge_error_custom_message(self):
        """TableMergeError should accept custom message."""
        original = IndexError("list index out of range")
        error = TableMergeError(
            ending_idx=10,
            continuation_idx=11,
            original_exception=original,
            message="Custom error message",
        )

        assert error.message == "Custom error message"
        assert str(error) == "Custom error message"

    def test_table_merge_error_repr(self):
        """TableMergeError repr should include all context."""
        original = TypeError("'NoneType' object is not subscriptable")
        error = TableMergeError(
            ending_idx=3,
            continuation_idx=4,
            original_exception=original,
        )

        repr_str = repr(error)
        assert "TableMergeError" in repr_str
        assert "ending_idx=3" in repr_str
        assert "continuation_idx=4" in repr_str
        assert "TypeError" in repr_str

    def test_merge_failure_logged_with_context(self, caplog):
        """Failed merge should log structured context and continue processing."""
        import logging

        # Ensure logger level is set to capture WARNING messages
        caplog.set_level(
            logging.WARNING, logger="document_ingestion_worker.document_parsing.table_processing"
        )

        # Create a table dict with malformed "table_cells" to trigger TypeError
        # The continuation table has table_cells as a string instead of list
        tables = [
            _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=2),
            {  # Malformed table - table_cells is a string, not a list
                "self_ref": "#/tables/1",
                "prov": [{"page_no": 2, "bbox": {"l": 72, "t": 720, "r": 500, "b": 200}}],
                "data": {
                    "num_rows": 1,
                    "num_cols": 2,
                    "table_cells": "invalid_not_a_list",  # Will cause TypeError in "for cell in continuation_cells"
                },
            },
        ]
        doc_dict = _make_doc_dict_with_tables(tables)

        # Should not raise exception, just log and skip the failed merge
        result_dict, count = detect_and_merge_split_tables(doc_dict, validate=False)

        # Merge should have been skipped (count = 0)
        assert count == 0

        # Check that warning was logged with structured context
        assert len(caplog.records) > 0
        warning_logs = [r for r in caplog.records if r.levelname == "WARNING"]
        assert len(warning_logs) > 0

        # Verify log contains structured information
        log_message = warning_logs[0].message
        assert "ending_idx=0" in log_message
        assert "continuation_idx=1" in log_message
        assert "AttributeError" in log_message  # String used as table_cells triggers AttributeError

    def test_merge_continues_after_failure(self, caplog):
        """After a merge failure, processing should continue with next candidate."""
        import logging

        # Ensure logger level is set to capture WARNING messages
        caplog.set_level(
            logging.WARNING, logger="document_ingestion_worker.document_parsing.table_processing"
        )

        # Create four tables:
        # t0 (page 1, near bottom) -> t1 (page 2, near top, MALFORMED)
        # t2 (page 2, near bottom) -> t3 (page 3, near top, VALID)
        tables = [
            _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=2),
            {  # Malformed - table_cells is not a list
                "self_ref": "#/tables/1",
                "prov": [{"page_no": 2, "bbox": {"l": 72, "t": 720, "r": 500, "b": 200}}],
                "data": {
                    "num_rows": 1,
                    "num_cols": 2,
                    "table_cells": "invalid_string",  # Will cause TypeError
                },
            },
            _make_table_dict(2, page_no=2, bbox_t=500, bbox_b=90, num_rows=1),
            _make_table_dict(3, page_no=3, bbox_t=710, bbox_b=300, num_rows=1),
        ]
        doc_dict = _make_doc_dict_with_tables(tables)

        result_dict, count = detect_and_merge_split_tables(doc_dict, validate=False)

        # Candidates are processed in reverse order: (2,3) first (succeeds), then (0,1) (fails)
        # So we should have 1 successful merge
        assert count == 1

        # Verify warning for failed merge of (0,1)
        warning_logs = [r for r in caplog.records if r.levelname == "WARNING"]
        assert len(warning_logs) == 1  # Only one failure expected
        assert "ending_idx=0" in warning_logs[0].message
        assert "continuation_idx=1" in warning_logs[0].message

        # Verify successful merge (tables 2 and 3)
        # After merge: [t0, t1_malformed, t2_merged] where t3 was removed
        # Then t1 stays at index 1, t2_merged stays at index 2
        assert len(result_dict["tables"]) == 3  # 4 - 1 removed = 3

        # The merged table (originally t2, now contains t2+t3) should have combined rows
        merged_table = result_dict["tables"][2]  # t2_merged is at index 2
        assert merged_table["data"]["num_rows"] == 2  # 1 + 1


# ===========================================================================
# Type 2: Recover misclassified table continuations
# ===========================================================================


def _make_text_dict(
    index: int,
    page_no: int,
    bbox_t: float,
    bbox_b: float,
    bbox_l: float,
    label: str = "text",
    text: str = "",
    parent_ref: str = "#/body",
) -> dict:
    """Create a minimal text dict for testing."""
    return {
        "self_ref": f"#/texts/{index}",
        "label": label,
        "parent": {"$ref": parent_ref},
        "children": [],
        "prov": [
            {
                "page_no": page_no,
                "bbox": {"l": bbox_l, "t": bbox_t, "r": bbox_l + 100, "b": bbox_b},
            }
        ],
        "text": text,
    }


def _make_doc_dict_with_tables_and_texts(
    tables: list[dict],
    texts: list[dict],
) -> dict:
    """Create a doc_dict with both tables and texts in body.children."""
    children = []
    for t in tables:
        children.append({"$ref": t["self_ref"]})
    for t in texts:
        # Only add body-level texts to body.children
        if t.get("parent", {}).get("$ref") == "#/body":
            children.append({"$ref": t["self_ref"]})
    return {
        "tables": tables,
        "texts": texts,
        "pictures": [],
        "groups": [],
        "body": {"children": children},
    }


class TestClusterXPositions:
    """Test _cluster_x_positions helper."""

    def test_two_clusters(self):
        clusters = _cluster_x_positions([119, 120, 245, 246, 118])
        assert len(clusters) == 2
        assert abs(clusters[0] - 119) < 2
        assert abs(clusters[1] - 245.5) < 1

    def test_single_cluster(self):
        clusters = _cluster_x_positions([100, 105, 110])
        assert len(clusters) == 1

    def test_empty(self):
        assert _cluster_x_positions([]) == []

    def test_three_clusters(self):
        clusters = _cluster_x_positions([100, 250, 500], tolerance=30)
        assert len(clusters) == 3

    def test_custom_tolerance(self):
        # With tight tolerance, 100 and 120 are separate clusters
        clusters = _cluster_x_positions([100, 120], tolerance=10)
        assert len(clusters) == 2


class TestReconstructRows:
    """Test _reconstruct_rows helper."""

    def test_basic_pairing(self):
        gap_texts = [
            (0, {"prov": [{"bbox": {"l": 119, "t": 500}}], "text": "Field A"}),
            (1, {"prov": [{"bbox": {"l": 245, "t": 502}}], "text": "Value A"}),
            (2, {"prov": [{"bbox": {"l": 119, "t": 400}}], "text": "Field B"}),
            (3, {"prov": [{"bbox": {"l": 245, "t": 398}}], "text": "Value B"}),
        ]
        rows, consumed = _reconstruct_rows(gap_texts, 119, 245)
        assert len(rows) == 2
        assert rows[0] == ("Field A", "Value A")
        assert rows[1] == ("Field B", "Value B")
        assert set(consumed) == {0, 1, 2, 3}

    def test_left_without_right_pair(self):
        gap_texts = [
            (0, {"prov": [{"bbox": {"l": 119, "t": 500}}], "text": "Field A"}),
        ]
        rows, consumed = _reconstruct_rows(gap_texts, 119, 245)
        assert len(rows) == 1
        assert rows[0] == ("Field A", "")
        assert consumed == [0]

    def test_skips_non_column_elements(self):
        """Elements far from both column centres should be skipped."""
        gap_texts = [
            (0, {"prov": [{"bbox": {"l": 119, "t": 500}}], "text": "Field"}),
            (1, {"prov": [{"bbox": {"l": 245, "t": 502}}], "text": "Value"}),
            (2, {"prov": [{"bbox": {"l": 492, "t": 502}}], "text": "subscript"}),
        ]
        rows, consumed = _reconstruct_rows(gap_texts, 119, 245)
        assert len(rows) == 1
        assert 2 not in consumed  # subscript fragment skipped


class TestRecoverType2SplitTables:
    """Test recover_type2_split_tables."""

    def test_type2_detected_and_recovered(self):
        """Table near bottom + gap texts with 2-column pattern -> cells appended."""
        # Ending table on page 1, near bottom
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=3)
        # Next table on page 2, NOT near top (starts at 400)
        t2 = _make_table_dict(1, page_no=2, bbox_t=400, bbox_b=200, num_rows=2)

        # Gap texts above t2 on page 2 (above y=400), two-column layout
        texts = [
            _make_text_dict(0, page_no=2, bbox_t=600, bbox_b=590, bbox_l=119, text="Purpose"),
            _make_text_dict(1, page_no=2, bbox_t=602, bbox_b=592, bbox_l=245, text="Calculation"),
            _make_text_dict(2, page_no=2, bbox_t=550, bbox_b=540, bbox_l=119, text="Method"),
            _make_text_dict(3, page_no=2, bbox_t=548, bbox_b=538, bbox_l=245, text="N/A"),
        ]

        doc_dict = _make_doc_dict_with_tables_and_texts([t1, t2], texts)
        result, count = recover_type2_split_tables(doc_dict, validate=False)

        assert count == 1
        # Ending table should have 3 + 2 = 5 rows now
        assert result["tables"][0]["data"]["num_rows"] == 5
        cells = result["tables"][0]["data"]["table_cells"]
        # Original 6 cells + 4 new (2 rows * 2 cols)
        assert len(cells) == 6 + 4

    def test_no_gap_elements(self):
        """Table near bottom but no gap texts -> 0 recoveries."""
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=3)
        t2 = _make_table_dict(1, page_no=2, bbox_t=400, bbox_b=200, num_rows=2)
        doc_dict = _make_doc_dict_with_tables_and_texts([t1, t2], [])

        result, count = recover_type2_split_tables(doc_dict, validate=False)
        assert count == 0

    def test_single_column_ignored(self):
        """Gap texts all in one X-column -> not Type 2."""
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=3)
        t2 = _make_table_dict(1, page_no=2, bbox_t=400, bbox_b=200, num_rows=2)

        # All texts at same X position — single column
        texts = [
            _make_text_dict(0, page_no=2, bbox_t=600, bbox_b=590, bbox_l=119, text="A"),
            _make_text_dict(1, page_no=2, bbox_t=550, bbox_b=540, bbox_l=119, text="B"),
            _make_text_dict(2, page_no=2, bbox_t=500, bbox_b=490, bbox_l=119, text="C"),
        ]

        doc_dict = _make_doc_dict_with_tables_and_texts([t1, t2], texts)
        result, count = recover_type2_split_tables(doc_dict, validate=False)
        assert count == 0

    def test_texts_removed_after_recovery(self):
        """Consumed texts should be removed from doc_dict."""
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=2)
        t2 = _make_table_dict(1, page_no=2, bbox_t=400, bbox_b=200, num_rows=2)

        texts = [
            _make_text_dict(0, page_no=2, bbox_t=600, bbox_b=590, bbox_l=119, text="Field"),
            _make_text_dict(1, page_no=2, bbox_t=598, bbox_b=588, bbox_l=245, text="Value"),
        ]

        doc_dict = _make_doc_dict_with_tables_and_texts([t1, t2], texts)
        result, count = recover_type2_split_tables(doc_dict, validate=False)

        assert count == 1
        assert len(result["texts"]) == 0

    def test_body_refs_updated_after_recovery(self):
        """Body children should not reference removed texts."""
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=2)
        t2 = _make_table_dict(1, page_no=2, bbox_t=400, bbox_b=200, num_rows=2)

        texts = [
            _make_text_dict(0, page_no=2, bbox_t=600, bbox_b=590, bbox_l=119, text="F"),
            _make_text_dict(1, page_no=2, bbox_t=598, bbox_b=588, bbox_l=245, text="V"),
        ]

        doc_dict = _make_doc_dict_with_tables_and_texts([t1, t2], texts)
        result, count = recover_type2_split_tables(doc_dict, validate=False)

        body_refs = [c["$ref"] for c in result["body"]["children"]]
        # Should only have table refs, no text refs
        assert all(r.startswith("#/tables/") for r in body_refs)

    def test_page_header_footer_skipped(self):
        """page_header/page_footer should not be collected."""
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=2)
        t2 = _make_table_dict(1, page_no=2, bbox_t=400, bbox_b=200, num_rows=2)

        texts = [
            _make_text_dict(
                0,
                page_no=2,
                bbox_t=750,
                bbox_b=740,
                bbox_l=400,
                label="page_header",
                text="VM0042",
            ),
            _make_text_dict(
                1,
                page_no=2,
                bbox_t=60,
                bbox_b=50,
                bbox_l=500,
                label="page_footer",
                text="115",
            ),
        ]

        doc_dict = _make_doc_dict_with_tables_and_texts([t1, t2], texts)
        result, count = recover_type2_split_tables(doc_dict, validate=False)
        assert count == 0

    def test_structural_parent_text_not_consumed(self):
        """Texts with children (structural nodes) must not be consumed.

        Reproduces a real bug: hierarchy postprocessor attaches tables as
        children of a misclassified section_header (e.g. "Calculation method").
        Type 2 recovery must skip it — otherwise all child tables become orphaned.
        """
        # Table ending near page bottom
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=3)
        # Table on next page, NOT near top (triggers Type 2 scan)
        t2 = _make_table_dict(1, page_no=2, bbox_t=400, bbox_b=200, num_rows=2)

        # Gap text with two-column layout — normally would be consumed
        left_text = _make_text_dict(
            0, page_no=2, bbox_t=750, bbox_b=740, bbox_l=119, text="Calc method"
        )
        right_text = _make_text_dict(
            1, page_no=2, bbox_t=748, bbox_b=738, bbox_l=245, text="Not applicable"
        )

        # Make left_text a structural parent by giving it table children
        left_text["children"] = [{"$ref": "#/tables/1"}]

        doc_dict = _make_doc_dict_with_tables_and_texts([t1, t2], [left_text, right_text])
        result, count = recover_type2_split_tables(doc_dict, validate=False)

        # Should NOT recover because one gap text is a structural parent
        # (only 1 non-structural text remains, below min_gap_elements=2)
        assert count == 0
        # The structural text must still exist
        assert any(t.get("text") == "Calc method" for t in result.get("texts", []))

    def test_type1_case_not_handled_by_type2(self):
        """If next table starts near top (Type 1 case), Type 2 should skip it."""
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=3)
        t2 = _make_table_dict(1, page_no=2, bbox_t=720, bbox_b=200, num_rows=2)

        # Even with gap texts, Type 2 should skip because next table is near top
        texts = [
            _make_text_dict(0, page_no=2, bbox_t=750, bbox_b=740, bbox_l=119, text="X"),
            _make_text_dict(1, page_no=2, bbox_t=748, bbox_b=738, bbox_l=245, text="Y"),
        ]

        doc_dict = _make_doc_dict_with_tables_and_texts([t1, t2], texts)
        result, count = recover_type2_split_tables(doc_dict, validate=False)
        assert count == 0

    def test_gap_spanning_full_page(self):
        """Gap spans a full page (table on page 1, next on page 3)."""
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=2)
        t2 = _make_table_dict(1, page_no=3, bbox_t=720, bbox_b=200, num_rows=2)

        # Gap texts on page 2
        texts = [
            _make_text_dict(0, page_no=2, bbox_t=600, bbox_b=590, bbox_l=119, text="QA/QC"),
            _make_text_dict(1, page_no=2, bbox_t=598, bbox_b=588, bbox_l=245, text="See docs"),
            _make_text_dict(2, page_no=2, bbox_t=500, bbox_b=490, bbox_l=119, text="Comments"),
            _make_text_dict(3, page_no=2, bbox_t=498, bbox_b=488, bbox_l=245, text="None"),
        ]

        doc_dict = _make_doc_dict_with_tables_and_texts([t1, t2], texts)
        result, count = recover_type2_split_tables(doc_dict, validate=False)

        assert count == 1
        assert result["tables"][0]["data"]["num_rows"] == 4  # 2 original + 2 recovered

    def test_combined_type1_then_type2(self):
        """Type 1 and Type 2 can coexist in the same document."""
        # Type 1 pair: page 1->2 (both tables, near top)
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=2)
        t2 = _make_table_dict(1, page_no=2, bbox_t=720, bbox_b=80, num_rows=1)
        # Type 2: t2 also near bottom, next table (t3) not near top
        t3 = _make_table_dict(2, page_no=3, bbox_t=400, bbox_b=200, num_rows=2)

        texts = [
            _make_text_dict(0, page_no=3, bbox_t=600, bbox_b=590, bbox_l=119, text="Field"),
            _make_text_dict(1, page_no=3, bbox_t=598, bbox_b=588, bbox_l=245, text="Value"),
        ]

        doc_dict = _make_doc_dict_with_tables_and_texts([t1, t2, t3], texts)

        # Run Type 1 first
        doc_dict, type1_count = detect_and_merge_split_tables(doc_dict, validate=False)
        assert type1_count == 1
        assert len(doc_dict["tables"]) == 2  # t1+t2 merged, t3 remains

        # Run Type 2 on result
        doc_dict, type2_count = recover_type2_split_tables(doc_dict, validate=False)
        assert type2_count == 1
        # The merged table (t1+t2) had 3 rows, now +1 from Type 2 = 4
        assert doc_dict["tables"][0]["data"]["num_rows"] == 4

    def test_single_column_table_not_corrupted(self):
        """Single-column ending table should NOT be modified by Type 2 recovery.

        Prevents corruption of legitimate single-column tables when gap texts
        form a 2-column layout that may be unrelated to the table.
        """
        # Single-column table near page bottom
        t1 = _make_table_dict(0, page_no=1, bbox_t=300, bbox_b=80, num_rows=3, num_cols=1)
        t2 = _make_table_dict(1, page_no=2, bbox_t=400, bbox_b=200, num_rows=2, num_cols=2)

        # Gap texts with 2-column layout on page 2
        texts = [
            _make_text_dict(0, page_no=2, bbox_t=600, bbox_b=590, bbox_l=119, text="Field"),
            _make_text_dict(1, page_no=2, bbox_t=598, bbox_b=588, bbox_l=245, text="Value"),
        ]

        doc_dict = _make_doc_dict_with_tables_and_texts([t1, t2], texts)
        result, count = recover_type2_split_tables(doc_dict, validate=False)

        # Recovery should be skipped (single-column table protection)
        assert count == 0
        # Table #0 should remain unchanged
        assert result["tables"][0]["data"]["num_rows"] == 3
        assert result["tables"][0]["data"]["num_cols"] == 1
        # Gap texts should NOT be consumed (remain in doc)
        assert len(result["texts"]) == 2
