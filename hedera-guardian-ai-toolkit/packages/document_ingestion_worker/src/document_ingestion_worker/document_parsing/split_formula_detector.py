"""
Split formula detection for multi-line formula merging.

This module detects when Docling's layout analysis has split a single
multi-line formula into multiple separate elements. It provides clustering
functionality to identify related formula fragments and compute merged
bounding boxes for improved LaTeX extraction.

The detector identifies splits based on:
- Same page proximity
- Vertical bbox overlap or small gaps (< threshold)
- Horizontal overlap (for vertical splits) or adjacency (for horizontal splits)

Example:
    >>> from document_ingestion_worker.document_parsing.split_formula_detector import (
    ...     detect_split_formula_clusters,
    ...     FormulaCluster,
    ... )
    >>> clusters = detect_split_formula_clusters(formula_elements, vertical_gap_threshold=10.0)
    >>> for cluster in clusters:
    ...     if cluster.is_split:
    ...         print(f"Split detected: {len(cluster.elements)} parts")
    ...         print(f"Merged bbox: {cluster.merged_bbox}")
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from .constants import FORMULA_NUMBER_ONLY_PATTERN

if TYPE_CHECKING:
    from docling_core.types.doc import BoundingBox, NodeItem

logger = logging.getLogger(__name__)

# Maximum horizontal gap (pixels) for side-by-side formula merging
# Increased from 50 to 70 to handle cases like formula 37 in VCS-VM0042 (64px gap)
MAX_HORIZONTAL_GAP_PX = 70


@dataclass
class FormulaBbox:
    """Bounding box representation for formula clustering.

    Attributes:
        left: Left coordinate
        right: Right coordinate
        top: Top coordinate (larger = higher on page in PDF coordinates)
        bottom: Bottom coordinate (smaller = lower on page in PDF coordinates)
        page_no: Page number (1-indexed)
    """

    left: float
    right: float
    top: float
    bottom: float
    page_no: int

    @property
    def width(self) -> float:
        """Width of the bounding box."""
        return self.right - self.left

    @property
    def height(self) -> float:
        """Height of the bounding box (top - bottom in PDF coords)."""
        return self.top - self.bottom

    @classmethod
    def from_docling_bbox(cls, bbox: BoundingBox, page_no: int) -> FormulaBbox:
        """Create FormulaBbox from Docling BoundingBox.

        Args:
            bbox: Docling BoundingBox object
            page_no: Page number (1-indexed)

        Returns:
            FormulaBbox instance
        """
        return cls(left=bbox.l, right=bbox.r, top=bbox.t, bottom=bbox.b, page_no=page_no)


@dataclass
class FormulaElement:
    """Wrapper for formula element with extracted bbox info.

    Attributes:
        item: Original NodeItem (TextItem with FORMULA label)
        self_ref: Document reference (e.g., "#/texts/758")
        bbox: Extracted bounding box
        orig_text: Original text from the element
        has_formula_number: Whether this element contains a formula number pattern
        is_empty_orig: Whether the original text is empty or whitespace-only
    """

    item: NodeItem
    self_ref: str
    bbox: FormulaBbox
    orig_text: str
    has_formula_number: bool = False
    is_empty_orig: bool = False

    def __post_init__(self) -> None:
        """Compute derived properties after initialization."""
        self.is_empty_orig = not self.orig_text or not self.orig_text.strip()
        self.has_formula_number = bool(
            self.orig_text and FORMULA_NUMBER_ONLY_PATTERN.match(self.orig_text.strip())
        )


@dataclass
class FormulaCluster:
    """A cluster of formula elements that should be merged.

    Attributes:
        elements: List of FormulaElement objects in this cluster
        primary_element: The primary element (contains formula number, or first in order)
        merged_bbox: Combined bounding box covering all elements
        is_split: Whether this cluster represents a split formula (>1 element)
        extracted_formula_number: Formula number extracted from any element in the cluster
    """

    elements: list[FormulaElement] = field(default_factory=list)
    primary_element: FormulaElement | None = None
    merged_bbox: FormulaBbox | None = None
    is_split: bool = False
    extracted_formula_number: str | None = None

    def __post_init__(self) -> None:
        """Compute derived properties after initialization."""
        if self.elements:
            self._compute_primary_element()
            self._compute_merged_bbox()
            self.is_split = len(self.elements) > 1
            self._extract_cluster_formula_number()

    def _compute_primary_element(self) -> None:
        """Determine the primary element for this cluster.

        Priority:
        1. Element containing formula number pattern like (37)
        2. First element in document order (by self_ref)
        """
        # First, look for element with formula number
        for elem in self.elements:
            if elem.has_formula_number:
                self.primary_element = elem
                return

        # Fallback: first in document order (sort by self_ref index)
        # self_ref format: "#/texts/758" - extract numeric part
        def get_ref_index(elem: FormulaElement) -> int:
            try:
                return int(elem.self_ref.split("/")[-1])
            except (ValueError, IndexError):
                logger.warning(
                    "Could not parse ref index from %r, defaulting to 0",
                    elem.self_ref,
                )
                return 0

        sorted_elements = sorted(self.elements, key=get_ref_index)
        self.primary_element = sorted_elements[0] if sorted_elements else None

    def _compute_merged_bbox(self) -> None:
        """Compute the merged bounding box covering all elements."""
        if not self.elements:
            return

        # Use first element as base
        first_bbox = self.elements[0].bbox
        min_left = first_bbox.left
        max_right = first_bbox.right
        max_top = first_bbox.top  # Top is larger in PDF coords
        min_bottom = first_bbox.bottom  # Bottom is smaller in PDF coords
        page_no = first_bbox.page_no

        # Expand to cover all elements
        for elem in self.elements[1:]:
            bbox = elem.bbox
            min_left = min(min_left, bbox.left)
            max_right = max(max_right, bbox.right)
            max_top = max(max_top, bbox.top)
            min_bottom = min(min_bottom, bbox.bottom)

        self.merged_bbox = FormulaBbox(
            left=min_left, right=max_right, top=max_top, bottom=min_bottom, page_no=page_no
        )

    def _extract_cluster_formula_number(self) -> None:
        """Extract formula number from any element in the cluster.

        For split formula clusters, the formula number may be in a secondary
        element (e.g., a standalone "(37)" element). This method extracts
        the number from any element to preserve it during merging.

        Priority:
        1. Standalone number elements (has_formula_number=True)
        2. Embedded numbers in any element's orig_text
        """
        if not self.is_split:
            return

        # Import here to avoid circular dependency
        from .structure_extractor import extract_formula_number  # noqa: PLC0415

        # Priority 1: standalone number elements (e.g., "(37)" only)
        for elem in self.elements:
            if elem.has_formula_number and elem.orig_text:
                number = extract_formula_number(elem.orig_text)
                if number:
                    self.extracted_formula_number = number
                    return

        # Priority 2: embedded numbers in any element
        for elem in self.elements:
            if elem.orig_text and not elem.is_empty_orig:
                number = extract_formula_number(elem.orig_text)
                if number:
                    self.extracted_formula_number = number
                    return

    @property
    def secondary_elements(self) -> list[FormulaElement]:
        """Get all non-primary elements in the cluster."""
        if not self.primary_element:
            return []
        return [e for e in self.elements if e is not self.primary_element]


def _extract_formula_element(item: Any) -> FormulaElement | None:
    """Extract FormulaElement from a Docling TextItem.

    Args:
        item: Docling TextItem with FORMULA label

    Returns:
        FormulaElement if valid, None otherwise
    """
    # Get self_ref
    self_ref = getattr(item, "self_ref", None)
    if not self_ref:
        return None

    # Get provenance and bbox
    prov = getattr(item, "prov", None)
    if not prov or not isinstance(prov, list | tuple) or len(prov) == 0:
        return None

    first_prov = prov[0]
    page_no = getattr(first_prov, "page_no", None)
    bbox = getattr(first_prov, "bbox", None)

    if page_no is None or bbox is None:
        return None

    # Extract bbox coordinates
    try:
        formula_bbox = FormulaBbox.from_docling_bbox(bbox, page_no)
    except (AttributeError, TypeError):
        return None

    # Get original text
    orig_text = getattr(item, "orig", "") or ""

    return FormulaElement(
        item=item,
        self_ref=self_ref,
        bbox=formula_bbox,
        orig_text=orig_text,
    )


def _compute_vertical_gap(bbox1: FormulaBbox, bbox2: FormulaBbox) -> float:
    """Compute vertical gap between two bboxes.

    Returns negative value for overlap, positive for gap.

    In PDF coordinates:
    - top is larger than bottom
    - Gap = max(b1, b2) - min(t1, t2) if they don't overlap
    - Overlap (negative gap) if one bbox's bottom is above the other's top

    Args:
        bbox1: First bounding box
        bbox2: Second bounding box

    Returns:
        Vertical gap in pixels (negative = overlap)
    """
    # The gap is the distance between the closer edges
    # If bbox1 is above bbox2: gap = bbox2.top - bbox1.bottom
    # If bbox2 is above bbox1: gap = bbox1.top - bbox2.bottom
    # We want the minimum of these (most overlap or smallest gap)
    gap1 = bbox1.bottom - bbox2.top  # bbox1 above bbox2
    gap2 = bbox2.bottom - bbox1.top  # bbox2 above bbox1
    return max(gap1, gap2)


def _compute_horizontal_overlap_ratio(bbox1: FormulaBbox, bbox2: FormulaBbox) -> float:
    """Compute horizontal overlap ratio between two bboxes.

    Returns the overlap as a ratio of the smaller bbox's width.

    Args:
        bbox1: First bounding box
        bbox2: Second bounding box

    Returns:
        Overlap ratio (0.0 to 1.0+, where 1.0 = complete overlap)
    """
    overlap_left = max(bbox1.left, bbox2.left)
    overlap_right = min(bbox1.right, bbox2.right)
    overlap_width = max(0, overlap_right - overlap_left)

    # Use smaller width as reference
    min_width = min(bbox1.width, bbox2.width)
    if min_width <= 0:
        return 0.0

    return overlap_width / min_width


def _should_merge(
    elem1: FormulaElement,
    elem2: FormulaElement,
    vertical_gap_threshold: float,
    horizontal_overlap_ratio: float,
) -> bool:
    """Determine if two formula elements should be merged.

    Elements are merged if they are on the same page and either:
    1. Have vertical overlap/proximity AND horizontal overlap (vertical split)
    2. Have horizontal adjacency (horizontal split - side by side)

    Args:
        elem1: First formula element
        elem2: Second formula element
        vertical_gap_threshold: Maximum vertical gap (px) to consider as split
        horizontal_overlap_ratio: Minimum horizontal overlap ratio for vertical splits

    Returns:
        True if elements should be merged
    """
    bbox1 = elem1.bbox
    bbox2 = elem2.bbox

    # Must be on same page
    if bbox1.page_no != bbox2.page_no:
        return False

    vertical_gap = _compute_vertical_gap(bbox1, bbox2)
    h_overlap = _compute_horizontal_overlap_ratio(bbox1, bbox2)

    # Check for vertical split (stacked formulas with horizontal overlap)
    if vertical_gap <= vertical_gap_threshold and h_overlap >= horizontal_overlap_ratio:
        return True

    # Check for horizontal split (side-by-side with vertical overlap)
    # For horizontal splits, we need significant vertical overlap
    vertical_overlap_ratio = 0.0
    overlap_top = min(bbox1.top, bbox2.top)
    overlap_bottom = max(bbox1.bottom, bbox2.bottom)
    overlap_height = max(0, overlap_top - overlap_bottom)
    min_height = min(bbox1.height, bbox2.height)
    if min_height > 0:
        vertical_overlap_ratio = overlap_height / min_height

    # Horizontal split: significant vertical overlap but no/little horizontal overlap
    if vertical_overlap_ratio >= 0.5 and h_overlap < horizontal_overlap_ratio:
        # Check if horizontally adjacent (small gap between right edge and left edge)
        h_gap = min(abs(bbox1.right - bbox2.left), abs(bbox2.right - bbox1.left))
        # Allow small horizontal gap for side-by-side formulas
        if h_gap <= MAX_HORIZONTAL_GAP_PX:
            return True

    return False


def _build_clusters(
    elements: list[FormulaElement],
    vertical_gap_threshold: float,
    horizontal_overlap_ratio: float,
) -> list[FormulaCluster]:
    """Build clusters of related formula elements using union-find.

    Args:
        elements: List of formula elements to cluster
        vertical_gap_threshold: Maximum vertical gap for merging
        horizontal_overlap_ratio: Minimum horizontal overlap for vertical splits

    Returns:
        List of FormulaCluster objects
    """
    if not elements:
        return []

    n = len(elements)

    # Union-find structure
    parent = list(range(n))

    def find(x: int) -> int:
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(x: int, y: int) -> None:
        px, py = find(x), find(y)
        if px != py:
            parent[px] = py

    # Group elements by page for efficiency
    by_page: dict[int, list[int]] = {}
    for i, elem in enumerate(elements):
        page = elem.bbox.page_no
        if page not in by_page:
            by_page[page] = []
        by_page[page].append(i)

    # Check pairs on same page
    for page_indices in by_page.values():
        for i, idx1 in enumerate(page_indices):
            for idx2 in page_indices[i + 1 :]:
                if _should_merge(
                    elements[idx1],
                    elements[idx2],
                    vertical_gap_threshold,
                    horizontal_overlap_ratio,
                ):
                    union(idx1, idx2)

    # Build clusters from union-find results
    cluster_map: dict[int, list[FormulaElement]] = {}
    for i, elem in enumerate(elements):
        root = find(i)
        if root not in cluster_map:
            cluster_map[root] = []
        cluster_map[root].append(elem)

    # Create FormulaCluster objects
    return [FormulaCluster(elements=elems) for elems in cluster_map.values()]


def detect_split_formula_clusters(
    formula_items: list[Any],
    vertical_gap_threshold: float = 10.0,
    horizontal_overlap_ratio: float = 0.3,
) -> list[FormulaCluster]:
    """Detect split formula clusters from a list of formula items.

    Analyzes formula elements to find those that should be merged because
    they represent parts of the same multi-line formula that was split
    during layout detection.

    Args:
        formula_items: List of Docling TextItem objects with FORMULA label
        vertical_gap_threshold: Maximum vertical gap (pixels) between bbox
                               edges to consider as potential split. Negative
                               values indicate overlap. Default: 10.0
        horizontal_overlap_ratio: Minimum horizontal overlap ratio (0.0-1.0)
                                 required for vertical splits. Default: 0.3

    Returns:
        List of FormulaCluster objects. Each cluster contains:
        - elements: All formula elements in the cluster
        - primary_element: The main element (contains formula number or first in order)
        - merged_bbox: Combined bounding box
        - is_split: True if cluster has multiple elements

    Example:
        >>> from docling_core.types.doc import DoclingDocument
        >>> doc = DoclingDocument.from_json_file("document.json")
        >>> formula_items = [t for t in doc.texts if t.label.value == "formula"]
        >>> clusters = detect_split_formula_clusters(formula_items)
        >>> split_clusters = [c for c in clusters if c.is_split]
        >>> print(f"Found {len(split_clusters)} split formulas")
    """
    # Extract FormulaElement wrappers
    elements = []
    for item in formula_items:
        elem = _extract_formula_element(item)
        if elem:
            elements.append(elem)

    if not elements:
        return []

    # Build clusters
    clusters = _build_clusters(
        elements,
        vertical_gap_threshold,
        horizontal_overlap_ratio,
    )

    # Log split detection results
    split_count = sum(1 for c in clusters if c.is_split)
    logger.debug(
        "Split detection: %d elements -> %d clusters (%d splits)",
        len(elements),
        len(clusters),
        split_count,
    )
    for cluster in clusters:
        if cluster.is_split:
            refs = [e.self_ref for e in cluster.elements]
            primary_ref = cluster.primary_element.self_ref if cluster.primary_element else "N/A"
            logger.debug(
                "Split cluster: primary=%s, elements=%s",
                primary_ref,
                refs,
            )

    return clusters


def build_cluster_lookup(
    clusters: list[FormulaCluster],
) -> tuple[dict[str, FormulaCluster], dict[str, str]]:
    """Build lookup dictionaries from cluster results.

    Args:
        clusters: List of FormulaCluster objects

    Returns:
        Tuple of:
        - cluster_by_ref: Dict mapping self_ref to containing cluster
        - merged_into: Dict mapping secondary element refs to primary element ref
    """
    cluster_by_ref: dict[str, FormulaCluster] = {}
    merged_into: dict[str, str] = {}

    for cluster in clusters:
        for elem in cluster.elements:
            cluster_by_ref[elem.self_ref] = cluster

        if cluster.is_split and cluster.primary_element:
            primary_ref = cluster.primary_element.self_ref
            for secondary in cluster.secondary_elements:
                merged_into[secondary.self_ref] = primary_ref

    return cluster_by_ref, merged_into
