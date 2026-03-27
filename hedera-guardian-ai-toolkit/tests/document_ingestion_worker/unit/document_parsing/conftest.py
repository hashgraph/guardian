"""
Shared fixtures for unit tests in document_ingestion_worker.

This conftest provides common test fixtures to reduce boilerplate and
improve test maintainability.
"""

import json
from unittest.mock import Mock, patch

import pytest


@pytest.fixture
def mock_pdf_converter():
    """
    Mock DocumentConverter with complete chain setup.

    Provides a fully configured mock chain: DocumentConverter → result → document.
    This eliminates repetitive mock setup across PDF conversion tests.

    Also mocks Docling classes (PdfFormatOption, DoclingParseBackend)
    to avoid Pydantic validation from real Docling classes.

    Returns:
        dict: Contains 'converter_class', 'converter', 'result', 'document' keys
              with configured mocks ready for testing.

    Example:
        def test_convert(mock_pdf_converter):
            parser = PdfParser()
            doc = parser.convert_pdf("test.pdf")
            assert doc == mock_pdf_converter["document"]
    """
    with (
        patch(
            "document_ingestion_worker.document_parsing.pdf_to_docling_parser.DocumentConverter"
        ) as mock_class,
        patch(
            "document_ingestion_worker.document_parsing.pdf_to_docling_parser.DoclingParseBackend"
        ),
        patch("document_ingestion_worker.document_parsing.pdf_to_docling_parser.PdfFormatOption"),
    ):
        mock_converter = Mock()
        mock_result = Mock()
        mock_document = Mock()

        # Default export_to_dict behavior
        mock_document.export_to_dict.return_value = {
            "text": "test content",
            "metadata": {"pages": 1},
        }

        # Wire up the chain
        mock_result.document = mock_document
        mock_converter.convert.return_value = mock_result
        mock_class.return_value = mock_converter

        yield {
            "converter_class": mock_class,
            "converter": mock_converter,
            "result": mock_result,
            "document": mock_document,
        }


@pytest.fixture
def fake_pdf_file(tmp_path):
    """
    Factory fixture to create fake PDF files for testing.

    Args:
        filename (str): Name of the PDF file. Defaults to "test.pdf"
        content (str): Content to write. Defaults to "fake pdf content"

    Returns:
        Path: Path to the created fake PDF file

    Example:
        def test_convert(fake_pdf_file):
            pdf_path = fake_pdf_file()
            # or with custom name:
            pdf_path = fake_pdf_file("custom.pdf", "custom content")
    """

    def _create(filename="test.pdf", content="fake pdf content"):
        pdf_path = tmp_path / filename
        pdf_path.write_text(content)
        return pdf_path

    return _create


@pytest.fixture
def create_test_json(tmp_path):
    """
    Factory fixture to create test JSON files.

    Args:
        filename (str): Name of the JSON file. Defaults to "test.json"
        data (dict): Data to serialize. Defaults to empty dict

    Returns:
        Path: Path to the created JSON file

    Example:
        def test_load(create_test_json):
            json_path = create_test_json("doc.json", {"key": "value"})
            # JSON is written with UTF-8 encoding, ensure_ascii=False
    """

    def _create(filename="test.json", data=None):
        json_path = tmp_path / filename
        with json_path.open("w", encoding="utf-8") as f:
            json.dump(data or {}, f, ensure_ascii=False)
        return json_path

    return _create


@pytest.fixture
def mock_docling_document_class():
    """
    Mock DoclingDocument class for load/validation tests.

    Provides a mocked DoclingDocument class with model_validate configured.
    Useful for testing document loading from JSON.

    Returns:
        dict: Contains 'class' (mocked DoclingDocument) and 'document' (mocked instance)

    Example:
        def test_load(mock_docling_document_class):
            doc = PdfParser.load_docling_document("test.json")
            assert doc == mock_docling_document_class["document"]
    """
    with patch(
        "document_ingestion_worker.document_parsing.pdf_to_docling_parser.DoclingDocument"
    ) as mock_class:
        mock_doc = Mock()
        mock_class.model_validate.return_value = mock_doc

        yield {"class": mock_class, "document": mock_doc}
