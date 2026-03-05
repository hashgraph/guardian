"""
Table processing utilities for Docling document ingestion.

Provides three features:
1. TableIsolatedHybridChunker - prevents table chunks from being merged,
   keeping each table as a separate chunk while allowing normal text merging.
2. detect_and_merge_split_tables - detects and merges tables split across
   PDF page boundaries (Type 1: both parts recognized as TABLE objects).
3. recover_type2_split_tables - recovers table continuations that were
   misclassified as text/section_header elements (Type 2).
"""

import logging
from abc import ABC, abstractmethod
from typing import Any

from docling.chunking import HybridChunker
from docling.datamodel.document import DoclingDocument
from docling_core.transforms.chunker import DocChunk
from docling_core.types.doc.labels import DocItemLabel
from pydantic import ValidationError

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class TableMergeError(Exception):
    """Exception raised when merging split tables fails.

    Stores context about the failed merge including table indices and the
    original exception that caused the failure.

    Attributes:
        ending_idx: Index of the ending table (source of merge)
        continuation_idx: Index of the continuation table (target of merge)
        original_exception: The underlying exception that caused the failure
        message: Human-readable error message
    """

    def __init__(
        self,
        ending_idx: int,
        continuation_idx: int,
        original_exception: Exception,
        message: str | None = None,
    ) -> None:
        """Initialize TableMergeError with context.

        Args:
            ending_idx: Index of the ending table
            continuation_idx: Index of the continuation table
            original_exception: The exception that caused the merge to fail
            message: Optional custom message (defaults to generic message)
        """
        self.ending_idx = ending_idx
        self.continuation_idx = continuation_idx
        self.original_exception = original_exception

        if message is None:
            message = (
                f"Failed to merge table pair: ending_idx={ending_idx}, "
                f"continuation_idx={continuation_idx}, "
                f"cause={type(original_exception).__name__}: {original_exception}"
            )

        self.message = message
        super().__init__(message)

    def __repr__(self) -> str:
        """Return detailed representation for debugging."""
        return (
            f"TableMergeError(ending_idx={self.ending_idx}, "
            f"continuation_idx={self.continuation_idx}, "
            f"original_exception={self.original_exception!r})"
        )


# ---------------------------------------------------------------------------
# ABC interface for chunker composition
# ---------------------------------------------------------------------------


class ChunkerABC(ABC):
    """Abstract base class for chunker implementations.

    Defines the interface for chunk merging operations. Allows TableIsolatedHybridChunker
    to depend on this interface instead of directly inheriting from external HybridChunker,
    improving testability and reducing coupling.
    """

    @abstractmethod
    def _merge_chunks_with_matching_metadata(self, chunks: list[DocChunk]) -> list[DocChunk]:
        """Merge chunks that have matching metadata.

        Args:
            chunks: List of chunks to merge

        Returns:
            List of merged chunks
        """


class HybridChunkerAdapter(ChunkerABC):
    """Adapter that wraps external HybridChunker to implement ChunkerABC interface.

    Provides dependency injection for TableIsolatedHybridChunker by exposing
    only the merge method through the ChunkerABC interface.
    """

    def __init__(self, hybrid_chunker: HybridChunker) -> None:
        """Initialize adapter with an external HybridChunker instance.

        Args:
            hybrid_chunker: External HybridChunker instance to wrap
        """
        self._chunker = hybrid_chunker

    def _merge_chunks_with_matching_metadata(self, chunks: list[DocChunk]) -> list[DocChunk]:
        """Delegate merge operation to wrapped HybridChunker.

        Args:
            chunks: List of chunks to merge

        Returns:
            List of merged chunks from the wrapped chunker
        """
        return self._chunker._merge_chunks_with_matching_metadata(chunks)


