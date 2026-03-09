"""
Document parser factory for routing files to format-specific parsers.

This module provides a factory pattern for selecting the appropriate parser
based on file extension. It supports PDF and DOCX formats through Docling's
unified document model.
"""

from enum import StrEnum
from pathlib import Path


class SupportedFormat(StrEnum):
    """Enumeration of supported document formats.

    Each format corresponds to a file extension and maps to a specific
    parser implementation.

    Attributes:
        PDF: Adobe PDF format (.pdf)
        DOCX: Microsoft Word 2007+ format (.docx)
    """

    PDF = "pdf"
    DOCX = "docx"

    @classmethod
    def from_extension(cls, ext: str) -> "SupportedFormat | None":
        """Map file extension to SupportedFormat.

        Args:
            ext: File extension including the dot (e.g., ".pdf", ".docx")

        Returns:
            Corresponding SupportedFormat or None if not supported
        """
        mapping = {
            ".pdf": cls.PDF,
            ".docx": cls.DOCX,
        }
        return mapping.get(ext.lower())


class DocumentParserFactory:
    """Factory for creating format-specific document parsers.

    This class provides utilities for:
    - Detecting document format from file extension
    - Checking if a file format is supported
    - Creating appropriate parser instances

    The factory uses Docling's InputFormat enum internally for compatibility
    with the Docling DocumentConverter.

    Example:
        >>> from pathlib import Path
        >>> factory = DocumentParserFactory()
        >>> if factory.is_supported(Path("doc.docx")):
        ...     format_type = factory.get_format(Path("doc.docx"))
        ...     print(f"Format: {format_type}")
        Format: SupportedFormat.DOCX
    """

    SUPPORTED_EXTENSIONS = {
        ".pdf": SupportedFormat.PDF,
        ".docx": SupportedFormat.DOCX,
    }

    @classmethod
    def get_format(cls, file_path: Path) -> SupportedFormat | None:
        """Get the document format for a file.

        Args:
            file_path: Path to the document file

        Returns:
            SupportedFormat enum value or None if not supported
        """
        suffix = file_path.suffix.lower()
        return cls.SUPPORTED_EXTENSIONS.get(suffix)

    @classmethod
    def is_supported(cls, file_path: Path) -> bool:
        """Check if a file format is supported.

        Args:
            file_path: Path to the document file

        Returns:
            True if the file format is supported, False otherwise
        """
        return cls.get_format(file_path) is not None

    @classmethod
    def get_supported_extensions(cls) -> list[str]:
        """Get list of supported file extensions.

        Returns:
            List of extensions including the dot (e.g., [".pdf", ".docx"])
        """
        return list(cls.SUPPORTED_EXTENSIONS.keys())

    @classmethod
    def get_supported_glob_patterns(cls) -> list[str]:
        """Get glob patterns for discovering supported documents.

        Returns:
            List of glob patterns (e.g., ["*.pdf", "*.docx"])
        """
        return [f"*{ext}" for ext in cls.SUPPORTED_EXTENSIONS]
