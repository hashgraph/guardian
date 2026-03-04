"""Custom hierarchy postprocessor that forces fallback mode.

This module provides a custom postprocessor implementation that bypasses PDF bookmark
metadata and forces the postprocessor to use its fallback algorithm, which relies on
Docling's visual layout analysis and detected headers.

The fallback mode solves the critical issue where incomplete or mismatched PDF bookmarks
cause legitimate headers to be demoted to plain text (e.g., 85 of 102 headers lost in VM0050).
"""

from hierarchical.hierarchy_builder_metadata import HierarchyBuilderMetadata
from hierarchical.postprocessor import ResultPostprocessor


class FallbackHierarchyBuilderMetadata(HierarchyBuilderMetadata):
    """HierarchyBuilderMetadata that always returns empty TOC.

    This forces the postprocessor to use its fallback algorithm which:
    - Uses Docling's detected headers instead of PDF bookmarks
    - Builds hierarchy from visual layout analysis
    - Never demotes legitimate headers
    - Properly nests subheaders

    This solves the issue where incomplete or mismatched PDF bookmarks
    cause legitimate headers to be demoted to plain text.
    """

    @property
    def toc(self) -> list[tuple]:
        """Always return empty TOC to force fallback mode.

        Returns:
            Empty list, bypassing PDF bookmark extraction
        """
        return []


class FallbackResultPostprocessor(ResultPostprocessor):
    """Postprocessor that forces fallback mode by skipping PDF bookmarks.

    This postprocessor ensures consistent header preservation across all PDFs
    by using Docling's visual header detection instead of potentially incomplete
    or mismatched PDF bookmark metadata.

    Usage:
        postprocessor = FallbackResultPostprocessor(convert_result)
        postprocessor.process()
    """

    def process(self):
        """Process with fallback mode by temporarily replacing metadata builder."""
        # Import the postprocessor module to access its namespace
        from hierarchical import postprocessor  # noqa: PLC0415

        # Save original class
        original_metadata_class = postprocessor.HierarchyBuilderMetadata

        try:
            # Replace with fallback version in postprocessor namespace
            postprocessor.HierarchyBuilderMetadata = FallbackHierarchyBuilderMetadata

            # Call parent process() which will now use fallback mode
            super().process()
        finally:
            # Always restore original class
            postprocessor.HierarchyBuilderMetadata = original_metadata_class