class TableIsolatedHybridChunker:
    """Chunker that keeps each table as a separate chunk.

    Tables act as barriers: text chunks before and after a table are merged
    independently, but neither merges with the table itself. This prevents
    HybridChunker's merge_peers logic from combining multiple tables that
    share the same heading into a single oversized chunk.

    Uses a partition-and-delegate strategy: partitions the chunk list into
    groups separated by table chunks, delegates each non-table group to
    the base chunker's merge logic, and interleaves table chunks back in.

    Uses composition with ChunkerABC for better testability and dependency injection.
    """

    def __init__(self, base_chunker: ChunkerABC) -> None:
        """Initialize with a base chunker for delegation.

        Args:
            base_chunker: ChunkerABC implementation (e.g., HybridChunkerAdapter)
                to delegate non-table chunk merging. If it's an adapter, we also
                extract the wrapped HybridChunker for public API delegation.
        """
        self._base_chunker = base_chunker

        # Extract the actual HybridChunker instance for public API delegation
        # If base_chunker is a HybridChunkerAdapter, get the wrapped _chunker
        if isinstance(base_chunker, HybridChunkerAdapter):
            self._hybrid_chunker = base_chunker._chunker

            # Save the original merge method before binding ours
            # This prevents infinite recursion when we delegate to the original
            self._original_merge = self._hybrid_chunker._merge_chunks_with_matching_metadata

            # Bind our merge method to the HybridChunker instance so internal
            # chunking operations use our table isolation logic
            self._hybrid_chunker._merge_chunks_with_matching_metadata = (
                self._merge_chunks_with_matching_metadata
            )
        else:
            # For testing: if we're passed a mock ChunkerABC, store it for delegation
            self._hybrid_chunker = None
            self._original_merge = None

    def chunk(self, doc):
        """Chunk a document into smaller pieces with table isolation.

        Delegates to the underlying HybridChunker, which will use our
        overridden _merge_chunks_with_matching_metadata for table isolation.

        Args:
            doc: DoclingDocument to chunk

        Returns:
            Iterator of DocChunk objects

        Raises:
            RuntimeError: If no HybridChunker instance is available
        """
        if self._hybrid_chunker is None:
            msg = "TableIsolatedHybridChunker requires HybridChunkerAdapter with HybridChunker"
            raise RuntimeError(msg)
        return self._hybrid_chunker.chunk(doc)

    def contextualize(self, chunk):
        """Generate contextual text for a chunk.

        Delegates to the underlying HybridChunker.

        Args:
            chunk: DocChunk to contextualize

        Returns:
            String with contextualized text

        Raises:
            RuntimeError: If no HybridChunker instance is available
        """
        if self._hybrid_chunker is None:
            msg = "TableIsolatedHybridChunker requires HybridChunkerAdapter with HybridChunker"
            raise RuntimeError(msg)
        return self._hybrid_chunker.contextualize(chunk)

    @staticmethod
    def _chunk_has_table(chunk: DocChunk) -> bool:
        """Check if a chunk contains a table document item."""
        if not chunk.meta or not chunk.meta.doc_items:
            return False
        return any(item.label == DocItemLabel.TABLE for item in chunk.meta.doc_items)

    def _merge_chunks_with_matching_metadata(self, chunks: list[DocChunk]) -> list[DocChunk]:
        """Prevent merging of table chunks using partition-and-delegate strategy.

        Partitions chunks into groups separated by table chunks, delegates
        each non-table group to the original HybridChunker merge method,
        and interleaves the isolated table chunks back in.

        Args:
            chunks: List of chunks to merge

        Returns:
            List with table chunks isolated and non-table chunks merged
        """
        output: list[DocChunk] = []
        non_table_group: list[DocChunk] = []

        for chunk in chunks:
            if self._chunk_has_table(chunk):
                # Flush accumulated non-table group through original merge method
                if non_table_group:
                    # Use original merge if available (real HybridChunker), else adapter
                    if self._original_merge is not None:
                        output.extend(self._original_merge(non_table_group))
                    else:
                        output.extend(
                            self._base_chunker._merge_chunks_with_matching_metadata(non_table_group)
                        )
                    non_table_group = []
                # Table chunk emitted directly - never merged
                output.append(chunk)
            else:
                non_table_group.append(chunk)

        # Flush remaining non-table group
        if non_table_group:
            # Use original merge if available (real HybridChunker), else adapter
            if self._original_merge is not None:
                output.extend(self._original_merge(non_table_group))
            else:
                output.extend(
                    self._base_chunker._merge_chunks_with_matching_metadata(non_table_group)
                )

        return output


# ---------------------------------------------------------------------------
# Split table detection and merging (Type 1 only)
# ---------------------------------------------------------------------------


def _validate_document(doc_dict: dict[str, Any], context: str) -> None:
    """Validate document structure using DoclingDocument model.

    Args:
        doc_dict: Document dictionary to validate
        context: Context string for error message (e.g., "input", "output")

    Raises:
        ValidationError: If document structure is invalid
    """
    try:
        DoclingDocument.model_validate(doc_dict)
    except ValidationError as e:
        logger.error("Document validation failed (%s): %s", context, e)
        raise


def _extract_table_bbox(table: dict[str, Any]) -> dict[str, Any] | None:
    """Extract bbox and page_no from a table dict's provenance."""
    prov = table.get("prov", [])
    if not prov:
        return None
    first_prov = prov[0]
    bbox = first_prov.get("bbox")
    page_no = first_prov.get("page_no")
    if bbox is None or page_no is None:
        return None
    return {"page_no": page_no, "bbox": bbox}


