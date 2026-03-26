"""
Document chunking using Docling's HybridChunker.

This module provides functionality to split DoclingDocuments into chunks
suitable for embedding and vector storage.
"""

from __future__ import annotations

import gc
import json
import logging
from pathlib import Path
from typing import TYPE_CHECKING, Any

from docling.chunking import HybridChunker
from docling.datamodel.document import DoclingDocument
from docling_core.transforms.chunker.hierarchical_chunker import ImageRefMode
from docling_core.transforms.chunker.tokenizer.huggingface import HuggingFaceTokenizer
from docling_core.transforms.serializer.base import BaseSerializerProvider
from docling_core.transforms.serializer.markdown import MarkdownDocSerializer, MarkdownParams
from transformers import AutoTokenizer

from .base import CleanupMixin
from .constants import (
    DEFAULT_EMBEDDING_MODEL,
    DEFAULT_MAX_TOKENS,
    DEFAULT_OVERLAP_TOKENS,
)
from .structure_extractor import (
    build_formula_ref_map,
    detect_content_types_from_doc_items,
    detect_formula_references,
    enhance_embedding_with_formula_numbers,
    extract_formulas_from_doc_items,
    extract_table_declarations_from_doc_items,
)
from .subscript_serializer import (
    ScriptAwareSerializerProvider,
    SubscriptConfig,
    postprocess_chunk_text,
)
from .table_processing import HybridChunkerAdapter, TableIsolatedHybridChunker

if TYPE_CHECKING:
    from docling_core.types.doc.document import DoclingDocument as DLDocument

logger = logging.getLogger(__name__)


def _sanitize_caption_references(doc: DoclingDocument) -> None:
    """Sanitize caption references in a DoclingDocument to prevent IndexError during serialization.

    Docling's PDF parser can produce documents with invalid caption references
    (e.g., captions pointing to non-existent indices after table removal).
    This function validates all caption references and removes invalid ones.

    Args:
        doc: DoclingDocument to sanitize (modified in-place)
    """
    if not hasattr(doc, "tables") or not doc.tables:
        return

    # Build valid reference sets for each collection
    valid_refs: dict[str, set[str]] = {}
    for collection_name in ["texts", "tables", "pictures", "key_value_items"]:
        collection = getattr(doc, collection_name, None)
        if collection is not None:
            # Safely get collection length (handle Mock objects in tests)
            try:
                collection_len = len(collection)
                valid_refs[collection_name] = {
                    f"#/{collection_name}/{i}" for i in range(collection_len)
                }
            except TypeError:
                # Collection doesn't support len() (e.g., Mock in tests)
                # Skip validation for this collection
                pass

    # Sanitize captions in all tables
    removed_count = 0
    # Safely iterate over tables (handle non-iterable Mock objects in tests)
    try:
        tables = list(doc.tables)
    except TypeError:
        # doc.tables is not iterable (e.g., Mock in tests)
        return

    for table in tables:
        if not hasattr(table, "captions") or not table.captions:
            continue

        # Filter out invalid caption references
        to_remove = []
        for i, cap_item in enumerate(table.captions):
            if not hasattr(cap_item, "cref"):
                continue

            cref = cap_item.cref
            # Extract collection name from reference (e.g., "#/texts/42" -> "texts")
            if cref.startswith("#/"):
                parts = cref.split("/")
                if len(parts) >= 2:
                    collection_name = parts[1]
                    # Check if reference is valid
                    if collection_name in valid_refs and cref not in valid_refs[collection_name]:
                        to_remove.append(i)
                        removed_count += 1
                        logger.debug(f"Removing invalid caption reference: {cref}")

        # Remove invalid captions in reverse order
        for i in reversed(to_remove):
            del table.captions[i]

    if removed_count > 0:
        logger.info(f"Sanitized {removed_count} invalid caption reference(s) before chunking")


class MarkdownTableSerializerProvider(BaseSerializerProvider):
    """Serializer provider that produces markdown tables for human-readable display.

    Unlike ChunkingSerializerProvider (which uses TripletTableSerializer for compact
    semantic output), this provider uses MarkdownDocSerializer which renders tables
    in standard markdown format with pipes and dashes.
    """

    def get_serializer(self, doc: DLDocument) -> MarkdownDocSerializer:
        """Get the markdown serializer for the document."""
        return MarkdownDocSerializer(
            doc=doc,
            params=MarkdownParams(
                image_mode=ImageRefMode.PLACEHOLDER,
                image_placeholder="",
                escape_underscores=False,
                escape_html=False,
            ),
        )


