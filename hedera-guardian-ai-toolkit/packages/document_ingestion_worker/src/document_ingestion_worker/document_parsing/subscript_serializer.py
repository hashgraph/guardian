"""
Custom Docling serializers for handling subscript/superscript text in DOCX documents.

This module provides serializers that properly concatenate text fragments containing
subscript and superscript characters without introducing unwanted separators.

The problem: Docling's default MarkdownFallbackSerializer joins GroupItem children
with "\\n\\n", which breaks inline content like "CO2" into "CO\\n\\n2\\n\\ne".

The solution: A custom fallback serializer that detects groups containing subscript/
superscript children and concatenates them without separators, converting text to
Unicode subscript/superscript characters using the unicodeit library.

Unicode conversion is preferred over LaTeX for embeddings because:
- Common formulas (CO₂, H₂O, m²) tokenize as single tokens in embedding models
- LaTeX notation adds extra tokens (_, ^, {, }) that dilute semantic meaning
- For search/retrieval, the difference is minimal but Unicode is more efficient

Example:
    >>> from document_ingestion_worker.document_parsing.subscript_serializer import (
    ...     ScriptAwareSerializerProvider,
    ...     SubscriptConfig,
    ... )
    >>> from docling.chunking import HybridChunker
    >>>
    >>> config = SubscriptConfig(convert_to_unicode=True)
    >>> provider = ScriptAwareSerializerProvider(config=config)
    >>> chunker = HybridChunker(tokenizer=tokenizer, serializer_provider=provider)
"""

from dataclasses import dataclass, field
from typing import Any

import unicodeit
from docling_core.transforms.chunker.hierarchical_chunker import (
    ChunkingDocSerializer,
    ChunkingSerializerProvider,
)
from docling_core.transforms.serializer.base import (
    BaseDocSerializer,
    SerializationResult,
)
from docling_core.transforms.serializer.common import create_ser_result
from docling_core.transforms.serializer.markdown import (
    MarkdownFallbackSerializer,
    MarkdownParams,
)
from docling_core.types.doc.base import ImageRefMode
from docling_core.types.doc.document import (
    DoclingDocument,
    GroupItem,
    NodeItem,
    TextItem,
)


@dataclass
class SubscriptConfig:
    """Configuration for subscript/superscript serialization.

    Attributes:
        convert_to_unicode: If True, convert subscript/superscript digits to Unicode
            equivalents (e.g., "2" -> "₂"). Default is True.
        concatenate_inline: If True, concatenate inline text fragments without
            separators. Set to False to revert to default Docling behavior. Default is True.
        enabled_script_types: Set of script types to handle. Valid values are "sub"
            for subscript and "super" for superscript. Default is {"sub", "super"}.
    """

    convert_to_unicode: bool = True
    concatenate_inline: bool = True
    enabled_script_types: set[str] = field(default_factory=lambda: {"sub", "super"})