def detect_and_merge_split_tables(
    doc_dict: dict[str, Any],
    bottom_threshold: float = 120.0,
    top_threshold: float = 700.0,
    validate: bool = True,
) -> tuple[dict[str, Any], int]:
    """Detect Type 1 split tables and merge them.

    Type 1 splits: both the ending part and the continuation are recognized
    as separate TABLE objects. Detected by bbox position analysis:
    - Ending table's bbox bottom < bottom_threshold (near page bottom)
    - Continuation table's bbox top > top_threshold (near page top)
    - Continuation is on the immediately following page

    Merges continuation table's cells into the ending table and removes
    the continuation from the document.

    Args:
        doc_dict: DoclingDocument exported as dictionary (modified in place)
        bottom_threshold: Max bbox.b for a table to be considered "near bottom"
        top_threshold: Min bbox.t for a table to be considered "near top"
        validate: If True, validate input/output with DoclingDocument model (default: True).
            Should be enabled in production to catch corruption at function boundaries.

    Returns:
        Tuple of (modified doc_dict, number of merges performed)

    Raises:
        ValidationError: If input or output document fails validation (when validate=True)
    """
    # Validate input document structure
    if validate:
        _validate_document(doc_dict, "detect_and_merge_split_tables input")

    tables = doc_dict.get("tables", [])
    if len(tables) < 2:
        # Validate output before returning (no changes made)
        if validate:
            _validate_document(doc_dict, "detect_and_merge_split_tables output (no tables)")
        return doc_dict, 0

    # Build table info: (index, page_no, bbox, num_cols)
    table_info: list[tuple[int, int, dict[str, Any], int]] = []
    for i, table in enumerate(tables):
        info = _extract_table_bbox(table)
        if info is not None:
            num_cols = table.get("data", {}).get("num_cols", 0)
            table_info.append((i, info["page_no"], info["bbox"], num_cols))

    if len(table_info) < 2:
        # Validate output before returning (no changes made)
        if validate:
            _validate_document(
                doc_dict, "detect_and_merge_split_tables output (insufficient table info)"
            )
        return doc_dict, 0

    # Sort by page_no, then by top (descending) for same-page ordering
    table_info.sort(key=lambda x: (x[1], -x[2].get("t", 0)))

    # Create lookup map for fast page_no access (avoids redundant _extract_table_bbox calls)
    table_page_map = {idx: page_no for idx, page_no, bbox, num_cols in table_info}

    # Detect Type 1 split candidates
    # candidate = (ending_table_idx, continuation_table_idx)
    candidates: list[tuple[int, int]] = []
    used_continuations: set[int] = set()  # Track used continuation tables for one-to-one pairing

    for pos, (idx, page_no, bbox, num_cols) in enumerate(table_info):
        b_val = bbox.get("b", 999)
        if b_val >= bottom_threshold:
            continue

        # Look for first table on next page
        for next_pos in range(pos + 1, len(table_info)):
            next_idx, next_page, next_bbox, next_num_cols = table_info[next_pos]
            if next_page == page_no:
                continue  # Same page, skip
            if next_page > page_no + 1:
                break  # Skipped a page, no continuation

            # Found a table on the next page
            t_val = next_bbox.get("t", 0)
            # Check thresholds, column match, and one-to-one pairing
            if (
                t_val > top_threshold
                and num_cols == next_num_cols
                and next_idx not in used_continuations
            ):
                candidates.append((idx, next_idx))
                used_continuations.add(next_idx)
            break  # Only check the first table on next page

    if not candidates:
        # Validate output before returning (no changes made)
        if validate:
            _validate_document(doc_dict, "detect_and_merge_split_tables output (no candidates)")
        return doc_dict, 0

    # Merge candidates (process in reverse to preserve indices during removal)
    merge_count = 0
    removal_indices: set[int] = set()

    for ending_idx, continuation_idx in reversed(candidates):
        try:
            ending_table = tables[ending_idx]
            continuation_table = tables[continuation_idx]

            ending_data = ending_table.get("data", {})
            continuation_data = continuation_table.get("data", {})

            ending_cells = ending_data.get("table_cells", [])
            continuation_cells = continuation_data.get("table_cells", [])
            ending_num_rows = ending_data.get("num_rows", 0)

            if not continuation_cells:
                continue

            # Offset continuation row indices
            for cell in continuation_cells:
                cell["start_row_offset_idx"] = cell.get("start_row_offset_idx", 0) + ending_num_rows
                cell["end_row_offset_idx"] = cell.get("end_row_offset_idx", 0) + ending_num_rows
                # Update row_span if present
                if "row_span" in cell:
                    pass  # row_span is a count, not an index - leave as-is

            # Append continuation cells to ending table
            ending_data["table_cells"] = ending_cells + continuation_cells
            ending_data["num_rows"] = ending_num_rows + continuation_data.get("num_rows", 0)

            # Mark continuation table for removal
            removal_indices.add(continuation_idx)
            merge_count += 1

            # Use pre-extracted page info to avoid redundant calls and None dereference
            ending_page = table_page_map.get(ending_idx, "?")
            continuation_page = table_page_map.get(continuation_idx, "?")
            logger.info(
                f"Merged split table: table[{ending_idx}] (page {ending_page}) "
                f"<- table[{continuation_idx}] (page {continuation_page}), "
                f"combined rows: {ending_data['num_rows']}"
            )
        except (KeyError, IndexError, TypeError, AttributeError) as e:
            # TableMergeError wraps the error with context (indices and original exception)
            # We log structured context instead of raising to allow processing of other candidates
            # Extract context for structured logging
            ending_page = table_page_map.get(ending_idx, "unknown")
            continuation_page = table_page_map.get(continuation_idx, "unknown")

            # Extract bbox info if available for additional context
            ending_info = (
                _extract_table_bbox(tables[ending_idx]) if ending_idx < len(tables) else None
            )
            continuation_info = (
                _extract_table_bbox(tables[continuation_idx])
                if continuation_idx < len(tables)
                else None
            )

            # Log with structured context
            logger.warning(
                "Table merge failed: ending_idx=%d (page %s), continuation_idx=%d (page %s), "
                "error_type=%s, error=%s, ending_bbox=%s, continuation_bbox=%s",
                ending_idx,
                ending_page,
                continuation_idx,
                continuation_page,
                type(e).__name__,
                str(e),
                ending_info.get("bbox") if ending_info else None,
                continuation_info.get("bbox") if continuation_info else None,
                exc_info=False,  # Don't include full traceback for expected errors
            )

            # Continue processing other candidates
            continue

    # Remove continuation tables (reverse order to preserve indices)
    if removal_indices:
        _remove_tables_from_doc(doc_dict, removal_indices)

    # Validate output document structure after all modifications
    if validate:
        _validate_document(doc_dict, "detect_and_merge_split_tables output (after merges)")

    return doc_dict, merge_count


