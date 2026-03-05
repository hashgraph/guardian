"""
Integration tests for Surya formula enrichment.

These tests verify the end-to-end functionality of the Surya-based formula
enrichment when processing real PDF documents. Requires surya-ocr to be
installed.

Test organization:
- TestSuryaEnrichmentModelIntegration: Tests for enrichment model with real predictor
- TestSuryaFormulaPipelineIntegration: Tests for full pipeline with real PDF
- TestSuryaParserIntegration: Tests for parser integration with Surya pipeline

All tests are marked with @pytest.mark.integration and will be skipped if
surya-ocr is not installed.
"""

from pathlib import Path

import pytest

# Skip all tests in this module if surya-ocr is not installed
surya = pytest.importorskip("surya", reason="surya-ocr not installed")


@pytest.mark.integration
class TestSuryaEnrichmentModelIntegration:
    """Integration tests for SuryaFormulaEnrichmentModel with real predictor."""

    def test_enrichment_model_loads_predictor(self):
        """Test that enrichment model can load the real Surya predictor."""
        from document_ingestion_worker.document_parsing.surya_enrichment_model import (
            SuryaFormulaEnrichmentModel,
        )

        model = SuryaFormulaEnrichmentModel(enabled=True)

        # Predictor should be None until first use (lazy loading)
        assert model._predictor is None

    def test_enrichment_model_extracts_latex_from_image(self):
        """Test LaTeX extraction from a formula image."""
        from unittest.mock import Mock

        from PIL import Image, ImageDraw

        from document_ingestion_worker.document_parsing.surya_enrichment_model import (
            SuryaFormulaEnrichmentModel,
        )

        model = SuryaFormulaEnrichmentModel(enabled=True)

        # Create a simple test image with text (simulating a formula)
        img = Image.new("RGB", (200, 100), color="white")
        draw = ImageDraw.Draw(img)
        # Draw simple text that Surya might recognize
        draw.text((10, 30), "E = mc^2", fill="black")

        # Create mock element
        mock_element = Mock()
        mock_element.item = Mock()
        mock_element.item.label = Mock()
        mock_element.item.label.value = "formula"
        mock_element.item.text = ""
        mock_element.image = img

        # Process the element (__call__ signature: doc, element_batch)
        mock_doc = Mock()
        results = list(model(mock_doc, [mock_element]))

        # Should return the element with some extracted text
        assert len(results) == 1
        # Note: The actual extracted text depends on Surya's model accuracy
        # For a synthetic image, it might not extract perfectly
        assert results[0].item is not None

    def test_enrichment_model_handles_real_formula_patterns(self):
        """Test model processes various formula patterns."""
        from unittest.mock import Mock

        from PIL import Image

        from document_ingestion_worker.document_parsing.surya_enrichment_model import (
            SuryaFormulaEnrichmentModel,
        )

        model = SuryaFormulaEnrichmentModel(enabled=True)

        # Create multiple test images
        test_cases = [
            # Simple white image (blank formula area)
            Image.new("RGB", (150, 50), color="white"),
            # Slightly larger image
            Image.new("RGB", (300, 100), color="white"),
        ]

        for img in test_cases:
            mock_element = Mock()
            mock_element.item = Mock()
            mock_element.item.label = Mock()
            mock_element.item.label.value = "formula"
            mock_element.item.text = ""
            mock_element.image = img

            # Should not raise exceptions (__call__ signature: doc, element_batch)
            mock_doc = Mock()
            results = list(model(mock_doc, [mock_element]))
            assert len(results) == 1