class ScriptAwareFallbackSerializer(MarkdownFallbackSerializer):
    """
    Custom fallback serializer that handles subscript/superscript text fragments.

    This serializer extends MarkdownFallbackSerializer to:
    1. Detect groups containing subscript/superscript children
    2. Concatenate such fragments without separators (instead of joining with "\\n\\n")
    3. Optionally convert subscript/superscript digits to Unicode characters

    Args:
        config: Configuration for subscript handling. If None, uses default SubscriptConfig.
    """

    def __init__(self, config: SubscriptConfig | None = None) -> None:
        """Initialize the serializer with optional configuration."""
        super().__init__()
        self.config = config or SubscriptConfig()

    def _has_script_children(self, item: GroupItem, doc: DoclingDocument) -> bool:
        """Check if a group contains subscript or superscript children.

        Args:
            item: The GroupItem to check
            doc: The DoclingDocument for resolving references

        Returns:
            True if any child has subscript or superscript formatting
        """
        for child_ref in item.children:
            try:
                child = child_ref.resolve(doc)
                if isinstance(child, TextItem) and child.formatting:
                    script = child.formatting.script
                    # Script enum has value "sub", "super", or "baseline"
                    script_value = script.value if hasattr(script, "value") else str(script)
                    if script_value in self.config.enabled_script_types:
                        return True
            except (AttributeError, KeyError):
                # Skip children that can't be resolved or don't have formatting
                continue
        return False

    def _convert_to_unicode(self, text: str, script_type: str) -> str:
        """Convert text to Unicode subscript/superscript characters using unicodeit.

        Uses the unicodeit library which supports full LaTeX notation conversion,
        including digits, letters, and symbols (e.g., "2" -> "₂", "n" -> "ₙ").

        Args:
            text: The text to convert
            script_type: Either "sub" for subscript or "super" for superscript

        Returns:
            Text with characters converted to Unicode equivalents, or original text
            if script_type is not recognized
        """
        if script_type == "sub":
            # Convert to LaTeX subscript notation, then to Unicode
            # e.g., "2" -> "_{2}" -> "₂", "n" -> "_{n}" -> "ₙ"
            latex_notation = "_{" + text + "}"
        elif script_type == "super":
            # Convert to LaTeX superscript notation, then to Unicode
            # e.g., "2" -> "^{2}" -> "²", "n" -> "^{n}" -> "ⁿ"
            latex_notation = "^{" + text + "}"
        else:
            return text

        return unicodeit.replace(latex_notation)

    def _serialize_script_group(
        self,
        item: GroupItem,
        doc: DoclingDocument,
        doc_serializer: BaseDocSerializer,
        visited: set[str] | None = None,
        **kwargs: Any,
    ) -> SerializationResult:
        """Serialize a group containing subscript/superscript by concatenating without separators.

        Args:
            item: The GroupItem to serialize
            doc: The DoclingDocument
            doc_serializer: The document serializer for recursive serialization
            visited: Set of already visited item references
            **kwargs: Additional serialization parameters

        Returns:
            SerializationResult with concatenated text
        """
        my_visited = visited if visited is not None else set()
        text_parts: list[str] = []

        for child_ref in item.children:
            try:
                child = child_ref.resolve(doc)

                # Get the text content
                if isinstance(child, TextItem):
                    child_text = child.text or ""

                    # Check for script formatting
                    script_type = "baseline"
                    if child.formatting and child.formatting.script:
                        script = child.formatting.script
                        script_type = script.value if hasattr(script, "value") else str(script)

                    # Convert to unicode if enabled and it's a script type
                    if (
                        self.config.convert_to_unicode
                        and script_type in self.config.enabled_script_types
                    ):
                        child_text = self._convert_to_unicode(child_text, script_type)

                    text_parts.append(child_text)

                    # Mark as visited
                    if child.self_ref:
                        my_visited.add(child.self_ref)
                elif isinstance(child, GroupItem):
                    # Recursively serialize nested groups
                    nested_result = self.serialize(
                        item=child,
                        doc_serializer=doc_serializer,
                        doc=doc,
                        visited=my_visited,
                        **kwargs,
                    )
                    if nested_result.text:
                        text_parts.append(nested_result.text)
                else:
                    # For other types, use the doc_serializer
                    nested_result = doc_serializer.serialize(
                        item=child,
                        visited=my_visited,
                        **kwargs,
                    )
                    if nested_result.text:
                        text_parts.append(nested_result.text)

            except (AttributeError, KeyError):
                # Skip children that can't be resolved
                continue

        # Join without separators
        result_text = "".join(text_parts)
        return create_ser_result(text=result_text, span_source=[])

    def _serialize_group_children(
        self,
        item: GroupItem,
        doc: DoclingDocument,
        doc_serializer: BaseDocSerializer,
        visited: set[str] | None = None,
        separator: str = "\n\n",
        **kwargs: Any,
    ) -> SerializationResult:
        """Serialize a group's children with the specified separator.

        This method handles GroupItem serialization directly to avoid the infinite
        recursion that occurs when delegating to super().serialize() which calls
        doc_serializer.get_parts() -> serialize() -> fallback.serialize() in a loop.

        Args:
            item: The GroupItem to serialize
            doc: The DoclingDocument
            doc_serializer: The document serializer for recursive serialization
            visited: Set of already visited item references
            separator: Separator between children (default: double newline)
            **kwargs: Additional serialization parameters

        Returns:
            SerializationResult with children text joined by separator
        """
        my_visited = visited if visited is not None else set()
        text_parts: list[str] = []

        for child_ref in item.children:
            try:
                child = child_ref.resolve(doc)

                # Mark as visited to avoid cycles
                if hasattr(child, "self_ref") and child.self_ref:
                    if child.self_ref in my_visited:
                        continue
                    my_visited.add(child.self_ref)

                # Serialize the child
                if isinstance(child, TextItem):
                    # For text items, just use the text
                    child_text = child.text or ""
                    if child_text:
                        text_parts.append(child_text)
                elif isinstance(child, GroupItem):
                    # For nested groups, recursively serialize
                    nested_result = self.serialize(
                        item=child,
                        doc_serializer=doc_serializer,
                        doc=doc,
                        visited=my_visited,
                        **kwargs,
                    )
                    if nested_result.text:
                        text_parts.append(nested_result.text)
                else:
                    # For other types (tables, pictures), use doc_serializer
                    # but NOT through get_parts which creates the loop
                    nested_result = doc_serializer.serialize(
                        item=child,
                        visited=my_visited,
                        **kwargs,
                    )
                    if nested_result.text:
                        text_parts.append(nested_result.text)

            except (AttributeError, KeyError):
                # Skip children that can't be resolved
                continue

        # Join with the specified separator
        result_text = separator.join(text_parts)
        return create_ser_result(text=result_text, span_source=[])

    def serialize(
        self,
        *,
        item: NodeItem,
        doc_serializer: BaseDocSerializer,
        doc: DoclingDocument,
        visited: set[str] | None = None,
        **kwargs: Any,
    ) -> SerializationResult:
        """Serialize a document item, handling subscript/superscript specially.

        If the item is a group with script children and concatenate_inline is enabled,
        join children without separators. For other groups, join with standard separator.
        For non-group items, delegate to parent implementation.

        Note: We handle ALL GroupItems ourselves to avoid infinite recursion that
        occurs when super().serialize() calls doc_serializer.get_parts() which
        routes back to this fallback serializer for group children.

        Args:
            item: The NodeItem to serialize
            doc_serializer: The document serializer
            doc: The DoclingDocument
            visited: Set of already visited item references
            **kwargs: Additional serialization parameters

        Returns:
            SerializationResult with serialized text
        """
        # Handle all GroupItems ourselves to avoid infinite recursion
        if isinstance(item, GroupItem):
            # Check if this is a script group that needs special handling
            if self.config.concatenate_inline and self._has_script_children(item, doc):
                return self._serialize_script_group(
                    item, doc, doc_serializer, visited=visited, **kwargs
                )
            # For non-script groups, serialize children with standard separator
            return self._serialize_group_children(
                item, doc, doc_serializer, visited=visited, separator="\n\n", **kwargs
            )

        # For non-GroupItem items, delegate to parent
        # This is safe because parent won't route back to us for non-groups
        return super().serialize(
            item=item,
            doc_serializer=doc_serializer,
            doc=doc,
            visited=visited,
            **kwargs,
        )


