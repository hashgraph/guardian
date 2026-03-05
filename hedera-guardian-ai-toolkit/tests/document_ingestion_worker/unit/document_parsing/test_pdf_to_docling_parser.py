"""
Unit tests for pdf_to_docling_parser.py - PdfParser class.

These tests use mocked Docling components to avoid PDF file dependencies.
Tests the simplified dependency injection API.

Test organization:
- TestPdfParserInitialization: Constructor and configuration
- TestPdfParserConversion: PDF to DoclingDocument conversion
- TestPdfParserConvertAndSave: JSON export functionality
- TestPdfParserLoadDoclingDocument: JSON import functionality
- TestPdfParserErrorHandling: File errors and edge cases
"""

import json
from pathlib import Path

import pytest

from document_ingestion_worker.document_parsing.pdf_to_docling_parser import PdfParser


class TestPdfParserInitialization:
    """Test suite for PdfParser initialization and configuration."""

    def test_initialization_with_default_settings(self, mock_pdf_converter):
        """Test parser initializes with complete default Tesseract configuration."""
        parser = PdfParser()

        # Converter is lazily created - verify it's not created yet
        assert parser.converter is None

        # Verify all default pipeline settings
        pipeline_opts = parser.pipeline_options
        assert pipeline_opts is not None
        assert pipeline_opts.do_ocr is True
        assert pipeline_opts.do_table_structure is True
        assert pipeline_opts.table_structure_options.do_cell_matching is True
        assert pipeline_opts.do_formula_enrichment is True

        # Verify OCR configuration
        assert pipeline_opts.ocr_options is not None
        assert pipeline_opts.ocr_options.force_full_page_ocr is True
        assert pipeline_opts.ocr_options.lang == ["eng"]

    def test_initialization_with_custom_pipeline_options(self, mock_pdf_converter):
        """Test initialization with custom PdfPipelineOptions."""
        from docling.datamodel.pipeline_options import (
            PdfPipelineOptions,
            TesseractCliOcrOptions,
        )

        # Create custom pipeline options with explicit values
        custom_ocr_options = TesseractCliOcrOptions(
            force_full_page_ocr=False,
            lang=["fra", "deu"],
        )
        custom_options = PdfPipelineOptions()
        custom_options.do_ocr = True
        custom_options.ocr_options = custom_ocr_options

        parser = PdfParser(pipeline_options=custom_options)

        # Converter is lazily created - verify it's not created yet
        assert parser.converter is None

        # Should use the injected options - the key assertion is that parser
        # stores and uses the provided custom_options
        assert parser.pipeline_options is custom_options
        assert parser.pipeline_options.ocr_options is custom_ocr_options

    def test_initialization_with_none_pipeline_options(self, mock_pdf_converter):
        """Test initialization with None pipeline_options uses defaults."""
        parser = PdfParser(pipeline_options=None)

        # Should create default pipeline options
        assert parser.pipeline_options is not None
        assert parser.pipeline_options.do_ocr is True

    def test_converter_creation_with_format_options(self, mock_pdf_converter, fake_pdf_file):
        """Test that converter is created with PDF format options on first conversion."""
        pdf_path = fake_pdf_file()
        parser = PdfParser()

        # Converter is lazily created
        assert parser.converter is None

        # Trigger converter creation by calling convert_pdf
        parser.convert_pdf(pdf_path)

        # Verify DocumentConverter was called with format_options
        call_kwargs = mock_pdf_converter["converter_class"].call_args[1]
        assert "format_options" in call_kwargs

        # Verify PDF format is configured - check that format_options has exactly one entry
        # and that entry's key value equals "pdf" (InputFormat.PDF enum value)
        format_options = call_kwargs["format_options"]
        assert len(format_options) == 1
        # InputFormat.PDF is an enum with value "pdf"
        assert any(str(key.value) == "pdf" for key in format_options)