def _remove_tables_from_doc(doc_dict: dict[str, Any], removal_indices: set[int]) -> None:
    """Remove tables at given indices and clean up document references.

    Updates self_ref, parent, and children references to account for
    shifted indices after removal.
    """
    tables = doc_dict.get("tables", [])
    if not removal_indices:
        return

    # Build ref set for removed tables
    removed_refs = set()
    for idx in removal_indices:
        if idx < len(tables):
            ref = tables[idx].get("self_ref")
            if ref:
                removed_refs.add(ref)

    # Remove tables in reverse order
    for idx in sorted(removal_indices, reverse=True):
        if idx < len(tables):
            del tables[idx]

    # Rebuild self_ref for remaining tables
    for i, table in enumerate(tables):
        table["self_ref"] = f"#/tables/{i}"

    # Build old-to-new ref mapping
    ref_map: dict[str, str] = {}
    new_idx = 0
    old_tables_count = len(tables) + len(removal_indices)
    for old_idx in range(old_tables_count):
        old_ref = f"#/tables/{old_idx}"
        if old_idx in removal_indices:
            continue
        new_ref = f"#/tables/{new_idx}"
        if old_ref != new_ref:
            ref_map[old_ref] = new_ref
        new_idx += 1

    # Update references in body, groups, and other collections
    _update_refs_in_collection(doc_dict.get("body", {}).get("children", []), ref_map, removed_refs)
    for group in doc_dict.get("groups", []):
        _update_refs_in_collection(group.get("children", []), ref_map, removed_refs)
        _update_parent_ref(group, ref_map, removed_refs)
    for text in doc_dict.get("texts", []):
        _update_refs_in_collection(text.get("children", []), ref_map, removed_refs)
        _update_parent_ref(text, ref_map, removed_refs)
    for picture in doc_dict.get("pictures", []):
        _update_refs_in_collection(picture.get("children", []), ref_map, removed_refs)
        _update_parent_ref(picture, ref_map, removed_refs)
    for table in tables:
        _update_refs_in_collection(table.get("children", []), ref_map, removed_refs)
        _update_parent_ref(table, ref_map, removed_refs)
        # Update caption references (critical: prevents IndexError during serialization)
        _update_caption_refs(table, ref_map, removed_refs)


