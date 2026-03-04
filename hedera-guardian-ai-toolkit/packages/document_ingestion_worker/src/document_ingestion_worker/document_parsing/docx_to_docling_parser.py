"""
DOCX parser using Docling for conversion to DoclingDocument format.

This module provides a streamlined API for parsing Microsoft Word (.docx) files
into Docling's unified document model. The parser follows the same pattern as
PdfParser for consistency.
"""

import json
import logging
from pathlib import Path
from typing import Any

from docling.datamodel.base_models import InputFormat
from docling.datamodel.document import DoclingDocument
from docling.document_converter import DocumentConverter, WordFormatOption

from .base import CleanupMixin

logger = logging.getLogger(__name__)


class DocxParser(CleanupMixin):
    """
    DOCX parser using Docling with WordFormatOption.

    Converts Microsoft Word (.docx) files to DoclingDocument format using
    Docling's DocumentConverter. The resulting DoclingDocument is compatible
    with the existing chunking, structure extraction, and embedding pipeline.

    Unlike PDF parsing, DOCX conversion does not require OCR since the text
    is already digital. This typically results in faster processing times.

    Example:
        >>> parser = DocxParser()
        >>> doc = parser.convert_docx("methodology.docx")
        >>> print(doc.export_to_markdown())

    Example with JSON export:
        >>> parser = DocxParser()
        >>> result = parser.convert_and_save("input.docx", "output.json")
        >>> print(f"Saved to: {result['output']}")
    """

    def __init__(self) -> None:
        """
        Initialize the DOCX parser.

        Creates a DocumentConverter configured for DOCX input format
        using default WordFormatOption settings.
        """
        self.converter: DocumentConverter | None = self._create_converter()

        # Track cleanup state to prevent reuse after cleanup
        self._is_cleaned = False

    def _do_cleanup(self) -> None:
        """Release resources held by the parser.

        Called by CleanupMixin.cleanup() to free memory.
        """
        if self.converter is not None:
            del self.converter
            self.converter = None

        logger.debug("DocxParser resources released")

    def _create_converter(self) -> DocumentConverter:
        """
        Create a DocumentConverter configured for DOCX files.

        Returns:
            Configured DocumentConverter instance
        """
        format_options = {
            InputFormat.DOCX: WordFormatOption(),
        }
        return DocumentConverter(format_options=format_options)

    def convert_docx(self, docx_path: str | Path) -> DoclingDocument:
        """
        Convert a DOCX file to DoclingDocument format.

        Args:
            docx_path: Path to the DOCX file

        Returns:
            DoclingDocument containing the parsed document structure

        Raises:
            FileNotFoundError: If the DOCX file doesn't exist
            ValueError: If the file is not a valid DOCX or is password-protected
            RuntimeError: If the parser has been cleaned up
        """
        self._check_not_cleaned("convert_docx")

        docx_path = Path(docx_path)
        if not docx_path.exists():
            raise FileNotFoundError(f"DOCX file not found: {docx_path}")

        if docx_path.suffix.lower() != ".docx":
            raise ValueError(f"Not a DOCX file: {docx_path}")

        try:
            logger.info(f"Converting DOCX: {docx_path.name}")
            convert_result = self.converter.convert(source=str(docx_path))
            logger.debug(f"DOCX conversion successful: {docx_path.name}")
            return convert_result.document
        except Exception as e:
            # Handle specific error cases
            error_msg = str(e).lower()
            if "password" in error_msg or "encrypted" in error_msg:
                logger.error(f"Password-protected DOCX file: {docx_path}")
                raise ValueError(f"Password-protected DOCX file: {docx_path}") from e
            if "corrupt" in error_msg or "invalid" in error_msg:
                logger.error(f"Corrupted or invalid DOCX file: {docx_path}")
                raise ValueError(f"Corrupted or invalid DOCX file: {docx_path}") from e
            # Re-raise other errors
            logger.error(f"Error converting DOCX {docx_path}: {e}")
            raise

    def convert_and_save(self, docx_path: str | Path, output_path: str | Path) -> dict[str, Any]:
        """
        Convert a DOCX and save the result as JSON.

        Args:
            docx_path: Path to the DOCX file
            output_path: Path where the JSON output should be saved

        Returns:
            Dictionary containing conversion statistics with keys:
                - source: Path to source DOCX
                - output: Path to output JSON
                - success: Boolean indicating success

        Raises:
            FileNotFoundError: If the DOCX file doesn't exist
            ValueError: If the file is not a valid DOCX
        """
        docx_path = Path(docx_path)
        output_path = Path(output_path)

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Convert DOCX
        doc = self.convert_docx(docx_path)

        # Export to dictionary
        doc_dict = doc.export_to_dict()

        # Save to JSON
        with output_path.open("w", encoding="utf-8") as f:
            json.dump(doc_dict, f, ensure_ascii=False, indent=2)

        logger.info(f"Saved DoclingDocument to: {output_path}")

        return {
            "source": str(docx_path),
            "output": str(output_path),
            "success": True,
        }

    @staticmethod
    def load_docling_document(json_path: str | Path) -> DoclingDocument:
        """
        Load a DoclingDocument from a saved JSON file.

        Args:
            json_path: Path to the JSON file containing DoclingDocument data

        Returns:
            Deserialized DoclingDocument

        Raises:
            FileNotFoundError: If the JSON file doesn't exist
        """
        json_path = Path(json_path)
        if not json_path.exists():
            raise FileNotFoundError(f"JSON file not found: {json_path}")

        with json_path.open("r", encoding="utf-8") as f:
            json_data = json.load(f)

        return DoclingDocument.model_validate(json_data)