class TestPdfParserConversion:
    """Test suite for PDF conversion methods."""

    def test_convert_pdf_success(self, mock_pdf_converter, fake_pdf_file):
        """Test successful PDF conversion returns document."""
        pdf_path = fake_pdf_file()

        parser = PdfParser()
        result = parser.convert_pdf(pdf_path)

        # Verify converter called with correct path
        mock_pdf_converter["converter"].convert.assert_called_once_with(source=str(pdf_path))

        # Should return the document
        assert result == mock_pdf_converter["document"]

    @pytest.mark.parametrize("path_type", [str, Path])
    def test_convert_pdf_accepts_both_path_types(
        self, mock_pdf_converter, fake_pdf_file, path_type
    ):
        """Test that convert_pdf accepts both string and Path object."""
        pdf_path = fake_pdf_file()

        parser = PdfParser()
        result = parser.convert_pdf(path_type(pdf_path))

        # Should work with either type
        assert result is not None
        mock_pdf_converter["converter"].convert.assert_called_once_with(source=str(pdf_path))

    def test_convert_pdf_with_custom_pipeline_options(self, mock_pdf_converter, fake_pdf_file):
        """Test convert_pdf respects custom pipeline options."""
        from docling.datamodel.pipeline_options import PdfPipelineOptions

        pdf_path = fake_pdf_file()

        # Custom options with OCR disabled
        custom_options = PdfPipelineOptions()
        custom_options.do_ocr = False

        parser = PdfParser(pipeline_options=custom_options)
        result = parser.convert_pdf(pdf_path)

        # Should successfully convert
        assert result is not None


class TestPdfParserConvertAndSave:
    """Test suite for convert_and_save method."""

    def test_convert_and_save_success(self, mock_pdf_converter, fake_pdf_file, tmp_path):
        """Test successful conversion and save to JSON with proper structure."""
        pdf_path = fake_pdf_file()
        output_path = tmp_path / "output" / "result.json"

        # Configure mock document export
        mock_pdf_converter["document"].export_to_dict.return_value = {
            "text": "test content",
            "metadata": {"pages": 1},
        }

        parser = PdfParser()
        result = parser.convert_and_save(pdf_path, output_path)

        # Output directory should be created
        assert output_path.parent.exists()

        # Output file should exist and contain correct JSON
        assert output_path.exists()
        with output_path.open("r", encoding="utf-8") as f:
            saved_data = json.load(f)
        assert saved_data == {"text": "test content", "metadata": {"pages": 1}}

        # Result should contain metadata
        assert result["source"] == str(pdf_path)
        assert result["output"] == str(output_path)
        assert result["success"] is True

    def test_convert_and_save_creates_nested_directories(
        self, mock_pdf_converter, fake_pdf_file, tmp_path
    ):
        """Test that deeply nested output directories are created."""
        pdf_path = fake_pdf_file()

        # Deep nesting
        output_path = tmp_path / "a" / "b" / "c" / "d" / "output.json"

        parser = PdfParser()
        parser.convert_and_save(pdf_path, output_path)

        # All directories should be created
        assert output_path.parent.exists()
        assert output_path.exists()

    def test_convert_and_save_handles_unicode(self, mock_pdf_converter, fake_pdf_file, tmp_path):
        """Test that Unicode content is preserved in JSON export."""
        pdf_path = fake_pdf_file()
        output_path = tmp_path / "output.json"

        # Configure mock with Unicode content
        mock_pdf_converter["document"].export_to_dict.return_value = {
            "text": "Test with émojis 🚀 and spëcial çharacters",
        }

        parser = PdfParser()
        parser.convert_and_save(pdf_path, output_path)

        # Unicode should be preserved
        with output_path.open("r", encoding="utf-8") as f:
            saved_data = json.load(f)
        assert "🚀" in saved_data["text"]
        assert "émojis" in saved_data["text"]

    @pytest.mark.parametrize("path_type", [str, Path])
    def test_convert_and_save_accepts_both_path_types(
        self, mock_pdf_converter, fake_pdf_file, tmp_path, path_type
    ):
        """Test that convert_and_save accepts both string and Path objects."""
        pdf_path = fake_pdf_file()
        output_path = tmp_path / "output.json"

        parser = PdfParser()
        result = parser.convert_and_save(path_type(pdf_path), path_type(output_path))

        # Should work with either path type
        assert result["success"] is True
        assert output_path.exists()

    def test_convert_and_save_json_formatting(self, mock_pdf_converter, fake_pdf_file, tmp_path):
        """Test that JSON is saved with proper indentation."""
        pdf_path = fake_pdf_file()
        output_path = tmp_path / "output.json"

        # Configure mock with nested structure
        mock_pdf_converter["document"].export_to_dict.return_value = {
            "nested": {"key": "value"},
            "list": [1, 2, 3],
        }

        parser = PdfParser()
        parser.convert_and_save(pdf_path, output_path)

        # Read raw content to verify formatting
        content = output_path.read_text(encoding="utf-8")

        # Should be pretty-printed with indentation
        assert "  " in content  # Contains indentation
        assert "\n" in content  # Contains newlines

    def test_convert_and_save_overwrites_existing_file(
        self, mock_pdf_converter, fake_pdf_file, tmp_path
    ):
        """Test that convert_and_save overwrites existing output file."""
        pdf_path = fake_pdf_file()
        output_path = tmp_path / "output.json"

        # Create existing file with old content
        with output_path.open("w") as f:
            json.dump({"old": "data"}, f)

        # Configure new content
        mock_pdf_converter["document"].export_to_dict.return_value = {"new": "data"}

        parser = PdfParser()
        parser.convert_and_save(pdf_path, output_path)

        # Should contain only new data
        with output_path.open("r") as f:
            saved_data = json.load(f)
        assert saved_data == {"new": "data"}
        assert "old" not in saved_data