def _update_refs_in_collection(
    children: list[dict[str, Any]],
    ref_map: dict[str, str],
    removed_refs: set[str],
) -> None:
    """Update $ref references in a children list, removing references to deleted items."""
    to_remove = []
    for i, child in enumerate(children):
        ref = child.get("$ref", "")
        if ref in removed_refs:
            to_remove.append(i)
        elif ref in ref_map:
            child["$ref"] = ref_map[ref]
    for i in reversed(to_remove):
        del children[i]


def _update_parent_ref(
    item: dict[str, Any],
    ref_map: dict[str, str],
    removed_refs: set[str],
) -> None:
    """Update parent, next, and prev $refs, clearing dangling references to removed items.

    Args:
        item: Item to update (group, text, picture, or table)
        ref_map: Mapping of old refs to new refs (after removal and index shift)
        removed_refs: Set of refs that were removed
    """
    # Handle parent reference
    parent = item.get("parent")
    if parent and isinstance(parent, dict):
        ref = parent.get("$ref", "")
        if ref in removed_refs:
            # Parent was removed - clear the reference
            item["parent"] = None
        elif ref in ref_map:
            # Parent was remapped - update to new ref
            parent["$ref"] = ref_map[ref]

    # Handle next reference
    next_ref = item.get("next")
    if next_ref and isinstance(next_ref, dict):
        ref = next_ref.get("$ref", "")
        if ref in removed_refs:
            # Next item was removed - clear the reference
            item["next"] = None
        elif ref in ref_map:
            # Next item was remapped - update to new ref
            next_ref["$ref"] = ref_map[ref]

    # Handle prev reference
    prev_ref = item.get("prev")
    if prev_ref and isinstance(prev_ref, dict):
        ref = prev_ref.get("$ref", "")
        if ref in removed_refs:
            # Previous item was removed - clear the reference
            item["prev"] = None
        elif ref in ref_map:
            # Previous item was remapped - update to new ref
            prev_ref["$ref"] = ref_map[ref]


# ---------------------------------------------------------------------------
def _update_caption_refs(
    table: dict[str, Any],
    ref_map: dict[str, str],
    removed_refs: set[str],
) -> None:
    """Update caption references in a table, removing dangling refs to deleted items.

    Captions are list[RefItem] where each RefItem has a 'cref' field containing
    a reference string like "#/texts/42". When tables are removed and indices shift,
    caption refs must be updated to prevent IndexError during serialization.

    Args:
        table: Table item to update
        ref_map: Mapping of old refs to new refs (after removal and index shift)
        removed_refs: Set of refs that were removed
    """
    captions = table.get("captions", [])
    if not captions:
        return

    # Filter and update caption references
    to_remove = []
    for i, cap_item in enumerate(captions):
        if not isinstance(cap_item, dict):
            continue

        cref = cap_item.get("cref", "")
        if cref in removed_refs:
            # Caption points to a removed item - mark for removal
            to_remove.append(i)
        elif cref in ref_map:
            # Caption points to a shifted item - update reference
            cap_item["cref"] = ref_map[cref]

    # Remove dangling caption references in reverse order
    for i in reversed(to_remove):
        del captions[i]


# ---------------------------------------------------------------------------
# Type 2: Recover misclassified table continuations
# ---------------------------------------------------------------------------

_SKIP_LABELS = frozenset({"page_header", "page_footer"})


def _cluster_x_positions(
    x_values: list[float],
    tolerance: float = 30.0,
) -> list[float]:
    """Cluster X-coordinate values and return cluster centres.

    Groups values that are within *tolerance* of each other, returns the
    mean of each group sorted ascending.

    Args:
        x_values: List of bbox.l values.
        tolerance: Max gap between values in the same cluster.

    Returns:
        Sorted list of cluster centre X-coordinates.
    """
    if not x_values:
        return []
    sorted_vals = sorted(x_values)
    clusters: list[list[float]] = [[sorted_vals[0]]]
    for v in sorted_vals[1:]:
        if v - clusters[-1][-1] <= tolerance:
            clusters[-1].append(v)
        else:
            clusters.append([v])
    return [sum(c) / len(c) for c in clusters]


