"""Shared fixtures for document ingestion tests."""

from pathlib import Path
from unittest.mock import Mock

import pytest
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from document_ingestion_worker.config import DocumentIngestionSettings


def create_test_pdf(output_path: Path, content: str, title: str = "Test Document"):
    """
    Create a simple PDF file for testing.

    Args:
        output_path: Path where PDF should be saved
        content: Text content for the PDF
        title: Title of the document
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(output_path), pagesize=letter)
    width, height = letter

    # Add title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, title)

    # Add content
    c.setFont("Helvetica", 12)
    y_position = height - 100
    lines = content.split("\n")

    for line in lines:
        if y_position < 50:  # Start a new page if needed
            c.showPage()
            c.setFont("Helvetica", 12)
            y_position = height - 50

        c.drawString(50, y_position, line)
        y_position -= 20

    c.save()


@pytest.fixture
def sample_data_dir(tmp_path):
    """Create a data directory structure for testing."""
    data_dir = tmp_path / "data"
    (data_dir / "input" / "documents").mkdir(parents=True)
    (data_dir / "staged" / "documents").mkdir(parents=True)
    (data_dir / "output" / "documents").mkdir(parents=True)
    return data_dir


@pytest.fixture
def sample_pdf_dir(tmp_path):
    """Create a temporary PDF directory for testing."""
    pdf_dir = tmp_path / "pdfs"
    pdf_dir.mkdir()
    return pdf_dir


@pytest.fixture
def sample_pdf_file(sample_pdf_dir):
    """Create a sample PDF file for testing."""
    pdf_path = sample_pdf_dir / "test_document.pdf"
    create_test_pdf(pdf_path, "Sample document content for testing", "Test Document")
    return pdf_path


@pytest.fixture
def sample_output_dir(tmp_path):
    """Create a temporary output directory for testing."""
    output_dir = tmp_path / "output"
    output_dir.mkdir()
    return output_dir


@pytest.fixture
def mock_config(sample_data_dir):
    """Create a mock configuration for testing."""
    config = Mock(spec=DocumentIngestionSettings)
    config.qdrant_url = "http://localhost:6333"
    config.qdrant_collection_name = "test_documents"
    config.qdrant_api_key = None
    config.embedding_model_name = "aapot/bge-m3-onnx"
    config.embedding_provider_type = "bge_m3_onnx"
    config.embedding_batch_size = 50
    config.vector_upsert_batch_size = 100
    config.data_dir = sample_data_dir
    config.input_documents_dir = sample_data_dir / "input" / "documents"
    config.staged_documents_dir = sample_data_dir / "staged" / "documents"
    config.max_parallel_files = 5
    config.log_level = "INFO"
    config.mode = "append"
    config.start_from = "beginning"
    config.do_ocr = False
    config.ocr_lang = ["eng"]
    config.force_full_page_ocr = False
    config.do_table_structure = True
    config.table_structure_mode = "accurate"
    config.do_cell_matching = True
    config.do_formula_enrichment = False
    config.chunk_max_tokens = 512
    config.chunk_overlap_tokens = 50
    config.tesseract_cmd = None
    return config
