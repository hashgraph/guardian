"""
Unit tests for docx_to_docling_parser.py - DocxParser class.

These tests use mocked Docling components to avoid DOCX file dependencies.

Test organization:
- TestDocxParserInitialization: Constructor and configuration
- TestDocxParserConvertDocx: DOCX to DoclingDocument conversion
- TestDocxParserConvertAndSave: JSON export functionality
- TestDocxParserLoadDoclingDocument: JSON import functionality
- TestDocxParserErrorHandling: File errors and edge cases
"""

import json
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from document_ingestion_worker.document_parsing.docx_to_docling_parser import DocxParser


@pytest.fixture
def mock_docx_converter():
    """
    Mock DocumentConverter with complete chain setup for DOCX.

    Provides a fully configured mock chain: DocumentConverter → result → document.
    """
    with patch(
        "document_ingestion_worker.document_parsing.docx_to_docling_parser.DocumentConverter"
    ) as mock_class:
        mock_converter = Mock()
        mock_result = Mock()
        mock_document = Mock()

        # Default export_to_dict behavior
        mock_document.export_to_dict.return_value = {
            "text": "test docx content",
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
def fake_docx_file(tmp_path):
    """
    Factory fixture to create fake DOCX files for testing.

    Returns:
        Callable: Factory function that creates fake DOCX files
    """

    def _create(filename="test.docx", content="fake docx content"):
        docx_path = tmp_path / filename
        docx_path.write_text(content)
        return docx_path

    return _create


@pytest.fixture
def mock_docling_document_class_docx():
    """
    Mock DoclingDocument class for load/validation tests.
    """
    with patch(
        "document_ingestion_worker.document_parsing.docx_to_docling_parser.DoclingDocument"
    ) as mock_class:
        mock_doc = Mock()
        mock_class.model_validate.return_value = mock_doc

        yield {"class": mock_class, "document": mock_doc}


class TestDocxParserInitialization:
    """Test suite for DocxParser initialization and configuration."""

    def test_initialization_creates_converter(self, mock_docx_converter):
        """Test parser initializes DocumentConverter correctly."""
        parser = DocxParser()

        # Verify converter creation
        mock_docx_converter["converter_class"].assert_called_once()
        assert parser.converter is not None

    def test_converter_creation_with_format_options(self, mock_docx_converter):
        """Test that converter is created with DOCX format options."""
        _parser = DocxParser()

        # Verify DocumentConverter was called with format_options
        call_kwargs = mock_docx_converter["converter_class"].call_args[1]
        assert "format_options" in call_kwargs

        # Verify DOCX format is configured - check that format_options has exactly one entry
        # and that entry's key value equals "docx" (InputFormat.DOCX enum value)
        format_options = call_kwargs["format_options"]
        assert len(format_options) == 1
        # InputFormat.DOCX is an enum with value "docx"
        assert any(str(key.value) == "docx" for key in format_options)


class TestDocxParserConvertDocx:
    """Test suite for DOCX conversion methods."""

    def test_convert_docx_success(self, mock_docx_converter, fake_docx_file):
        """Test successful DOCX conversion returns document."""
        docx_path = fake_docx_file()

        parser = DocxParser()
        result = parser.convert_docx(docx_path)

        # Verify converter called with correct path
        mock_docx_converter["converter"].convert.assert_called_once_with(source=str(docx_path))

        # Should return the document
        assert result == mock_docx_converter["document"]

    @pytest.mark.parametrize("path_type", [str, Path])
    def test_convert_docx_accepts_both_path_types(
        self, mock_docx_converter, fake_docx_file, path_type
    ):
        """Test that convert_docx accepts both string and Path object."""
        docx_path = fake_docx_file()

        parser = DocxParser()
        result = parser.convert_docx(path_type(docx_path))

        # Should work with either type
        assert result is not None
        mock_docx_converter["converter"].convert.assert_called_once_with(source=str(docx_path))

    def test_convert_docx_file_not_found(self, mock_docx_converter):
        """Test convert_docx raises FileNotFoundError when file doesn't exist."""
        parser = DocxParser()

        with pytest.raises(FileNotFoundError, match="DOCX file not found"):
            parser.convert_docx("/nonexistent/file.docx")

        # Converter should not be called
        mock_docx_converter["converter"].convert.assert_not_called()

    def test_convert_docx_wrong_extension(self, mock_docx_converter, tmp_path):
        """Test convert_docx raises ValueError for non-DOCX files."""
        pdf_file = tmp_path / "test.pdf"
        pdf_file.write_text("fake content")

        parser = DocxParser()

        with pytest.raises(ValueError, match="Not a DOCX file"):
            parser.convert_docx(pdf_file)

    def test_convert_docx_password_protected(self, mock_docx_converter, fake_docx_file):
        """Test convert_docx raises ValueError for password-protected files."""
        docx_path = fake_docx_file()

        # Configure mock to raise exception for password-protected file
        mock_docx_converter["converter"].convert.side_effect = Exception(
            "Error: Password protected file"
        )

        parser = DocxParser()

        with pytest.raises(ValueError, match="Password-protected DOCX file"):
            parser.convert_docx(docx_path)

    def test_convert_docx_corrupted_file(self, mock_docx_converter, fake_docx_file):
        """Test convert_docx raises ValueError for corrupted files."""
        docx_path = fake_docx_file()

        # Configure mock to raise exception for corrupted file
        mock_docx_converter["converter"].convert.side_effect = Exception(
            "Error: Corrupted file structure"
        )

        parser = DocxParser()

        with pytest.raises(ValueError, match="Corrupted or invalid DOCX file"):
            parser.convert_docx(docx_path)


class TestDocxParserConvertAndSave:
    """Test suite for convert_and_save method."""

    def test_convert_and_save_success(self, mock_docx_converter, fake_docx_file, tmp_path):
        """Test successful conversion and save to JSON with proper structure."""
        docx_path = fake_docx_file()
        output_path = tmp_path / "output" / "result.json"

        # Configure mock document export
        mock_docx_converter["document"].export_to_dict.return_value = {
            "text": "test content",
            "metadata": {"pages": 1},
        }

        parser = DocxParser()
        result = parser.convert_and_save(docx_path, output_path)

        # Output directory should be created
        assert output_path.parent.exists()

        # Output file should exist and contain correct JSON
        assert output_path.exists()
        with output_path.open("r", encoding="utf-8") as f:
            saved_data = json.load(f)
        assert saved_data == {"text": "test content", "metadata": {"pages": 1}}

        # Result should contain metadata
        assert result["source"] == str(docx_path)
        assert result["output"] == str(output_path)
        assert result["success"] is True

    def test_convert_and_save_creates_nested_directories(
        self, mock_docx_converter, fake_docx_file, tmp_path
    ):
        """Test that deeply nested output directories are created."""
        docx_path = fake_docx_file()

        # Deep nesting
        output_path = tmp_path / "a" / "b" / "c" / "d" / "output.json"

        parser = DocxParser()
        parser.convert_and_save(docx_path, output_path)

        # All directories should be created
        assert output_path.parent.exists()
        assert output_path.exists()

    def test_convert_and_save_handles_unicode(self, mock_docx_converter, fake_docx_file, tmp_path):
        """Test that Unicode content is preserved in JSON export."""
        docx_path = fake_docx_file()
        output_path = tmp_path / "output.json"

        # Configure mock with Unicode content (using actual emoji, not surrogate pairs)
        mock_docx_converter["document"].export_to_dict.return_value = {
            "text": "Test with émojis and spëcial çharacters",
        }

        parser = DocxParser()
        parser.convert_and_save(docx_path, output_path)

        # Unicode should be preserved
        with output_path.open("r", encoding="utf-8") as f:
            saved_data = json.load(f)
        assert "émojis" in saved_data["text"]
        assert "çharacters" in saved_data["text"]

    @pytest.mark.parametrize("path_type", [str, Path])
    def test_convert_and_save_accepts_both_path_types(
        self, mock_docx_converter, fake_docx_file, tmp_path, path_type
    ):
        """Test that convert_and_save accepts both string and Path objects."""
        docx_path = fake_docx_file()
        output_path = tmp_path / "output.json"

        parser = DocxParser()
        result = parser.convert_and_save(path_type(docx_path), path_type(output_path))

        # Should work with either path type
        assert result["success"] is True
        assert output_path.exists()


class TestDocxParserLoadDoclingDocument:
    """Test suite for loading DoclingDocument from JSON."""

    def test_load_docling_document_success(self, mock_docling_document_class_docx, tmp_path):
        """Test successful loading of DoclingDocument from JSON."""
        json_data = {"text": "test content", "metadata": {}}
        json_path = tmp_path / "document.json"
        with json_path.open("w", encoding="utf-8") as f:
            json.dump(json_data, f)

        result = DocxParser.load_docling_document(json_path)

        # Should call model_validate with loaded data
        mock_docling_document_class_docx["class"].model_validate.assert_called_once_with(json_data)
        assert result == mock_docling_document_class_docx["document"]

    @pytest.mark.parametrize("path_type", [str, Path])
    def test_load_docling_document_accepts_both_path_types(
        self, mock_docling_document_class_docx, tmp_path, path_type
    ):
        """Test that load_docling_document accepts both string and Path object."""
        json_path = tmp_path / "test.json"
        with json_path.open("w", encoding="utf-8") as f:
            json.dump({}, f)

        result = DocxParser.load_docling_document(path_type(json_path))

        assert result is not None
        mock_docling_document_class_docx["class"].model_validate.assert_called_once()

    def test_load_docling_document_file_not_found(self):
        """Test load_docling_document raises FileNotFoundError when file doesn't exist."""
        with pytest.raises(FileNotFoundError, match="JSON file not found"):
            DocxParser.load_docling_document("/nonexistent/file.json")