class ScriptAwareChunkingDocSerializer(ChunkingDocSerializer):
    """ChunkingDocSerializer with script-aware fallback serializer.

    This serializer uses ScriptAwareFallbackSerializer to properly handle
    subscript/superscript text fragments during chunking.
    """

    def __init__(
        self,
        doc: DoclingDocument,
        config: SubscriptConfig | None = None,
        **kwargs: Any,
    ) -> None:
        """Initialize the serializer.

        Args:
            doc: The DoclingDocument to serialize
            config: Configuration for subscript handling
            **kwargs: Additional parameters passed to parent
        """
        # Create the script-aware fallback serializer
        fallback = ScriptAwareFallbackSerializer(config=config)

        # Initialize parent with our custom fallback
        # Disable include_formatting to prevent **bold** and *italic* markdown
        # which interferes with subscript concatenation
        super().__init__(
            doc=doc,
            fallback_serializer=fallback,
            params=MarkdownParams(
                image_mode=ImageRefMode.PLACEHOLDER,
                image_placeholder="",
                escape_underscores=False,
                escape_html=False,
                include_formatting=False,  # Disable bold/italic markdown
            ),
            **kwargs,
        )


class ScriptAwareSerializerProvider(ChunkingSerializerProvider):
    """
    Serializer provider that creates ChunkingDocSerializer with script-aware fallback.

    Use this provider with HybridChunker to properly handle subscript/superscript text:

        >>> provider = ScriptAwareSerializerProvider(config=SubscriptConfig())
        >>> chunker = HybridChunker(
        ...     tokenizer=tokenizer,
        ...     serializer_provider=provider,
        ... )

    Args:
        config: Configuration for subscript handling. If None, uses default SubscriptConfig.
    """

    def __init__(self, config: SubscriptConfig | None = None) -> None:
        """Initialize the provider with optional configuration."""
        self.config = config or SubscriptConfig()

    def get_serializer(self, doc: DoclingDocument) -> ScriptAwareChunkingDocSerializer:
        """Create a ChunkingDocSerializer with script-aware fallback serializer.

        Args:
            doc: The DoclingDocument to create serializer for

        Returns:
            ScriptAwareChunkingDocSerializer instance
        """
        return ScriptAwareChunkingDocSerializer(doc=doc, config=self.config)