def _collect_gap_texts(
    doc_dict: dict[str, Any],
    gap_pages: set[int],
    above_y: float | None = None,
) -> list[tuple[int, dict[str, Any]]]:
    """Collect text elements on gap pages, including picture children.

    Skips page_header and page_footer labels.
    Skips structural nodes (texts with children) — removing them would
    orphan their child elements (tables, other texts) from the document tree.

    Args:
        doc_dict: Full document dict.
        gap_pages: Set of page numbers to scan.
        above_y: If set, only collect texts with bbox.t > above_y (exclusive).

    Returns:
        List of (text_index, text_dict) tuples.
    """
    texts = doc_dict.get("texts", [])
    results: list[tuple[int, dict[str, Any]]] = []

    for i, text in enumerate(texts):
        label = text.get("label", "")
        if label in _SKIP_LABELS:
            continue
        # Skip structural nodes — they are parents in the document tree
        if text.get("children"):
            continue
        prov = text.get("prov")
        if not prov:
            continue
        page = prov[0].get("page_no", 0)
        if page not in gap_pages:
            continue
        bbox = prov[0].get("bbox", {})
        top = bbox.get("t", 0)
        if above_y is not None and top <= above_y:
            continue
        results.append((i, text))

    return results


def _reconstruct_rows(
    gap_texts: list[tuple[int, dict[str, Any]]],
    left_x: float,
    right_x: float,
    x_tolerance: float = 30.0,
    y_tolerance: float = 15.0,
) -> tuple[list[tuple[str, str]], list[int]]:
    """Group gap texts into (left_text, right_text) row pairs.

    Args:
        gap_texts: List of (index, text_dict) from _collect_gap_texts.
        left_x: Cluster centre X for the left column.
        right_x: Cluster centre X for the right column.
        x_tolerance: Max distance from cluster centre to classify L/R.
        y_tolerance: Max difference in bbox.t for same-row pairing.

    Returns:
        Tuple of:
        - row_pairs: List of (left_text_content, right_text_content)
        - consumed_indices: Text indices that were used in pairs
    """
    left_items: list[tuple[float, int, str]] = []  # (top, idx, text)
    right_items: list[tuple[float, int, str]] = []

    for idx, text_dict in gap_texts:
        prov = text_dict.get("prov", [{}])
        bbox = prov[0].get("bbox", {}) if prov else {}
        x = bbox.get("l", 0)
        top = bbox.get("t", 0)
        content = text_dict.get("text", "")

        if abs(x - left_x) <= x_tolerance:
            left_items.append((top, idx, content))
        elif abs(x - right_x) <= x_tolerance:
            right_items.append((top, idx, content))
        # Elements not matching either column are skipped
        # (e.g. subscript fragments at x ≈ 492)

    # Sort by top descending (BOTTOMLEFT: higher t = higher on page)
    left_items.sort(key=lambda item: -item[0])
    right_items.sort(key=lambda item: -item[0])

    row_pairs: list[tuple[str, str]] = []
    consumed_indices: list[int] = []
    used_right: set[int] = set()

    for l_top, l_idx, l_text in left_items:
        best_match: tuple[float, int, str] | None = None
        best_dist = y_tolerance + 1

        for r_pos, (r_top, r_idx, r_text) in enumerate(right_items):
            if r_pos in used_right:
                continue
            dist = abs(l_top - r_top)
            if dist <= y_tolerance and dist < best_dist:
                best_dist = dist
                best_match = (r_top, r_idx, r_text)
                best_pos = r_pos

        if best_match is not None:
            row_pairs.append((l_text, best_match[2]))
            consumed_indices.extend([l_idx, best_match[1]])
            used_right.add(best_pos)
        else:
            # Left item with no right pair — still a valid row (empty right)
            row_pairs.append((l_text, ""))
            consumed_indices.append(l_idx)

    # Right items with no left pair
    for r_pos, (_r_top, r_idx, r_text) in enumerate(right_items):
        if r_pos not in used_right:
            row_pairs.append(("", r_text))
            consumed_indices.append(r_idx)

    return row_pairs, consumed_indices


