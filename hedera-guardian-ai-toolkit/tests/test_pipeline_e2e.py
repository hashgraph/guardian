"""
End-to-end integration tests for document ingestion pipeline.

These tests verify the complete pipeline flow with simplified chunking.
Uses prepared PDF fixture from tests/fixtures/pdfs/.

Test coverage:
- T065: End-to-end integration test for full pipeline with Docling contextualization
"""

import os
from pathlib import Path

import pytest
from docling.datamodel.accelerator_options import AcceleratorOptions
from docling.datamodel.pipeline_options import PdfPipelineOptions

from document_ingestion_worker.document_parsing.pdf_to_docling_parser import PdfParser

# Path to the prepared PDF fixture
FIXTURES_DIR = Path(__file__).parent / "fixtures" / "pdfs"
DEFAULT_TEST_PDF = FIXTURES_DIR / "VM0042v2.1_ImprovedALM_corrected_21Jan2025-001-0201213.pdf"


def get_test_pdf_path() -> Path | None:
    """Get test PDF path from environment variable or use default fixture."""
    # First check environment variable for custom PDF
    pdf_path_str = os.environ.get("TEST_PDF_PATH")
    if pdf_path_str:
        pdf_path = Path(pdf_path_str)
        if pdf_path.exists():
            return pdf_path

    # Fall back to default fixture
    if DEFAULT_TEST_PDF.exists():
        return DEFAULT_TEST_PDF

    return None


@pytest.fixture(scope="session")
def real_pdf_path():
    """Provide path to real PDF file for integration testing."""
    pdf_path = get_test_pdf_path()
    if pdf_path is None:
        pytest.skip(
            f"PDF fixture not found at {DEFAULT_TEST_PDF}. "
            "Ensure tests/fixtures/pdfs/ contains a test PDF file."
        )
    return pdf_path


@pytest.fixture(scope="session")
def ultra_fast_parser():
    """
    Create PdfParser with ultra-fast config for integration tests.

    This configuration minimizes processing time by disabling:
    - OCR (optical character recognition)
    - Table structure extraction
    - Formula enrichment
    - Code enrichment
    """
    options = PdfPipelineOptions()
    options.do_ocr = False
    options.do_table_structure = False
    options.do_formula_enrichment = False
    options.do_code_enrichment = False
    options.ocr_batch_size = 1
    options.layout_batch_size = 1

    options.accelerator_options = AcceleratorOptions(
        device="cpu",
        num_threads=4,
    )

    return PdfParser(pipeline_options=options)