def _convert_subscript_char(char: str) -> str:
    """Convert a single character to Unicode subscript using unicodeit.

    Args:
        char: Single character to convert

    Returns:
        Unicode subscript equivalent
    """
    return unicodeit.replace("_{" + char + "}")


def postprocess_chunk_text(text: str, config: SubscriptConfig | None = None) -> str:
    """Post-process chunk text to fix subscript/superscript patterns.

    Due to Docling's HybridChunker re-serializing individual doc items during
    chunk windowing, subscript patterns like "tCO\\n2\\ne" get introduced even
    when the initial serialization is correct.

    This function post-processes chunk text to:
    1. Convert known chemical formula patterns (CO2, H2O, etc.)
    2. Optionally convert subscript characters to Unicode using unicodeit

    Args:
        text: The chunk text to process
        config: Configuration for subscript handling. If None, uses default.

    Returns:
        Post-processed text with fixed subscript patterns.

    Example:
        >>> postprocess_chunk_text("tCO\\n2\\ne per year")
        'tCO₂e per year'
    """
    import re

    config = config or SubscriptConfig()

    if not config.concatenate_inline:
        return text

    # Common subscript patterns to fix
    # Pattern: text followed by newline + single digit/char + newline (subscript pattern)
    # Examples: tCO\n2\ne, CO\n2, H\n2\nO

    def replace_subscript(match: re.Match) -> str:
        """Replace subscript pattern with proper formatting."""
        prefix = match.group(1)
        subscript_char = match.group(2)
        suffix = match.group(3) if match.lastindex >= 3 else ""

        if config.convert_to_unicode:
            subscript_char = _convert_subscript_char(subscript_char)

        return f"{prefix}{subscript_char}{suffix}"

    # Pattern for subscript: word chars + newline + digit + newline + optional suffix
    # Handles: CO\n2\n (end of word) or CO\n2\ne (with suffix)
    text = re.sub(r"(\w+)\n(\d)\n(\w*)", replace_subscript, text)

    # Handle double-newline variant from table cells: tCO\n\n2\n\ne
    def replace_double_newline_subscript(match: re.Match) -> str:
        prefix = match.group(1)
        subscript_char = match.group(2)
        suffix = match.group(3) if match.lastindex >= 3 else ""

        if config.convert_to_unicode:
            subscript_char = _convert_subscript_char(subscript_char)

        return f"{prefix}{subscript_char}{suffix}"

    return re.sub(r"(\w+)\n\n(\d)\n\n(\w*)", replace_double_newline_subscript, text)