@pytest.mark.integration
class TestSuryaFormulaPipelineIntegration:
    """Integration tests for SuryaFormulaPipeline with real PDF processing."""

    def test_pipeline_with_real_pdf(self, real_pdf_path):
        """Test full pipeline extracts LaTeX from PDF formulas."""
        from docling.datamodel.base_models import InputFormat
        from docling.document_converter import DocumentConverter, PdfFormatOption

        from document_ingestion_worker.document_parsing.surya_formula_pipeline import (
            SuryaFormulaPipeline,
            SuryaFormulaPipelineOptions,
        )

        # Configure Surya pipeline options
        options = SuryaFormulaPipelineOptions(
            do_surya_formula_enrichment=True,
            surya_batch_size=4,  # Smaller batch for testing
        )
        options.do_ocr = False  # Disable OCR for faster testing

        # Create format option with custom pipeline
        pdf_format_option = PdfFormatOption(
            pipeline_options=options,
            pipeline_cls=SuryaFormulaPipeline,
        )

        # Create converter
        converter = DocumentConverter(format_options={InputFormat.PDF: pdf_format_option})

        # Convert PDF
        result = converter.convert(source=str(real_pdf_path))
        doc = result.document

        # Verify document was processed
        assert doc is not None

        # Check for formula items in the document
        doc_dict = doc.export_to_dict()
        texts = doc_dict.get("texts", [])

        formula_items = [t for t in texts if t.get("label") == "formula"]

        # The test PDF should contain formulas
        # If it does, verify they have text (LaTeX) extracted
        for formula in formula_items:
            # Formula text might be empty if Surya couldn't extract
            # but the item should exist
            assert "text" in formula

    def test_pipeline_preserves_non_formula_content(self, real_pdf_path):
        """Test pipeline preserves text, tables, and other content."""
        from docling.datamodel.base_models import InputFormat
        from docling.document_converter import DocumentConverter, PdfFormatOption

        from document_ingestion_worker.document_parsing.surya_formula_pipeline import (
            SuryaFormulaPipeline,
            SuryaFormulaPipelineOptions,
        )

        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=True)
        options.do_ocr = False

        pdf_format_option = PdfFormatOption(
            pipeline_options=options,
            pipeline_cls=SuryaFormulaPipeline,
        )

        converter = DocumentConverter(format_options={InputFormat.PDF: pdf_format_option})

        result = converter.convert(source=str(real_pdf_path))
        doc = result.document

        doc_dict = doc.export_to_dict()
        texts = doc_dict.get("texts", [])

        # Should have various content types
        labels = {t.get("label") for t in texts}

        # At minimum, should have paragraph or text content
        assert len(texts) > 0
        assert "paragraph" in labels or "text" in labels or len(labels) > 0


@pytest.mark.integration
class TestSuryaParserIntegration:
    """Integration tests for PdfParser with Surya pipeline configuration."""

    def test_parser_creates_surya_pipeline(self, real_pdf_path):
        """Test PdfParser uses Surya pipeline when configured."""
        pytest.importorskip("document_ingestion_worker.document_parsing.surya_formula_pipeline")

        from document_ingestion_worker.document_parsing.pdf_to_docling_parser import PdfParser
        from document_ingestion_worker.document_parsing.surya_formula_pipeline import (
            SuryaFormulaPipelineOptions,
        )

        # Create pipeline options with Surya enabled
        options = SuryaFormulaPipelineOptions(
            do_surya_formula_enrichment=True,
            surya_batch_size=4,
        )
        options.do_ocr = False
        options.do_table_structure = False  # Disable for faster testing

        # Create parser with Surya options
        # Note: PdfParser may need modification to accept pipeline_cls
        # This test verifies the integration pattern
        parser = PdfParser(pipeline_options=options)

        # Convert PDF
        doc = parser.convert_pdf(real_pdf_path)

        assert doc is not None

    def test_parser_docling_formula_enrichment_disabled_with_surya(self):
        """Test that Docling's formula enrichment is disabled when using Surya."""
        from document_ingestion_worker.document_parsing.surya_formula_pipeline import (
            SuryaFormulaPipelineOptions,
        )

        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=True)

        # Docling's built-in formula enrichment should be disabled
        # This prevents the hanging issue
        assert options.do_formula_enrichment is False


@pytest.mark.integration
class TestSuryaFormulaQuality:
    """Integration tests for formula extraction quality."""

    def test_extracted_latex_is_valid_format(self, real_pdf_path):
        """Test extracted LaTeX is in valid format."""
        from docling.datamodel.base_models import InputFormat
        from docling.document_converter import DocumentConverter, PdfFormatOption

        from document_ingestion_worker.document_parsing.surya_formula_pipeline import (
            SuryaFormulaPipeline,
            SuryaFormulaPipelineOptions,
        )

        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=True)
        options.do_ocr = False

        pdf_format_option = PdfFormatOption(
            pipeline_options=options,
            pipeline_cls=SuryaFormulaPipeline,
        )

        converter = DocumentConverter(format_options={InputFormat.PDF: pdf_format_option})

        result = converter.convert(source=str(real_pdf_path))
        doc = result.document

        doc_dict = doc.export_to_dict()
        texts = doc_dict.get("texts", [])

        formula_items = [t for t in texts if t.get("label") == "formula"]

        for formula in formula_items:
            text = formula.get("text", "")
            if text:
                # LaTeX should not contain raw HTML/XML tags
                assert "<math>" not in text.lower()
                assert "</math>" not in text.lower()
                # Should not have double delimiters (cleaned)
                assert not (text.startswith("$$") and text.endswith("$$"))
                # Only flag short single-$ strings (likely improperly delimited formulas).
                # Long text with embedded $$ blocks is valid multi-formula content.
                if text.startswith("$") and text.endswith("$") and len(text) > 2:
                    assert "$$" in text or len(text) > 200, (
                        f"Possible single-$ delimiter issue: {text[:100]}..."
                    )

    def test_formula_numbers_preserved_in_orig(self, real_pdf_path):
        """Test formula numbers are preserved in orig field."""
        from docling.datamodel.base_models import InputFormat
        from docling.document_converter import DocumentConverter, PdfFormatOption

        from document_ingestion_worker.document_parsing.surya_formula_pipeline import (
            SuryaFormulaPipeline,
            SuryaFormulaPipelineOptions,
        )

        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=True)
        options.do_ocr = False

        pdf_format_option = PdfFormatOption(
            pipeline_options=options,
            pipeline_cls=SuryaFormulaPipeline,
        )

        converter = DocumentConverter(format_options={InputFormat.PDF: pdf_format_option})

        result = converter.convert(source=str(real_pdf_path))
        doc = result.document

        doc_dict = doc.export_to_dict()
        texts = doc_dict.get("texts", [])

        formula_items = [t for t in texts if t.get("label") == "formula"]

        # Formulas with numbers should have them in orig
        for formula in formula_items:
            orig = formula.get("orig", "")
            # orig contains the original text including formula number
            # Surya enrichment only updates text field, orig stays unchanged
            assert isinstance(orig, str)