class TestPdfParserLoadDoclingDocument:
    """Test suite for loading DoclingDocument from JSON."""

    def test_load_docling_document_success(self, mock_docling_document_class, create_test_json):
        """Test successful loading of DoclingDocument from JSON."""
        json_data = {"text": "test content", "metadata": {}}
        json_path = create_test_json("document.json", json_data)

        result = PdfParser.load_docling_document(json_path)

        # Should call model_validate with loaded data
        mock_docling_document_class["class"].model_validate.assert_called_once_with(json_data)
        assert result == mock_docling_document_class["document"]

    @pytest.mark.parametrize("path_type", [str, Path])
    def test_load_docling_document_accepts_both_path_types(
        self, mock_docling_document_class, create_test_json, path_type
    ):
        """Test that load_docling_document accepts both string and Path object."""
        json_path = create_test_json()

        result = PdfParser.load_docling_document(path_type(json_path))

        assert result is not None
        mock_docling_document_class["class"].model_validate.assert_called_once()

    def test_load_docling_document_handles_unicode(
        self, mock_docling_document_class, create_test_json
    ):
        """Test that Unicode content is correctly loaded."""
        json_data = {"text": "Content with émojis 🎉 and ñ"}
        json_path = create_test_json("unicode.json", json_data)

        PdfParser.load_docling_document(json_path)

        # Should load with proper encoding
        call_args = mock_docling_document_class["class"].model_validate.call_args[0][0]
        assert "🎉" in call_args["text"]
        assert "émojis" in call_args["text"]

    def test_load_docling_document_with_complex_structure(
        self, mock_docling_document_class, create_test_json
    ):
        """Test loading document with complex nested structure."""
        json_data = {
            "text": "test",
            "metadata": {
                "pages": 10,
                "nested": {"deep": {"value": 42}},
            },
            "sections": [
                {"title": "Section 1", "content": "Content 1"},
                {"title": "Section 2", "content": "Content 2"},
            ],
        }
        json_path = create_test_json("complex.json", json_data)

        PdfParser.load_docling_document(json_path)

        # Should pass complete structure to model_validate
        call_args = mock_docling_document_class["class"].model_validate.call_args[0][0]
        assert call_args == json_data

    def test_load_docling_document_with_empty_json(
        self, mock_docling_document_class, create_test_json
    ):
        """Test loading document from empty JSON object."""
        json_path = create_test_json("empty.json", {})

        result = PdfParser.load_docling_document(json_path)

        assert result is not None
        mock_docling_document_class["class"].model_validate.assert_called_once_with({})


class TestPdfParserErrorHandling:
    """Test suite for error handling and edge cases."""

    def test_convert_pdf_file_not_found(self, mock_pdf_converter):
        """Test convert_pdf raises FileNotFoundError when file doesn't exist."""
        parser = PdfParser()

        with pytest.raises(FileNotFoundError, match="PDF file not found"):
            parser.convert_pdf("/nonexistent/file.pdf")

        # Converter should not be called
        mock_pdf_converter["converter"].convert.assert_not_called()

    def test_load_docling_document_file_not_found(self):
        """Test load_docling_document raises FileNotFoundError when file doesn't exist."""
        with pytest.raises(FileNotFoundError, match="JSON file not found"):
            PdfParser.load_docling_document("/nonexistent/file.json")

    def test_convert_pdf_with_relative_path(
        self, mock_pdf_converter, fake_pdf_file, monkeypatch, tmp_path
    ):
        """Test convert_pdf handles relative paths correctly."""
        # Change to tmp_path directory
        monkeypatch.chdir(tmp_path)

        # Create file with relative path
        pdf_path = Path("relative.pdf")
        pdf_path.write_text("fake pdf content")

        parser = PdfParser()
        result = parser.convert_pdf(pdf_path)

        assert result is not None
