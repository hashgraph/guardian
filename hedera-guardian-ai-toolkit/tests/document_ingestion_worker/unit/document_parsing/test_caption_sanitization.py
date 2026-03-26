"""
Test for defensive caption reference sanitization in docling_chunker.

This test ensures that _sanitize_caption_references() correctly identifies
and removes invalid caption references that can occur in DoclingDocuments
from docling's PDF parser.

Prevents IndexError during serialization when caption references point to
non-existent indices (e.g., after table removal or due to parser bugs).
"""

from unittest.mock import Mock

from document_ingestion_worker.document_parsing.docling_chunker import (
    _sanitize_caption_references,
)


class TestCaptionReferenceSanitization:
    """Test that _sanitize_caption_references correctly removes invalid caption references."""

    def test_removes_invalid_text_reference(self):
        """Test that invalid text references are removed."""
        # Create mock document with 3 texts
        doc = Mock()
        doc.texts = [Mock(), Mock(), Mock()]  # indices 0, 1, 2 valid
        doc.tables = []
        doc.pictures = []
        doc.key_value_items = []

        # Create table with invalid caption (points to texts[5] which doesn't exist)
        table = Mock()
        cap_item = Mock()
        cap_item.cref = "#/texts/5"
        table.captions = [cap_item]
        doc.tables = [table]

        # Sanitize
        _sanitize_caption_references(doc)

        # Caption should be removed
        assert len(table.captions) == 0

    def test_keeps_valid_text_reference(self):
        """Test that valid text references are preserved."""
        # Create mock document with 3 texts
        doc = Mock()
        doc.texts = [Mock(), Mock(), Mock()]
        doc.tables = []
        doc.pictures = []
        doc.key_value_items = []

        # Create table with valid caption (points to texts[1])
        table = Mock()
        cap_item = Mock()
        cap_item.cref = "#/texts/1"
        table.captions = [cap_item]
        doc.tables = [table]

        # Sanitize
        _sanitize_caption_references(doc)

        # Caption should be preserved
        assert len(table.captions) == 1
        assert table.captions[0].cref == "#/texts/1"

    def test_removes_invalid_table_reference(self):
        """Test that invalid table references are removed."""
        # Create mock document with 2 tables
        doc = Mock()
        doc.texts = []
        doc.pictures = []
        doc.key_value_items = []

        # Create first table with invalid caption (points to tables[3])
        table1 = Mock()
        cap_item = Mock()
        cap_item.cref = "#/tables/3"  # Invalid (only tables[0] and tables[1] exist)
        table1.captions = [cap_item]

        # Create second table without captions
        table2 = Mock()
        table2.captions = []

        doc.tables = [table1, table2]

        # Sanitize
        _sanitize_caption_references(doc)

        # Invalid caption should be removed
        assert len(table1.captions) == 0

    def test_mixed_valid_and_invalid_captions(self):
        """Test that only invalid captions are removed."""
        # Create mock document
        doc = Mock()
        doc.texts = [Mock(), Mock(), Mock()]  # indices 0, 1, 2
        doc.tables = []
        doc.pictures = []
        doc.key_value_items = []

        # Create table with mixed captions
        table = Mock()
        cap_valid1 = Mock()
        cap_valid1.cref = "#/texts/0"  # Valid
        cap_invalid = Mock()
        cap_invalid.cref = "#/texts/10"  # Invalid
        cap_valid2 = Mock()
        cap_valid2.cref = "#/texts/2"  # Valid
        table.captions = [cap_valid1, cap_invalid, cap_valid2]

        doc.tables = [table]

        # Sanitize
        _sanitize_caption_references(doc)

        # Only invalid caption should be removed
        assert len(table.captions) == 2
        assert table.captions[0].cref == "#/texts/0"
        assert table.captions[1].cref == "#/texts/2"

    def test_handles_document_without_tables(self):
        """Test that documents without tables don't cause errors."""
        doc = Mock()
        doc.texts = [Mock()]
        doc.tables = []
        doc.pictures = []
        doc.key_value_items = []

        # Should not raise any errors
        _sanitize_caption_references(doc)

    def test_handles_table_without_captions(self):
        """Test that tables without captions don't cause errors."""
        doc = Mock()
        doc.texts = []
        doc.pictures = []
        doc.key_value_items = []

        table = Mock()
        table.captions = []
        doc.tables = [table]

        # Should not raise any errors
        _sanitize_caption_references(doc)

    def test_handles_caption_without_cref(self):
        """Test that captions without cref field don't cause errors."""
        doc = Mock()
        doc.texts = [Mock()]
        doc.tables = []
        doc.pictures = []
        doc.key_value_items = []

        table = Mock()
        cap_no_cref = Mock(spec=[])  # No cref attribute
        table.captions = [cap_no_cref]
        doc.tables = [table]

        # Should not raise any errors
        _sanitize_caption_references(doc)

        # Caption without cref is preserved
        assert len(table.captions) == 1

    def test_handles_multiple_tables(self):
        """Test that sanitization works across multiple tables."""
        doc = Mock()
        doc.texts = [Mock(), Mock()]  # indices 0, 1
        doc.pictures = []
        doc.key_value_items = []

        # Table 1 with valid caption
        table1 = Mock()
        cap1 = Mock()
        cap1.cref = "#/texts/0"
        table1.captions = [cap1]

        # Table 2 with invalid caption
        table2 = Mock()
        cap2 = Mock()
        cap2.cref = "#/texts/5"  # Invalid
        table2.captions = [cap2]

        # Table 3 with mixed captions
        table3 = Mock()
        cap3a = Mock()
        cap3a.cref = "#/texts/1"  # Valid
        cap3b = Mock()
        cap3b.cref = "#/texts/10"  # Invalid
        table3.captions = [cap3a, cap3b]

        doc.tables = [table1, table2, table3]

        # Sanitize
        _sanitize_caption_references(doc)

        # Check results
        assert len(table1.captions) == 1  # Valid caption preserved
        assert len(table2.captions) == 0  # Invalid caption removed
        assert len(table3.captions) == 1  # Only valid caption preserved
        assert table3.captions[0].cref == "#/texts/1"

    def test_handles_picture_references(self):
        """Test that picture references are validated."""
        doc = Mock()
        doc.texts = []
        doc.tables = []
        doc.pictures = [Mock(), Mock()]  # indices 0, 1
        doc.key_value_items = []

        table = Mock()
        cap_valid = Mock()
        cap_valid.cref = "#/pictures/1"  # Valid
        cap_invalid = Mock()
        cap_invalid.cref = "#/pictures/5"  # Invalid
        table.captions = [cap_valid, cap_invalid]

        doc.tables = [table]

        # Sanitize
        _sanitize_caption_references(doc)

        # Only valid picture reference preserved
        assert len(table.captions) == 1
        assert table.captions[0].cref == "#/pictures/1"

    def test_malformed_reference_format(self):
        """Test that malformed references don't cause crashes."""
        doc = Mock()
        doc.texts = [Mock()]
        doc.tables = []
        doc.pictures = []
        doc.key_value_items = []

        table = Mock()
        cap1 = Mock()
        cap1.cref = "not_a_ref"  # Malformed (doesn't start with #/)
        cap2 = Mock()
        cap2.cref = "#/texts/0"  # Valid
        cap3 = Mock()
        cap3.cref = "#/"  # Malformed (no collection)
        table.captions = [cap1, cap2, cap3]

        doc.tables = [table]

        # Should not crash - malformed refs are kept (not validated)
        _sanitize_caption_references(doc)

        # Only well-formed references are validated
        assert len(table.captions) == 3
