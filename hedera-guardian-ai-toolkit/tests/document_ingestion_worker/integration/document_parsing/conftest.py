"""
Shared pytest fixtures for integration tests.

This module provides common fixtures for integration tests that require
real models, test data, and external resources.
"""

import os
import sys
from pathlib import Path

import pytest
from docling.datamodel.accelerator_options import AcceleratorOptions
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions,
    TesseractCliOcrOptions,
)

from document_ingestion_worker.document_parsing.pdf_to_docling_parser import PdfParser

# Path to the prepared PDF fixture
FIXTURES_DIR = Path(__file__).parent.parent.parent.parent / "fixtures" / "pdfs"
DEFAULT_TEST_PDF = FIXTURES_DIR / "VM0042v2.1_ImprovedALM_corrected_21Jan2025-001-0201213.pdf"
DEFAULT_TEST_PDF_WITH_TOC = FIXTURES_DIR / "VM0042v2.1_ImprovedALM_corrected_21Jan2025.pdf"


def get_test_pdf_path(with_toc: bool = False) -> Path | None:
    """
    Get test PDF path from environment variable or use default fixture.

    Args:
        with_toc: If True, return PDF with table of contents; otherwise return basic PDF

    Returns:
        Path to test PDF if available, None otherwise
    """
    # First check environment variable for custom PDF
    pdf_path_str = os.environ.get("TEST_PDF_PATH")
    if pdf_path_str:
        pdf_path = Path(pdf_path_str)
        if pdf_path.exists():
            return pdf_path

    # Fall back to default fixture based on with_toc flag
    default_pdf = DEFAULT_TEST_PDF_WITH_TOC if with_toc else DEFAULT_TEST_PDF
    if default_pdf.exists():
        return default_pdf

    return None


@pytest.fixture(scope="session", autouse=True)
def setup_tesseract_env():
    """
    Set up Tesseract environment variables for all integration tests.

    This fixture runs once per test session and configures the environment
    so Tesseract can be found by Docling for OCR operations.

    Note: Adjust paths based on your Tesseract installation location.
    """
    if sys.platform == "win32":
        # Only set if not already configured
        if "TESSDATA_PREFIX" not in os.environ:
            os.environ["TESSDATA_PREFIX"] = r"C:\Program Files\Tesseract-OCR\tessdata"

        # Add Tesseract to PATH if not already present
        tesseract_path = r"C:\Program Files\Tesseract-OCR"
        if tesseract_path not in os.environ.get("PATH", ""):
            os.environ["PATH"] = os.environ.get("PATH", "") + f";{tesseract_path}"


@pytest.fixture(scope="session")
def real_pdf_path():
    """
    Provide path to real PDF file for integration testing.

    Uses prepared PDF fixture from tests/fixtures/pdfs/ directory.
    Can be overridden with TEST_PDF_PATH environment variable.

    Returns:
        Path to real PDF document
    """
    pdf_path = get_test_pdf_path(with_toc=False)

    if pdf_path is None:
        pytest.skip(
            f"PDF fixture not found at {DEFAULT_TEST_PDF}. "
            "Ensure tests/fixtures/pdfs/ contains a test PDF file."
        )

    return pdf_path


@pytest.fixture(scope="session")
def real_pdf_with_toc_path():
    """
    Provide path to real PDF file with TOC for integration testing.

    Uses prepared PDF fixture from tests/fixtures/pdfs/ directory.
    Can be overridden with TEST_PDF_PATH environment variable.

    Returns:
        Path to real PDF document with table of contents
    """
    pdf_path = get_test_pdf_path(with_toc=True)

    if pdf_path is None:
        pytest.skip(
            f"PDF fixture not found at {DEFAULT_TEST_PDF_WITH_TOC}. "
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

    Useful for tests that need real parsing but don't require full features.

    Returns:
        PdfParser configured for minimal processing
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


@pytest.fixture(scope="session")
def default_parser():
    """
    Create PdfParser with default config for comprehensive testing.

    This configuration enables:
    - Full-page OCR via Tesseract
    - Table structure extraction with cell matching
    - Formula enrichment

    Returns:
        PdfParser configured with default settings
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


@pytest.fixture(scope="session")
def sample_docling_document(ultra_fast_parser, real_pdf_path):
    """
    Provide a real DoclingDocument parsed from test PDF.

    This fixture is session-scoped to avoid re-parsing the same PDF
    for every test, significantly improving test performance.

    PDF resolution order:
        1. TEST_PDF_PATH environment variable (if set and exists)
        2. Default fixture in tests/fixtures/pdfs/

    Returns:
        DoclingDocument instance parsed from test PDF
    """
    return ultra_fast_parser.convert_pdf(real_pdf_path)
