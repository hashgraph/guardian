"""
Integration tests for docx_to_docling_parser.py - DocxParser class.

These tests verify DocxParser integration with Docling using real DOCX documents.

Focus: Test our wrapper code, not Docling's internals.
Mark with @pytest.mark.integration to separate from unit tests.

## Test Data Setup

Uses DOCX fixtures from tests/fixtures/docx/ directory.
"""

import os
from pathlib import Path

import pytest

from document_ingestion_worker.document_parsing.docx_to_docling_parser import DocxParser

# Path to the DOCX fixtures directory
DOCX_FIXTURES_DIR = Path(__file__).parent.parent.parent.parent / "fixtures" / "docx"


def get_docx_fixture_path(filename: str = "simple.docx") -> Path | None:
    """
    Get DOCX fixture path.

    Args:
        filename: Name of the DOCX fixture file

    Returns:
        Path to test DOCX if available, None otherwise
    """
    # First check environment variable for custom DOCX
    docx_path_str = os.environ.get("TEST_DOCX_PATH")
    if docx_path_str:
        docx_path = Path(docx_path_str)
        if docx_path.exists():
            return docx_path

    # Fall back to fixture
    fixture_path = DOCX_FIXTURES_DIR / filename
    if fixture_path.exists():
        return fixture_path

    return None


@pytest.fixture(scope="session")
def real_docx_path():
    """
    Provide path to real simple DOCX file for integration testing.

    Returns:
        Path to simple.docx fixture
    """
    docx_path = get_docx_fixture_path("simple.docx")

    if docx_path is None:
        pytest.skip(
            f"DOCX fixture not found at {DOCX_FIXTURES_DIR / 'simple.docx'}. "
            "Run tests/fixtures/docx/create_fixtures.py to generate test files."
        )

    return docx_path


@pytest.fixture(scope="session")
def docx_with_tables_path():
    """
    Provide path to DOCX with tables for testing table extraction.

    Returns:
        Path to with_tables.docx fixture
    """
    docx_path = get_docx_fixture_path("with_tables.docx")

    if docx_path is None:
        pytest.skip(
            f"DOCX fixture not found at {DOCX_FIXTURES_DIR / 'with_tables.docx'}. "
            "Run tests/fixtures/docx/create_fixtures.py to generate test files."
        )

    return docx_path


@pytest.fixture(scope="session")
def docx_with_headings_path():
    """
    Provide path to DOCX with heading hierarchy for structure testing.

    Returns:
        Path to with_headings.docx fixture
    """
    docx_path = get_docx_fixture_path("with_headings.docx")

    if docx_path is None:
        pytest.skip(
            f"DOCX fixture not found at {DOCX_FIXTURES_DIR / 'with_headings.docx'}. "
            "Run tests/fixtures/docx/create_fixtures.py to generate test files."
        )

    return docx_path


@pytest.fixture(scope="session")
def docx_parser():
    """
    Create DocxParser instance for integration tests.

    Returns:
        DocxParser instance
    """
    return DocxParser()