def _remove_texts_from_doc(
    doc_dict: dict[str, Any],
    removal_indices: set[int],
) -> None:
    """Remove text items at given indices and clean up all references.

    Mirrors _remove_tables_from_doc but operates on the texts array.
    """
    texts = doc_dict.get("texts", [])
    if not removal_indices:
        return

    # Build ref set for removed texts
    removed_refs: set[str] = set()
    for idx in removal_indices:
        if idx < len(texts):
            ref = texts[idx].get("self_ref")
            if ref:
                removed_refs.add(ref)

    # Remove texts in reverse order
    for idx in sorted(removal_indices, reverse=True):
        if idx < len(texts):
            del texts[idx]

    # Rebuild self_ref for remaining texts
    for i, text in enumerate(texts):
        text["self_ref"] = f"#/texts/{i}"

    # Build old-to-new ref mapping
    ref_map: dict[str, str] = {}
    new_idx = 0
    old_count = len(texts) + len(removal_indices)
    for old_idx in range(old_count):
        old_ref = f"#/texts/{old_idx}"
        if old_idx in removal_indices:
            continue
        new_ref = f"#/texts/{new_idx}"
        if old_ref != new_ref:
            ref_map[old_ref] = new_ref
        new_idx += 1

    # Update references everywhere
    _update_refs_in_collection(doc_dict.get("body", {}).get("children", []), ref_map, removed_refs)
    for group in doc_dict.get("groups", []):
        _update_refs_in_collection(group.get("children", []), ref_map, removed_refs)
        _update_parent_ref(group, ref_map, removed_refs)
    for table in doc_dict.get("tables", []):
        _update_refs_in_collection(table.get("children", []), ref_map, removed_refs)
        _update_parent_ref(table, ref_map, removed_refs)
        # Update caption references (critical: prevents IndexError during serialization)
        _update_caption_refs(table, ref_map, removed_refs)
    for picture in doc_dict.get("pictures", []):
        _update_refs_in_collection(picture.get("children", []), ref_map, removed_refs)
        _update_parent_ref(picture, ref_map, removed_refs)
    for text in texts:
        _update_refs_in_collection(text.get("children", []), ref_map, removed_refs)
        _update_parent_ref(text, ref_map, removed_refs)


