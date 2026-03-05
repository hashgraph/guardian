"""
Integration tests for pdf_parser.py - PdfParser class.

These tests verify our PdfParser integration with Docling using real PDF documents
and representative configurations from the benchmark suite.

Focus: Test our wrapper code, not Docling's internals.
Mark with @pytest.mark.integration to separate from unit tests.

## Test Data Setup

Set the TEST_PDF_PATH environment variable to specify a test PDF:

    export TEST_PDF_PATH=/path/to/your/test.pdf

Or on Windows:

    set TEST_PDF_PATH=C:\\path\to\\your\test.pdf

Tests will skip automatically if no test PDF is provided.
"""

import pytest
from docling.datamodel.accelerator_options import AcceleratorOptions
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions,
    TesseractCliOcrOptions,
)

from document_ingestion_worker.document_parsing.pdf_to_docling_parser import PdfParser


def create_ultra_fast_parser() -> PdfParser:
    """
    Create parser with ultra-fast config (minimal processing, no OCR/tables).
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


def create_default_parser() -> PdfParser:
    """
    Create parser with default config (full-page OCR, tables, formulas).
    """
    options = PdfPipelineOptions()
    options.do_ocr = True
    options.do_table_structure = True
    options.table_structure_options.do_cell_matching = True
    options.do_formula_enrichment = True

    options.ocr_options = TesseractCliOcrOptions(
        force_full_page_ocr=True,
        lang=["eng"],
    )

    return PdfParser(pipeline_options=options)


def create_balanced_formulas_parser() -> PdfParser:
    """
    Create parser with balanced config (accurate tables + formula enrichment).
    """
    options = PdfPipelineOptions()
    options.do_ocr = True
    options.do_table_structure = True
    options.do_formula_enrichment = True
    options.table_structure_options.mode = "accurate"
    options.ocr_batch_size = 4
    options.layout_batch_size = 4
    options.table_batch_size = 4

    options.ocr_options = TesseractCliOcrOptions(
        force_full_page_ocr=False,
        lang=["eng"],
    )

    options.accelerator_options = AcceleratorOptions(
        device="cuda",
        num_threads=4,
    )

    return PdfParser(pipeline_options=options)


@pytest.mark.integration
@pytest.mark.slow
class TestPdfParserIntegrationRealPdf:
    """Integration tests using real PDF with various configurations."""

    def test_ultra_fast_config(self, real_pdf_path):
        """Test parsing with ultra-fast config (no OCR/tables)."""
        parser = create_ultra_fast_parser()
        doc = parser.convert_pdf(real_pdf_path)

        # Verify document was parsed
        assert doc is not None

        # Verify export works
        doc_dict = doc.export_to_dict()
        assert doc_dict is not None
        assert isinstance(doc_dict, dict)

    def test_default_config(self, real_pdf_path):
        """Test parsing with default config (full-page OCR, tables, formulas)."""
        parser = create_default_parser()
        doc = parser.convert_pdf(real_pdf_path)

        # Verify document was parsed
        assert doc is not None

        # Verify export works
        doc_dict = doc.export_to_dict()
        assert doc_dict is not None
        assert isinstance(doc_dict, dict)

        # Verify markdown export works
        markdown = doc.export_to_markdown()
        assert markdown is not None
        assert len(markdown) > 0

    def test_balanced_formulas_config(self, real_pdf_path):
        """Test parsing with balanced config (accurate tables + formulas)."""
        parser = create_balanced_formulas_parser()
        doc = parser.convert_pdf(real_pdf_path)

        # Verify document was parsed
        assert doc is not None

        # Verify export works
        doc_dict = doc.export_to_dict()
        assert doc_dict is not None
        assert isinstance(doc_dict, dict)

    def test_convert_and_save_round_trip(self, real_pdf_path, tmp_path):
        """Test converting PDF, saving to JSON, and loading back."""
        json_path = tmp_path / "output.json"
        parser = create_ultra_fast_parser()  # Use fast config for speed

        # Convert and save
        result = parser.convert_and_save(real_pdf_path, json_path)

        # Verify save succeeded
        assert result["success"] is True
        assert json_path.exists()

        # Verify we can load it back
        loaded_doc = PdfParser.load_docling_document(json_path)
        assert loaded_doc is not None

        # Verify loaded document is usable
        reloaded_dict = loaded_doc.export_to_dict()
        assert reloaded_dict is not None
        assert isinstance(reloaded_dict, dict)

    def test_output_directory_creation(self, real_pdf_path, tmp_path):
        """Test that nested output directories are created automatically."""
        # Create deeply nested path
        output_path = tmp_path / "a" / "b" / "c" / "output.json"

        parser = create_ultra_fast_parser()
        result = parser.convert_and_save(real_pdf_path, output_path)

        # Verify directories were created and file was saved
        assert output_path.exists()
        assert result["success"] is True


@pytest.mark.integration
class TestPdfParserIntegrationErrorHandling:
    """Integration tests for error handling with real operations."""

    def test_convert_nonexistent_pdf_raises_error(self):
        """Test that converting non-existent PDF raises FileNotFoundError."""
        parser = create_ultra_fast_parser()

        with pytest.raises(FileNotFoundError, match="PDF file not found"):
            parser.convert_pdf("/nonexistent/path/to/file.pdf")

    def test_load_nonexistent_json_raises_error(self):
        """Test that loading non-existent JSON raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError, match="JSON file not found"):
            PdfParser.load_docling_document("/nonexistent/path/to/file.json")

    def test_convert_corrupted_pdf(self, tmp_path):
        """Test handling of corrupted PDF file."""
        pdf_path = tmp_path / "corrupted.pdf"

        # Create invalid PDF content
        pdf_path.write_text("This is not a valid PDF file")

        parser = create_ultra_fast_parser()

        # Should raise an error (exact error depends on Docling)
        # Using broad Exception since Docling may raise various exceptions for corrupted PDFs
        with pytest.raises(Exception):  # noqa: B017
            parser.convert_pdf(pdf_path)