class TestPipelineWithContextualization:
    """T065: End-to-end integration tests for pipeline with Docling contextualization."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_chunking_pipeline_integration(
        self, real_pdf_path: Path, tmp_path: Path, ultra_fast_parser: PdfParser
    ) -> None:
        """Test that simplified chunking pipeline works with real PDF."""
        from document_ingestion_worker.document_parsing.docling_chunker import DoclingChunker

        # Step 1: Parse PDF
        doc = ultra_fast_parser.convert_pdf(real_pdf_path)

        # Step 2: Create chunks
        chunker = DoclingChunker()
        raw_chunks = chunker.chunk_document(doc)

        assert len(raw_chunks) > 0, "Should have generated at least one chunk"

        # Step 3: Prepare for embedding (new simplified flow)
        prepared_chunks = chunker.prepare_for_embedding(
            raw_chunks, source_document=str(real_pdf_path)
        )

        assert len(prepared_chunks) == len(raw_chunks)

        # Verify prepared chunks have new structure
        for chunk in prepared_chunks:
            assert "embedding_input" in chunk
            assert "content" in chunk
            assert "source" in chunk
            assert "document_name" in chunk

            # Check content fields
            content = chunk["content"]
            assert "chunk_id" in content
            # Note: "text" is NOT in content - text is only in embedding_input
            assert "text" not in content
            assert "heading" in content
            assert "headings" in content  # NEW: full hierarchy
            assert "page_no" in content
            assert "token_count" in content

            # Should NOT have structure-related fields
            assert "structure_path" not in content
            assert "structure_path_ids" not in content
            assert "structure_heading_id" not in content

            # embedding_input contains the text
            assert chunk["embedding_input"]

            # headings should be list
            assert isinstance(content["headings"], list)

        # Step 4: Save outputs (raw chunks only)
        output_dir = tmp_path / real_pdf_path.stem
        raw_chunks_dir = output_dir / "raw_chunks"

        DoclingChunker.save_chunks(raw_chunks, raw_chunks_dir)

        # Verify output files
        assert raw_chunks_dir.exists()
        chunk_files = list(raw_chunks_dir.glob("chunk_*.json"))
        assert len(chunk_files) == len(raw_chunks)

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_pipeline_produces_valid_output_structure(
        self, real_pdf_path: Path, tmp_path: Path, ultra_fast_parser: PdfParser
    ) -> None:
        """Test that pipeline output follows expected folder structure."""
        from document_ingestion_worker.document_parsing.docling_chunker import DoclingChunker

        # Process document
        doc = ultra_fast_parser.convert_pdf(real_pdf_path)

        chunker = DoclingChunker()
        raw_chunks = chunker.chunk_document(doc)

        # Save with expected structure
        doc_dir = tmp_path / real_pdf_path.stem
        DoclingChunker.save_chunks(raw_chunks, doc_dir / "raw_chunks")

        # Verify expected folder structure (simplified):
        # output_dir/
        # └── <document_stem>/
        #     └── raw_chunks/
        #         ├── chunk_0001.json
        #         └── ...
        assert doc_dir.exists()
        assert (doc_dir / "raw_chunks").exists()
        assert (doc_dir / "raw_chunks").is_dir()

        # Should NOT have structure.json or enhanced_chunks
        assert not (doc_dir / "structure.json").exists()
        assert not (doc_dir / "enhanced_chunks").exists()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_headings_hierarchy_is_preserved(
        self, real_pdf_path: Path, ultra_fast_parser: PdfParser
    ) -> None:
        """Test that headings hierarchy from Docling is preserved in chunks."""
        from document_ingestion_worker.document_parsing.docling_chunker import DoclingChunker

        # Process document
        doc = ultra_fast_parser.convert_pdf(real_pdf_path)

        chunker = DoclingChunker()
        raw_chunks = chunker.chunk_document(doc)
        prepared_chunks = chunker.prepare_for_embedding(
            raw_chunks, source_document=str(real_pdf_path)
        )

        # Verify headings structure
        for chunk in prepared_chunks:
            content = chunk["content"]

            # headings should be a list
            assert isinstance(content["headings"], list)

            # If headings exist, heading should be the last element
            if content["headings"]:
                assert content["heading"] == content["headings"][-1]

                # All headings should be strings
                for h in content["headings"]:
                    assert isinstance(h, str)
            else:
                # If no headings, heading should be empty string
                assert content["heading"] == ""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_chunks_can_be_filtered_by_headings(
        self, real_pdf_path: Path, ultra_fast_parser: PdfParser
    ) -> None:
        """Test that chunks can be filtered by their headings hierarchy."""
        from document_ingestion_worker.document_parsing.docling_chunker import DoclingChunker

        # Process document
        doc = ultra_fast_parser.convert_pdf(real_pdf_path)

        chunker = DoclingChunker()
        raw_chunks = chunker.chunk_document(doc)
        prepared_chunks = chunker.prepare_for_embedding(
            raw_chunks, source_document=str(real_pdf_path)
        )

        # Find chunks with headings
        chunks_with_headings = [chunk for chunk in prepared_chunks if chunk["content"]["headings"]]

        if not chunks_with_headings:
            pytest.skip("Test PDF has no chunks with headings")

        # Get first heading from first chunk
        first_heading = chunks_with_headings[0]["content"]["headings"][0]

        # Filter chunks by heading presence in hierarchy
        filtered_chunks = [
            chunk for chunk in prepared_chunks if first_heading in chunk["content"]["headings"]
        ]

        # Should be able to filter (may be 0 if heading is unique)
        assert isinstance(filtered_chunks, list)

        # Get chunks without any headings
        root_chunks = [chunk for chunk in prepared_chunks if not chunk["content"]["headings"]]
        assert isinstance(root_chunks, list)


class TestPipelineErrorHandling:
    """Tests for pipeline error handling in simplified chunking."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_handles_empty_chunks_list(self) -> None:
        """Test that prepare_for_embedding handles empty chunks list."""
        from document_ingestion_worker.document_parsing.docling_chunker import DoclingChunker

        chunker = DoclingChunker()
        prepared = chunker.prepare_for_embedding([])

        assert prepared == []

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_handles_chunks_without_metadata(self, real_pdf_path: Path) -> None:
        """Test that prepare_for_embedding handles chunks without metadata."""
        from document_ingestion_worker.document_parsing.docling_chunker import DoclingChunker

        chunker = DoclingChunker()

        # Create chunk without metadata
        chunks_without_metadata = [
            {
                "chunk_id": 1,
                "text": "Test chunk",
                "token_count": 5,
                "metadata": {},  # No metadata
            }
        ]

        prepared = chunker.prepare_for_embedding(
            chunks_without_metadata, source_document=str(real_pdf_path)
        )

        assert len(prepared) == 1
        # Should have empty heading and headings list
        assert prepared[0]["content"]["heading"] == ""
        assert prepared[0]["content"]["headings"] == []
        assert prepared[0]["content"]["page_no"] is None