def recover_type2_split_tables(
    doc_dict: dict[str, Any],
    bottom_threshold: float = 120.0,
    top_threshold: float = 700.0,
    x_cluster_tolerance: float = 30.0,
    y_row_tolerance: float = 15.0,
    min_gap_elements: int = 2,
    validate: bool = True,
) -> tuple[dict[str, Any], int]:
    """Recover table continuations misclassified as text elements.

    Type 2 splits: a table ends near the page bottom, but its continuation
    on the next page was classified as text/section_header instead of table
    cells.  Detected by finding text elements between consecutive tables
    that have a two-column spatial layout (bbox.l clusters at two distinct
    X-positions).

    Should be called AFTER detect_and_merge_split_tables (Type 1).

    Args:
        doc_dict: DoclingDocument exported as dictionary (modified in place).
        bottom_threshold: Max bbox.b for "near bottom" detection.
        top_threshold: Min bbox.t — if next table starts above this,
            it was already handled as Type 1.
        x_cluster_tolerance: Tolerance for X-position clustering.
        y_row_tolerance: Tolerance for pairing L/R elements into rows.
        min_gap_elements: Minimum gap elements to attempt recovery.
        validate: If True, validate input/output with DoclingDocument model (default: True).
            Should be enabled in production to catch corruption at function boundaries.

    Returns:
        Tuple of (modified doc_dict, number of recoveries performed).

    Raises:
        ValidationError: If input or output document fails validation (when validate=True)
    """
    # Validate input document structure
    if validate:
        _validate_document(doc_dict, "recover_type2_split_tables input")

    tables = doc_dict.get("tables", [])
    if not tables:
        # Validate output before returning (no changes made)
        if validate:
            _validate_document(doc_dict, "recover_type2_split_tables output (no tables)")
        return doc_dict, 0

    # Build sorted table info: (index, page_no, bbox)
    table_info: list[tuple[int, int, dict[str, Any]]] = []
    for i, table in enumerate(tables):
        info = _extract_table_bbox(table)
        if info is not None:
            table_info.append((i, info["page_no"], info["bbox"]))

    if not table_info:
        # Validate output before returning (no changes made)
        if validate:
            _validate_document(doc_dict, "recover_type2_split_tables output (no table info)")
        return doc_dict, 0

    table_info.sort(key=lambda x: (x[1], -x[2].get("t", 0)))

    # Detect Type 2 candidates
    recovery_count = 0
    all_consumed_text_indices: set[int] = set()

    for pos, (idx, page_no, bbox) in enumerate(table_info):
        b_val = bbox.get("b", 999)
        if b_val >= bottom_threshold:
            continue

        # Find next table
        next_table_info = None
        for next_pos in range(pos + 1, len(table_info)):
            n_idx, n_page, n_bbox = table_info[next_pos]
            if n_page == page_no:
                continue  # Same page
            next_table_info = (n_idx, n_page, n_bbox)
            break

        if next_table_info is None:
            continue

        n_idx, n_page, n_bbox = next_table_info
        n_top = n_bbox.get("t", 0)

        # If next table starts near top of the immediate next page,
        # this was a Type 1 case (already handled) — skip
        if n_page == page_no + 1 and n_top > top_threshold:
            continue

        # Determine gap pages and upper bound for gap elements
        if n_page == page_no + 1:
            # Same next page, gap is above the next table
            gap_pages = {n_page}
            above_y = n_top
        else:
            # Gap spans one or more full pages between tables
            gap_pages = set(range(page_no + 1, n_page))
            above_y = None  # Collect everything on gap pages

        # Collect gap text elements
        gap_texts = _collect_gap_texts(doc_dict, gap_pages, above_y)
        # Also check next table's page for texts above the table
        # (when there are intermediate pages, the next table's page
        # may also contain misclassified gap elements above it)
        if n_page > page_no + 1:
            gap_texts += _collect_gap_texts(doc_dict, {n_page}, above_y=n_top)
        if len(gap_texts) < min_gap_elements:
            continue

        # Check for two-column layout
        x_values = []
        for _, text_dict in gap_texts:
            prov = text_dict.get("prov", [{}])
            bbox_t = prov[0].get("bbox", {}) if prov else {}
            x = bbox_t.get("l", 0)
            x_values.append(x)

        clusters = _cluster_x_positions(x_values, x_cluster_tolerance)
        if len(clusters) != 2:
            continue

        left_x, right_x = clusters[0], clusters[1]

        # Reconstruct rows
        row_pairs, consumed_indices = _reconstruct_rows(
            gap_texts, left_x, right_x, x_cluster_tolerance, y_row_tolerance
        )

        if not row_pairs:
            continue

        # Append recovered cells to the ending table
        ending_table = tables[idx]
        ending_data = ending_table.get("data", {})
        ending_num_rows = ending_data.get("num_rows", 0)
        ending_num_cols = ending_data.get("num_cols", 0)

        # Extract table info for logging
        ending_info = _extract_table_bbox(ending_table)
        ending_page = ending_info["page_no"] if ending_info else "?"
        ending_bbox = ending_info.get("bbox", {}) if ending_info else {}

        # Type 2 recovery is designed for 2-column gap layouts
        # If ending table has < 2 columns, validate this is truly a continuation
        if ending_num_cols < 2:
            logger.warning(
                f"Type 2 recovery: table[{idx}] on page {ending_page} has {ending_num_cols} column(s), "
                f"but gap texts form 2-column layout. This may indicate false detection. "
                f"Table bbox: {ending_bbox}. Skipping recovery to preserve original table structure."
            )
            # Skip recovery for single-column tables to avoid corruption
            continue

        new_cells = []
        for row_i, (left_text, right_text) in enumerate(row_pairs):
            row_idx = ending_num_rows + row_i
            new_cells.append(
                {
                    "text": left_text,
                    "start_row_offset_idx": row_idx,
                    "end_row_offset_idx": row_idx + 1,
                    "start_col_offset_idx": 0,
                    "end_col_offset_idx": 1,
                    "col_span": 1,
                    "row_span": 1,
                    "column_header": False,
                    "row_header": False,
                    "row_section": False,
                }
            )
            new_cells.append(
                {
                    "text": right_text,
                    "start_row_offset_idx": row_idx,
                    "end_row_offset_idx": row_idx + 1,
                    "start_col_offset_idx": 1,
                    "end_col_offset_idx": 2,
                    "col_span": 1,
                    "row_span": 1,
                    "column_header": False,
                    "row_header": False,
                    "row_section": False,
                }
            )

        existing_cells = ending_data.get("table_cells", [])
        ending_data["table_cells"] = existing_cells + new_cells
        ending_data["num_rows"] = ending_num_rows + len(row_pairs)
        # Since we're adding 2-column gap data, num_cols must be at least 2
        # This is safe because we validated ending_num_cols >= 2 above
        if ending_num_cols < 2:
            ending_data["num_cols"] = 2

        all_consumed_text_indices.update(consumed_indices)
        recovery_count += 1

        # Log successful recovery (ending_info already extracted above)
        logger.info(
            f"Type 2 recovery: table[{idx}] (page {ending_page}, {ending_num_cols} cols) "
            f"<- {len(row_pairs)} rows from gap pages {sorted(gap_pages)}, "
            f"total rows: {ending_data['num_rows']}"
        )

    # Remove consumed text elements
    if all_consumed_text_indices:
        _remove_texts_from_doc(doc_dict, all_consumed_text_indices)

    # Validate output document structure after all modifications
    if validate:
        _validate_document(doc_dict, "recover_type2_split_tables output (after recoveries)")

    return doc_dict, recovery_count
