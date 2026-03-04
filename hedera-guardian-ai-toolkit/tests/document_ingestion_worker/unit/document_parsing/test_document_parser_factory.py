"""
Unit tests for document_parser_factory.py - DocumentParserFactory and SupportedFormat.

Test organization:
- TestSupportedFormat: Enum values and from_extension method
- TestDocumentParserFactory: Format detection and support checking
"""

from pathlib import Path

import pytest

from document_ingestion_worker.document_parsing.document_parser_factory import (
    DocumentParserFactory,
    SupportedFormat,
)


class TestSupportedFormat:
    """Test suite for SupportedFormat enum."""

    def test_supported_format_values(self):
        """Test SupportedFormat enum has expected values."""
        assert SupportedFormat.PDF.value == "pdf"
        assert SupportedFormat.DOCX.value == "docx"

    def test_supported_format_is_string_enum(self):
        """Test SupportedFormat values are strings."""
        assert isinstance(SupportedFormat.PDF, str)
        assert isinstance(SupportedFormat.DOCX, str)

    @pytest.mark.parametrize(
        "extension,expected",
        [
            (".pdf", SupportedFormat.PDF),
            (".PDF", SupportedFormat.PDF),
            (".Pdf", SupportedFormat.PDF),
            (".docx", SupportedFormat.DOCX),
            (".DOCX", SupportedFormat.DOCX),
            (".Docx", SupportedFormat.DOCX),
        ],
    )
    def test_from_extension_valid(self, extension, expected):
        """Test from_extension returns correct format for valid extensions."""
        result = SupportedFormat.from_extension(extension)
        assert result == expected

    @pytest.mark.parametrize(
        "extension",
        [
            ".doc",  # Legacy Word format - not supported
            ".txt",
            ".rtf",
            ".odt",
            ".xlsx",
            ".pptx",
            "",
            "pdf",  # Without dot
            "docx",  # Without dot
        ],
    )
    def test_from_extension_unsupported(self, extension):
        """Test from_extension returns None for unsupported extensions."""
        result = SupportedFormat.from_extension(extension)
        assert result is None


class TestDocumentParserFactoryGetFormat:
    """Test suite for DocumentParserFactory.get_format method."""

    @pytest.mark.parametrize(
        "filename,expected_format",
        [
            ("document.pdf", SupportedFormat.PDF),
            ("document.PDF", SupportedFormat.PDF),
            ("document.Pdf", SupportedFormat.PDF),
            ("document.docx", SupportedFormat.DOCX),
            ("document.DOCX", SupportedFormat.DOCX),
            ("my.file.pdf", SupportedFormat.PDF),
            ("my.file.docx", SupportedFormat.DOCX),
            ("path/to/document.pdf", SupportedFormat.PDF),
            ("path/to/document.docx", SupportedFormat.DOCX),
        ],
    )
    def test_get_format_supported_files(self, filename, expected_format):
        """Test get_format returns correct format for supported files."""
        path = Path(filename)
        result = DocumentParserFactory.get_format(path)
        assert result == expected_format

    @pytest.mark.parametrize(
        "filename",
        [
            "document.doc",  # Legacy Word - not supported
            "document.txt",
            "document.rtf",
            "document.odt",
            "document.xlsx",
            "document.pptx",
            "document",  # No extension
            "document.",
        ],
    )
    def test_get_format_unsupported_files(self, filename):
        """Test get_format returns None for unsupported files."""
        path = Path(filename)
        result = DocumentParserFactory.get_format(path)
        assert result is None


class TestDocumentParserFactoryIsSupported:
    """Test suite for DocumentParserFactory.is_supported method."""

    @pytest.mark.parametrize(
        "filename",
        [
            "document.pdf",
            "document.PDF",
            "document.docx",
            "document.DOCX",
            "path/to/file.pdf",
            "path/to/file.docx",
        ],
    )
    def test_is_supported_returns_true(self, filename):
        """Test is_supported returns True for supported files."""
        path = Path(filename)
        assert DocumentParserFactory.is_supported(path) is True

    @pytest.mark.parametrize(
        "filename",
        [
            "document.doc",
            "document.txt",
            "document.rtf",
            "document.odt",
            "document.xlsx",
            "document",
        ],
    )
    def test_is_supported_returns_false(self, filename):
        """Test is_supported returns False for unsupported files."""
        path = Path(filename)
        assert DocumentParserFactory.is_supported(path) is False


class TestDocumentParserFactoryUtilities:
    """Test suite for DocumentParserFactory utility methods."""

    def test_get_supported_extensions(self):
        """Test get_supported_extensions returns expected extensions."""
        extensions = DocumentParserFactory.get_supported_extensions()

        assert ".pdf" in extensions
        assert ".docx" in extensions
        assert len(extensions) == 2

    def test_get_supported_glob_patterns(self):
        """Test get_supported_glob_patterns returns glob-compatible patterns."""
        patterns = DocumentParserFactory.get_supported_glob_patterns()

        assert "*.pdf" in patterns
        assert "*.docx" in patterns
        assert len(patterns) == 2

    def test_supported_extensions_constant(self):
        """Test SUPPORTED_EXTENSIONS maps extensions to formats correctly."""
        extensions = DocumentParserFactory.SUPPORTED_EXTENSIONS

        assert extensions[".pdf"] == SupportedFormat.PDF
        assert extensions[".docx"] == SupportedFormat.DOCX


class TestDocumentParserFactoryIntegrationPatterns:
    """Test patterns that would be used in integration scenarios."""

    def test_filtering_mixed_files(self):
        """Test using factory to filter supported files from a list."""
        files = [
            Path("doc1.pdf"),
            Path("doc2.docx"),
            Path("doc3.txt"),
            Path("doc4.doc"),
            Path("doc5.pdf"),
        ]

        supported = [f for f in files if DocumentParserFactory.is_supported(f)]

        assert len(supported) == 3
        assert Path("doc1.pdf") in supported
        assert Path("doc2.docx") in supported
        assert Path("doc5.pdf") in supported

    def test_grouping_by_format(self):
        """Test grouping files by their format."""
        files = [
            Path("doc1.pdf"),
            Path("doc2.docx"),
            Path("doc3.pdf"),
            Path("doc4.docx"),
        ]

        by_format = {}
        for f in files:
            fmt = DocumentParserFactory.get_format(f)
            if fmt:
                by_format.setdefault(fmt, []).append(f)

        assert len(by_format[SupportedFormat.PDF]) == 2
        assert len(by_format[SupportedFormat.DOCX]) == 2