@pytest.mark.integration
class TestDocxParserIntegration:
    """Integration tests using real DOCX files."""

    def test_parse_simple_docx(self, docx_parser, real_docx_path):
        """Test parsing a simple DOCX document."""
        doc = docx_parser.convert_docx(real_docx_path)

        # Verify document was parsed
        assert doc is not None

        # Verify export to dict works
        doc_dict = doc.export_to_dict()
        assert doc_dict is not None
        assert isinstance(doc_dict, dict)

        # Verify markdown export works
        markdown = doc.export_to_markdown()
        assert markdown is not None
        assert len(markdown) > 0

    def test_parse_docx_with_tables(self, docx_parser, docx_with_tables_path):
        """Test parsing DOCX with tables."""
        doc = docx_parser.convert_docx(docx_with_tables_path)

        # Verify document was parsed
        assert doc is not None

        # Verify export works
        doc_dict = doc.export_to_dict()
        assert doc_dict is not None

        # Verify markdown export contains table-related content
        markdown = doc.export_to_markdown()
        assert markdown is not None
        # Look for table content (parameter names from fixture)
        assert "Parameter" in markdown or "Baseline" in markdown

    def test_parse_docx_with_headings(self, docx_parser, docx_with_headings_path):
        """Test parsing DOCX with heading hierarchy."""
        doc = docx_parser.convert_docx(docx_with_headings_path)

        # Verify document was parsed
        assert doc is not None

        # Verify markdown export contains heading content
        markdown = doc.export_to_markdown()
        assert markdown is not None
        # Look for heading text from fixture
        assert "Introduction" in markdown or "Applicability" in markdown

    def test_convert_and_save_round_trip(self, docx_parser, real_docx_path, tmp_path):
        """Test converting DOCX, saving to JSON, and loading back."""
        json_path = tmp_path / "output.json"

        # Convert and save
        result = docx_parser.convert_and_save(real_docx_path, json_path)

        # Verify save succeeded
        assert result["success"] is True
        assert json_path.exists()

        # Verify we can load it back
        loaded_doc = DocxParser.load_docling_document(json_path)
        assert loaded_doc is not None

        # Verify loaded document is usable
        reloaded_dict = loaded_doc.export_to_dict()
        assert reloaded_dict is not None
        assert isinstance(reloaded_dict, dict)

    def test_output_directory_creation(self, docx_parser, real_docx_path, tmp_path):
        """Test that nested output directories are created automatically."""
        # Create deeply nested path
        output_path = tmp_path / "a" / "b" / "c" / "output.json"

        result = docx_parser.convert_and_save(real_docx_path, output_path)

        # Verify directories were created and file was saved
        assert output_path.exists()
        assert result["success"] is True


@pytest.mark.integration
class TestDocxParserIntegrationErrorHandling:
    """Integration tests for error handling with real operations."""

    def test_convert_nonexistent_docx_raises_error(self, docx_parser):
        """Test that converting non-existent DOCX raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError, match="DOCX file not found"):
            docx_parser.convert_docx("/nonexistent/path/to/file.docx")

    def test_load_nonexistent_json_raises_error(self):
        """Test that loading non-existent JSON raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError, match="JSON file not found"):
            DocxParser.load_docling_document("/nonexistent/path/to/file.json")

    def test_convert_corrupted_docx(self, docx_parser, tmp_path):
        """Test handling of corrupted DOCX file."""
        docx_path = tmp_path / "corrupted.docx"

        # Create invalid DOCX content (not a valid ZIP archive)
        docx_path.write_text("This is not a valid DOCX file")

        # Should raise an error
        with pytest.raises(Exception):  # noqa: B017
            docx_parser.convert_docx(docx_path)

    def test_convert_pdf_as_docx_raises_error(self, docx_parser, tmp_path):
        """Test that attempting to parse PDF as DOCX raises ValueError."""
        pdf_path = tmp_path / "document.pdf"
        pdf_path.write_text("fake pdf content")

        with pytest.raises(ValueError, match="Not a DOCX file"):
            docx_parser.convert_docx(pdf_path)


@pytest.mark.integration
class TestDocxParserOutputQuality:
    """Tests verifying the quality of DOCX parsing output."""

    def test_markdown_contains_expected_content(self, docx_parser, real_docx_path):
        """Test that markdown output contains expected text content."""
        doc = docx_parser.convert_docx(real_docx_path)
        markdown = doc.export_to_markdown()

        # Simple document should contain key phrases
        assert "carbon" in markdown.lower() or "methodology" in markdown.lower()

    def test_export_to_dict_contains_structure(self, docx_parser, real_docx_path):
        """Test that dict export contains document structure."""
        doc = docx_parser.convert_docx(real_docx_path)
        doc_dict = doc.export_to_dict()

        # Should be a non-empty dictionary
        assert len(doc_dict) > 0