class DoclingChunker(CleanupMixin):
    """
    Chunker for DoclingDocuments using HybridChunker with tokenization.

    Splits documents into semantically meaningful chunks with configurable
    token limits and overlap.

    Supports special handling for subscript/superscript text (e.g., CO₂) through
    the subscript_config parameter. By default, subscript handling is enabled
    and converts digits to Unicode subscript characters.
    """

    def __init__(
        self,
        model_id: str = DEFAULT_EMBEDDING_MODEL,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        overlap_tokens: int = DEFAULT_OVERLAP_TOKENS,
        subscript_config: SubscriptConfig | None = None,
        isolate_tables: bool = False,
    ) -> None:
        """
        Initialize the document chunker.

        Args:
            model_id: Model identifier for tokenizer (default: DEFAULT_EMBEDDING_MODEL)
            max_tokens: Maximum tokens per chunk (default: 5000)
            overlap_tokens: Number of overlapping tokens between chunks (default: 0)
            subscript_config: Configuration for subscript/superscript handling.
                If None, uses default SubscriptConfig (enabled with Unicode conversion).
                Pass SubscriptConfig(concatenate_inline=False) to disable.
            isolate_tables: If True, each table becomes its own chunk. Tables act as
                barriers preventing cross-table merging of surrounding text.
        """
        self.model_id = model_id
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens
        self.subscript_config = subscript_config

        # Initialize tokenizer
        self.tokenizer: HuggingFaceTokenizer | None = HuggingFaceTokenizer(
            tokenizer=AutoTokenizer.from_pretrained(model_id),
            max_tokens=max_tokens,
            overlap_tokens=overlap_tokens,
        )

        # Determine serializer provider based on subscript config
        # Default: enable subscript handling with unicode conversion
        config = subscript_config if subscript_config is not None else SubscriptConfig()

        # Create base HybridChunker instances
        if config.concatenate_inline:
            # Use script-aware serializer for subscript/superscript handling
            serializer_provider = ScriptAwareSerializerProvider(config=config)
            base_chunker = HybridChunker(
                tokenizer=self.tokenizer,
                serializer_provider=serializer_provider,
            )
        else:
            # Use default Docling serializer (no subscript handling)
            base_chunker = HybridChunker(tokenizer=self.tokenizer)

        # Wrap in TableIsolatedHybridChunker if table isolation is enabled
        if isolate_tables:
            adapter = HybridChunkerAdapter(base_chunker)
            self.chunker: HybridChunker | TableIsolatedHybridChunker | None = (
                TableIsolatedHybridChunker(adapter)
            )
        else:
            self.chunker: HybridChunker | TableIsolatedHybridChunker | None = base_chunker

        # Secondary chunker for display (markdown tables)
        # Uses MarkdownTableSerializerProvider to produce human-readable markdown tables
        display_base_chunker = HybridChunker(
            tokenizer=self.tokenizer,
            serializer_provider=MarkdownTableSerializerProvider(),
        )

        if isolate_tables:
            display_adapter = HybridChunkerAdapter(display_base_chunker)
            self.display_chunker: HybridChunker | TableIsolatedHybridChunker | None = (
                TableIsolatedHybridChunker(display_adapter)
            )
        else:
            self.display_chunker: HybridChunker | TableIsolatedHybridChunker | None = (
                display_base_chunker
            )

        # Track cleanup state to prevent reuse after cleanup
        self._is_cleaned = False

    def _do_cleanup(self) -> None:
        """Release resources held by the chunker.

        Called by CleanupMixin.cleanup() to free memory. The chunker holds
        HuggingFace tokenizers that can consume significant memory.
        """
        if self.tokenizer is not None:
            del self.tokenizer
            self.tokenizer = None
        if self.chunker is not None:
            del self.chunker
            self.chunker = None
        if self.display_chunker is not None:
            del self.display_chunker
            self.display_chunker = None

        # Force garbage collection for consistency with other cleanup methods
        # (e.g., PdfParser, SuryaFormulaEnrichmentModel)
        gc.collect()
        logger.debug("DoclingChunker resources released")

    def _extract_chunk_metadata(self, chunk) -> dict[str, Any]:
        """Extract metadata from chunk.

        Extracts only the fields needed for chunk metadata:
        - headings: Used for hierarchical context in embedding and filtering
        - doc_items[].prov[].page_no: Used for page number display in search results

        Args:
            chunk: Docling BaseChunk object with meta attribute

        Returns:
            Dict with structure: {"meta": {"headings": [...], "doc_items": [...]}}
        """
        meta: dict[str, Any] = {}

        if not hasattr(chunk, "meta") or chunk.meta is None:
            return {"meta": meta}

        # Extract headings (list of strings)
        if hasattr(chunk.meta, "headings"):
            headings = chunk.meta.headings
            # Handle both list and tuple, guard against Mock objects
            if isinstance(headings, list | tuple):
                meta["headings"] = list(headings)

        # Extract doc_items with provenance (page numbers)
        if hasattr(chunk.meta, "doc_items"):
            raw_doc_items = chunk.meta.doc_items
            # Guard against Mock objects - must be iterable sequence
            if not isinstance(raw_doc_items, list | tuple):
                return {"meta": meta}

            doc_items = []
            for item in raw_doc_items:
                item_meta: dict[str, Any] = {}

                # Extract provenance info (page numbers, bounding boxes)
                if hasattr(item, "prov") and isinstance(item.prov, list | tuple):
                    prov_list = []
                    for p in item.prov:
                        prov_data: dict[str, Any] = {}
                        if hasattr(p, "page_no") and p.page_no is not None:
                            prov_data["page_no"] = p.page_no
                        if hasattr(p, "bbox") and p.bbox:
                            prov_data["bbox"] = {
                                "l": p.bbox.l,
                                "t": p.bbox.t,
                                "r": p.bbox.r,
                                "b": p.bbox.b,
                            }
                        if prov_data:
                            prov_list.append(prov_data)
                    if prov_list:
                        item_meta["prov"] = prov_list

                # Extract label if available (used for debugging)
                if hasattr(item, "label") and item.label:
                    label = item.label
                    item_meta["label"] = label.value if hasattr(label, "value") else str(label)

                if item_meta:
                    doc_items.append(item_meta)

            if doc_items:
                meta["doc_items"] = doc_items

        return {"meta": meta}

    def _resolve_doc_item_refs(
        self, doc_items: list[Any], doc: DoclingDocument
    ) -> list[dict[str, Any]]:
        """
        Resolve self_ref in DocItems to get orig/text fields from doc.texts.

        Docling's chunker returns DocItems with self_ref pointing to doc.texts,
        but without the orig/text fields. This method looks up each item and
        returns serializable dicts with the data needed for formula extraction.

        Args:
            doc_items: List of DocItem objects from chunk.meta.doc_items
            doc: The original DoclingDocument to resolve references from

        Returns:
            List of dicts with self_ref, label, orig, and text fields (JSON serializable)
        """
        resolved = []

        for item in doc_items:
            # Get the self_ref to look up in doc.texts
            self_ref = getattr(item, "self_ref", None)

            if self_ref and isinstance(self_ref, str) and self_ref.startswith("#/texts/"):
                try:
                    idx = int(self_ref.split("/")[-1])
                    if 0 <= idx < len(doc.texts):
                        # Get the actual item from doc.texts and convert to dict
                        actual_item = doc.texts[idx]
                        label = getattr(actual_item, "label", None)
                        label_value = label.value if hasattr(label, "value") else str(label)
                        resolved.append(
                            {
                                "self_ref": self_ref,
                                "label": label_value,
                                "orig": getattr(actual_item, "orig", "") or "",
                                "text": getattr(actual_item, "text", "") or "",
                            }
                        )
                        continue
                except (ValueError, IndexError, TypeError):
                    pass

            # Fallback: convert original item to dict
            label = getattr(item, "label", None)
            label_value = label.value if hasattr(label, "value") else str(label) if label else None
            resolved.append(
                {
                    "self_ref": getattr(item, "self_ref", None),
                    "label": label_value,
                    "orig": getattr(item, "orig", "") or "",
                    "text": getattr(item, "text", "") or "",
                }
            )

        return resolved

    def chunk_document(self, doc: DoclingDocument) -> list[dict[str, Any]]:
        """
        Chunk a DoclingDocument into smaller pieces.

        Uses markdown serialization for consistent content between display and embedding.
        Both text and embedding_text use the same markdown format to ensure content alignment.

        Args:
            doc: DoclingDocument to chunk

        Returns:
            List of chunk dictionaries with text, embedding_text, and metadata

        Raises:
            RuntimeError: If the chunker has been cleaned up
        """
        self._check_not_cleaned("chunk_document")

        # Sanitize caption references to prevent IndexError during chunking
        # (Docling's PDF parser can produce invalid caption references)
        _sanitize_caption_references(doc)

        # Use display_chunker (markdown) for consistent content
        chunks = list(self.display_chunker.chunk(doc))

        results = []

        # Determine subscript config for post-processing
        config = self.subscript_config if self.subscript_config is not None else SubscriptConfig()

        for i, chunk in enumerate(chunks, start=1):
            # Use same text for both display and embedding (markdown format)
            raw_text = self.display_chunker.contextualize(chunk)
            text = postprocess_chunk_text(raw_text, config)

            # Calculate token count
            token_count = len(self.tokenizer.tokenizer.encode(text))

            # Extract metadata from chunk safely (avoids RecursionError on deeply nested docs)
            # Store raw doc_items for formula extraction in prepare_for_embedding
            # Resolve self_ref to get orig/text fields from doc.texts
            raw_doc_items = None
            if hasattr(chunk, "meta") and chunk.meta and hasattr(chunk.meta, "doc_items"):
                doc_items = chunk.meta.doc_items
                if isinstance(doc_items, list | tuple):
                    raw_doc_items = self._resolve_doc_item_refs(doc_items, doc)

            chunk_data = {
                "chunk_id": i,
                "text": text,  # Markdown format (for display)
                "embedding_text": text,  # Same as text (for embedding)
                "token_count": token_count,
                "metadata": self._extract_chunk_metadata(chunk),
                "_raw_doc_items": raw_doc_items,  # For formula extraction
            }

            results.append(chunk_data)

        return results

    def prepare_for_embedding(
        self,
        chunks: list[dict[str, Any]],
        source_document: str | None = None,
        valid_declarations: set[str] | None = None,
        formula_ref_map: dict[str, tuple[str, str, int | None]] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Prepare chunks for embedding and vector storage.

        Converts chunks to the format expected by VectorStore:
        - embedding_input: text to embed (compact format for embeddings)
        - display_text: markdown tables for human-readable display
        - content: structured metadata with heading hierarchy
        - source: source document identifier

        Headings are extracted from Docling metadata to provide hierarchical context
        for filtering and display in search results.

        Args:
            chunks: List of chunk dictionaries from chunk_document()
            source_document: Optional source document identifier
            valid_declarations: Optional set of valid formula identifiers from the document.
                When provided, formula references are validated against this set to
                filter out false positives (e.g., decimal numbers like 10.24).
            formula_ref_map: Optional mapping from formula self_ref to (number, latex, page_no).
                Built using build_formula_ref_map() to include bbox fallback detection.
                When provided, used for chunk-level formula declarations.

        Returns:
            List of documents ready for vector store ingestion
        """
        documents = []

        for chunk in chunks:
            # Extract heading from metadata if available (use LAST heading for display)
            heading = ""
            headings = []
            if "metadata" in chunk and "meta" in chunk["metadata"]:
                meta = chunk["metadata"]["meta"]
                if "headings" in meta and len(meta["headings"]) > 0:
                    headings = meta["headings"]
                    heading = meta["headings"][-1]  # Use last heading for display

            # Extract page number if available
            page_no = None
            if "metadata" in chunk and "meta" in chunk["metadata"]:
                meta = chunk["metadata"]["meta"]
                if "doc_items" in meta and len(meta["doc_items"]) > 0:
                    doc_item = meta["doc_items"][0]
                    if "prov" in doc_item and len(doc_item["prov"]) > 0:
                        page_no = doc_item["prov"][0].get("page_no")

            # Use embedding_text for embedding input (compact format), fall back to text
            embedding_input = chunk.get("embedding_text", chunk["text"])

            # Display text is the markdown version
            display_text = chunk["text"]

            # Extract raw doc_items for content type detection
            raw_doc_items = chunk.get("_raw_doc_items", [])

            # Detect content types (formula detection here is for items, not declarations)
            _, has_table, has_figure = detect_content_types_from_doc_items(raw_doc_items or [])

            # Extract table declarations from captions/table items
            tables_declaration = extract_table_declarations_from_doc_items(raw_doc_items or [])

            # Extract formula metadata from raw doc_items
            # Use formula_ref_map if provided (includes bbox fallback detection)
            formulas_declaration: list[str] = []
            formula_map: dict[str, str] = {}

            if formula_ref_map and raw_doc_items:
                # Use the pre-built map to look up formula numbers by self_ref
                # raw_doc_items contains dicts with self_ref, label, orig, text
                processed_refs: set[str] = set()
                for item in raw_doc_items:
                    self_ref = (
                        item.get("self_ref")
                        if isinstance(item, dict)
                        else getattr(item, "self_ref", None)
                    )
                    if self_ref and self_ref in formula_ref_map:
                        num, latex, _formula_page = formula_ref_map[self_ref]
                        if num not in formulas_declaration:
                            formulas_declaration.append(num)
                        formula_map[num] = latex
                        processed_refs.add(self_ref)

                # Add formulas on chunk's page that weren't in raw_doc_items
                # (e.g., formulas inside pictures like Formula 66)
                if page_no is not None:
                    for self_ref, (num, latex, formula_page) in formula_ref_map.items():
                        if self_ref in processed_refs:
                            continue
                        if formula_page == page_no and num not in formulas_declaration:
                            formulas_declaration.append(num)
                            formula_map[num] = latex
            else:
                # Fallback: extract from items directly (no bbox detection)
                formulas_declaration, formula_map = extract_formulas_from_doc_items(
                    raw_doc_items or []
                )

            # Enhance embedding input with formula numbers
            embedding_input = enhance_embedding_with_formula_numbers(embedding_input, formula_map)

            # Detect formula references in the embedding text
            # Filter by valid declarations if provided (eliminates false positives)
            formulas_references = detect_formula_references(embedding_input, valid_declarations)

            # Extract document name (stem without extension) and source
            source = source_document or chunk.get("source", "unknown")
            document_name = Path(source).stem if source != "unknown" else "unknown"

            # Derive has_formula from formulas_declaration (more accurate than label detection)
            has_formula = len(formulas_declaration) > 0

            # Prepare document for vector store
            # - embedding_input: compact format for embeddings (what gets vectorized)
            # - display_text: markdown format for display (stored in document_chunk)
            doc = {
                "embedding_input": embedding_input,
                "display_text": display_text,
                "content": {
                    "chunk_id": chunk["chunk_id"],
                    "heading": heading,
                    "headings": headings,
                    "page_no": page_no,
                    "token_count": chunk["token_count"],
                    "formulas_declaration": formulas_declaration,
                    "formulas_references": formulas_references,
                    "has_formula": has_formula,
                    "has_table": has_table,
                    "has_figure": has_figure,
                    "tables_declaration": tables_declaration,
                },
                "source": source,
                "document_name": document_name,
            }

            documents.append(doc)

        return documents

    def chunk_and_prepare(
        self, doc: DoclingDocument, source_document: str | None = None
    ) -> list[dict[str, Any]]:
        """
        Convenience method to chunk a document and prepare it for embedding.

        Builds a formula reference map (including bbox fallback detection) and uses it
        for both chunk-level declarations and reference validation.

        Args:
            doc: DoclingDocument to process
            source_document: Optional source document identifier

        Returns:
            List of documents ready for vector store ingestion
        """
        # Build formula ref map (includes bbox fallback for cases like formula 65)
        formula_ref_map = build_formula_ref_map(doc)

        # Extract valid declarations from the map for reference validation
        # formula_ref_map values are tuples of (num, latex, page_no)
        valid_declarations = {num for num, _latex, _page in formula_ref_map.values()}

        chunks = self.chunk_document(doc)
        return self.prepare_for_embedding(
            chunks, source_document, valid_declarations, formula_ref_map
        )

    @staticmethod
    def save_chunks(chunks: list[dict[str, Any]], output_dir: str | Path) -> dict[str, Any]:
        """
        Save chunks to individual JSON files.

        Args:
            chunks: List of chunk dictionaries
            output_dir: Directory where chunks should be saved

        Returns:
            Dictionary with save statistics
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Clear old chunk files
        for old_file in output_dir.glob("chunk_*.json"):
            old_file.unlink()

        # Save each chunk
        for chunk in chunks:
            chunk_id = chunk.get("chunk_id", 0)
            output_file = output_dir / f"chunk_{chunk_id:04d}.json"

            with output_file.open("w", encoding="utf-8") as f:
                json.dump(chunk, f, ensure_ascii=False, indent=2)

        return {
            "chunks_saved": len(chunks),
            "output_dir": str(output_dir),
            "success": True,
        }