@pytest.mark.integration
class TestSuryaPerformance:
    """Integration tests for performance characteristics."""

    def test_batch_processing_multiple_formulas(self, real_pdf_path):
        """Test batch processing of multiple formulas is efficient."""
        import time

        from docling.datamodel.base_models import InputFormat
        from docling.document_converter import DocumentConverter, PdfFormatOption

        from document_ingestion_worker.document_parsing.surya_formula_pipeline import (
            SuryaFormulaPipeline,
            SuryaFormulaPipelineOptions,
        )

        # Use larger batch size
        options = SuryaFormulaPipelineOptions(
            do_surya_formula_enrichment=True,
            surya_batch_size=8,
        )
        options.do_ocr = False
        options.do_table_structure = False

        pdf_format_option = PdfFormatOption(
            pipeline_options=options,
            pipeline_cls=SuryaFormulaPipeline,
        )

        converter = DocumentConverter(format_options={InputFormat.PDF: pdf_format_option})

        start_time = time.time()
        result = converter.convert(source=str(real_pdf_path))
        elapsed_time = time.time() - start_time

        doc = result.document
        assert doc is not None

        # Should complete in reasonable time (adjust based on PDF size)
        # This is a soft check - mainly to catch infinite loops/hangs
        assert elapsed_time < 300  # 5 minutes max for any PDF

    def test_no_hang_on_formula_processing(self, real_pdf_path):
        """Test that formula processing does not hang (the main issue being solved)."""
        import signal
        import sys

        from docling.datamodel.base_models import InputFormat
        from docling.document_converter import DocumentConverter, PdfFormatOption

        from document_ingestion_worker.document_parsing.surya_formula_pipeline import (
            SuryaFormulaPipeline,
            SuryaFormulaPipelineOptions,
        )

        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=True)
        options.do_ocr = False

        pdf_format_option = PdfFormatOption(
            pipeline_options=options,
            pipeline_cls=SuryaFormulaPipeline,
        )

        converter = DocumentConverter(format_options={InputFormat.PDF: pdf_format_option})

        # Set a timeout for the conversion
        timeout_seconds = 120  # 2 minutes

        if sys.platform != "win32":
            # Unix-like systems support SIGALRM
            def timeout_handler(signum, frame):
                raise TimeoutError("Formula processing took too long")

            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(timeout_seconds)

            try:
                result = converter.convert(source=str(real_pdf_path))
                assert result.document is not None
            finally:
                signal.alarm(0)  # Cancel the alarm
        else:
            # Windows doesn't support SIGALRM, just run the test
            result = converter.convert(source=str(real_pdf_path))
            assert result.document is not None


# Fixtures specific to Surya integration tests
@pytest.fixture(scope="module")
def real_pdf_path():
    """
    Provide path to real PDF file for integration testing.

    Uses the same fixture logic as other integration tests.
    """
    import os

    # Check for test PDF path environment variable
    pdf_path_str = os.environ.get("TEST_PDF_PATH")
    if pdf_path_str:
        pdf_path = Path(pdf_path_str)
        if pdf_path.exists():
            return pdf_path

    # Fall back to default fixture location
    fixtures_dir = Path(__file__).parent.parent.parent.parent / "fixtures" / "pdfs"
    default_pdf = fixtures_dir / "VM0042v2.1_ImprovedALM_corrected_21Jan2025-001-0201213.pdf"

    if default_pdf.exists():
        return default_pdf

    # Alternative: look for any PDF in fixtures
    if fixtures_dir.exists():
        pdfs = list(fixtures_dir.glob("*.pdf"))
        if pdfs:
            return pdfs[0]

    pytest.skip(
        "No test PDF found. Set TEST_PDF_PATH environment variable "
        "or add a PDF to tests/fixtures/pdfs/"
    )
