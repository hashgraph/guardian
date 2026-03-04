"""
Formula extraction utilities for document processing.

This module provides functions to extract formula numbers from document items
and detect formula cross-references in text. Used by DoclingChunker to enhance
embedding input with formula metadata.
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any

from docling_core.types.doc.labels import DocItemLabel

from .constants import (
    FORMULA_NUMBER_PATTERN,
    FORMULA_REFERENCE_PATTERNS,
    FORMULA_TAG_PATTERN,
    TABLE_DECLARATION_PATTERN,
)

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


def extract_formula_number(orig_text: str | None, latex_text: str | None = None) -> str | None:
    """
    Extract formula number from a formula's original text or LaTeX.

    Formula numbers appear in parentheses and are identified by being present
    in the original text but NOT in the LaTeX representation. This distinguishes
    formula labels like "(45)" from parenthesized values that are part of the
    formula content (e.g., "(-1)" in conditional logic).

    As a fallback, also extracts from \\tag{N} in LaTeX when orig_text doesn't
    contain a number. This handles cases where formula numbers have been
    normalized to \\tag{N} format.

    Args:
        orig_text: Original text of a formula item (may contain formula number)
        latex_text: LaTeX representation of the formula (optional, for comparison
            and fallback extraction from \\tag{N})

    Returns:
        Formula identifier without parentheses (e.g., "5", "2.1", "A6.1"),
        or None if no match found
    """
    # Try extracting from orig_text first
    if orig_text:
        # Find all parenthesized patterns that look like formula numbers
        matches = re.findall(FORMULA_NUMBER_PATTERN, orig_text)
        if matches:
            # If no LaTeX provided, return first match (backward compatibility)
            if not latex_text:
                return matches[0]

            # Filter: keep only numbers where the parenthesized form is NOT in LaTeX
            # Formula labels like (45) won't be in LaTeX, but content like (x) might be
            # We only check parenthesized form - bare numbers in LaTeX are normal
            for match in matches:
                if f"({match})" not in latex_text:
                    return match

    # Fallback: extract from \tag{N} in LaTeX
    if latex_text:
        tag_match = FORMULA_TAG_PATTERN.search(latex_text)
        if tag_match:
            return tag_match.group(1)

    return None


def detect_formula_references(text: str, valid_declarations: set[str] | None = None) -> list[str]:
    """
    Detect formula cross-references in text using regex patterns.

    Finds references like "Equation 5", "Eq. 12", "Formula 3", etc.
    Case-insensitive matching. When valid_declarations is provided,
    only returns references that exist in the declarations set.

    Args:
        text: Text to scan for formula references
        valid_declarations: Optional set of known formula numbers to validate against.
            If provided, only references matching a declaration are returned.
            This filters out false positives like decimal numbers (10.24) or
            values that aren't actual formula references.

    Returns:
        Unique list of formula identifiers found (e.g., ["5", "12", "3"])
    """
    if not text:
        return []

    found: set[str] = set()

    for pattern in FORMULA_REFERENCE_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        found.update(matches)

    # Filter by valid declarations if provided
    if valid_declarations is not None:
        found = found & valid_declarations

    return sorted(found)


def extract_formulas_from_doc_items(
    doc_items: list[Any],
) -> tuple[list[str], dict[str, str]]:
    """
    Extract formula information from a list of document items.

    Filters items by FORMULA label and extracts formula numbers from the
    original text field. Also builds a mapping from formula number to
    LaTeX representation.

    Args:
        doc_items: List of DocItem objects from chunk.meta.doc_items

    Returns:
        Tuple of (formula_numbers, formula_map):
        - formula_numbers: List of formula identifiers found (e.g., ["5", "7"])
        - formula_map: Dict mapping formula_id to LaTeX text (e.g., {"5": "$E=mc^2$"})
    """
    formula_numbers: list[str] = []
    formula_map: dict[str, str] = {}

    if not doc_items:
        return formula_numbers, formula_map

    # Guard against Mock objects - must be iterable sequence
    if not isinstance(doc_items, list | tuple):
        return formula_numbers, formula_map

    for item in doc_items:
        # Check if item has a label and it's a formula
        if not hasattr(item, "label") or item.label is None:
            continue

        # Handle both enum and string labels
        label = item.label
        label_value = label.value if hasattr(label, "value") else str(label)

        if label_value != DocItemLabel.FORMULA.value:
            continue

        # Extract formula number from original text, using LaTeX for comparison
        orig_text = getattr(item, "orig", None) or ""
        latex_text = getattr(item, "text", "") or ""
        formula_num = extract_formula_number(orig_text, latex_text)

        if formula_num:
            formula_numbers.append(formula_num)
            # Store LaTeX representation (text field)
            formula_map[formula_num] = latex_text

    # Remove duplicates while preserving order
    seen: set[str] = set()
    unique_numbers: list[str] = []
    for num in formula_numbers:
        if num not in seen:
            seen.add(num)
            unique_numbers.append(num)

    return unique_numbers, formula_map


def enhance_embedding_with_formula_numbers(embedding_text: str, formula_map: dict[str, str]) -> str:
    """
    Enhance embedding text by appending formula numbers to LaTeX formulas.

    For each formula in the text that matches a LaTeX representation in the
    formula_map, append its number in parentheses.

    Args:
        embedding_text: Text to enhance (may contain LaTeX formulas)
        formula_map: Dict mapping formula_id to LaTeX text

    Returns:
        Enhanced text with formula numbers appended to matching formulas
    """
    if not embedding_text or not formula_map:
        return embedding_text

    result = embedding_text

    # For each formula number and its LaTeX, find and enhance the LaTeX in text
    for formula_num, latex_text in formula_map.items():
        if not latex_text:
            continue

        # Check if the latex_text already has the number appended
        # (e.g., from original text)
        if f"({formula_num})" in latex_text:
            continue

        # Find the LaTeX in the text and append the number
        # Only append if the number isn't already there
        if latex_text in result:
            # Check if number is already appended
            pattern = re.escape(latex_text) + r"\s*\(" + re.escape(formula_num) + r"\)"
            if not re.search(pattern, result):
                result = result.replace(latex_text, f"{latex_text} ({formula_num})")

    return result


def _get_item_bbox(item: Any) -> tuple[int | None, float | None, float | None]:
    """
    Extract page number and vertical bbox bounds from a document item.

    Args:
        item: Document item with prov attribute containing bbox info

    Returns:
        Tuple of (page_no, top, bottom) or (None, None, None) if unavailable
    """
    prov = getattr(item, "prov", None)
    if not prov or not isinstance(prov, list | tuple) or len(prov) == 0:
        return None, None, None

    first_prov = prov[0]
    page_no = getattr(first_prov, "page_no", None)
    bbox = getattr(first_prov, "bbox", None)

    if bbox is None:
        return page_no, None, None

    # Handle both dict and object bbox formats
    if isinstance(bbox, dict):
        return page_no, bbox.get("t"), bbox.get("b")
    return page_no, getattr(bbox, "t", None), getattr(bbox, "b", None)


def _get_item_full_bbox(
    item: Any,
) -> dict[str, float | int | None]:
    """
    Extract full bbox info from a document item.

    Args:
        item: Document item with prov attribute containing bbox info

    Returns:
        Dict with keys: page_no, l, r, t, b (left, right, top, bottom)
        Values are None if unavailable
    """
    result: dict[str, float | int | None] = {
        "page_no": None,
        "l": None,
        "r": None,
        "t": None,
        "b": None,
    }

    prov = getattr(item, "prov", None)
    if not prov or not isinstance(prov, list | tuple) or len(prov) == 0:
        return result

    first_prov = prov[0]
    result["page_no"] = getattr(first_prov, "page_no", None)
    bbox = getattr(first_prov, "bbox", None)

    if bbox is None:
        return result

    # Handle both dict and object bbox formats
    if isinstance(bbox, dict):
        result["l"] = bbox.get("l")
        result["r"] = bbox.get("r")
        result["t"] = bbox.get("t")
        result["b"] = bbox.get("b")
    else:
        result["l"] = getattr(bbox, "l", None)
        result["r"] = getattr(bbox, "r", None)
        result["t"] = getattr(bbox, "t", None)
        result["b"] = getattr(bbox, "b", None)

    return result


def _find_formula_number_by_bbox(
    formula_item: Any,
    all_texts: list[Any],
) -> str | None:
    """
    Find formula number from a nearby text element using bbox overlap.

    When a formula doesn't have its number embedded in the orig text,
    the number may be parsed as a separate text element on the same row.
    This function finds such elements by checking for vertical bbox overlap.

    Args:
        formula_item: The formula item without an embedded number
        all_texts: All text items from the document

    Returns:
        Formula number if found in a nearby element, None otherwise
    """
    formula_page, formula_t, formula_b = _get_item_bbox(formula_item)

    if formula_page is None or formula_t is None or formula_b is None:
        return None

    # Look for text elements on same row (vertical bbox overlap)
    for item in all_texts:
        # Skip if no label or not a text element
        if not hasattr(item, "label") or item.label is None:
            continue

        label = item.label
        label_value = label.value if hasattr(label, "value") else str(label)

        # Only consider text elements (not formulas, headers, etc.)
        if label_value != "text":
            continue

        item_page, item_t, item_b = _get_item_bbox(item)

        # Must be on same page with valid bbox
        if item_page != formula_page or item_t is None or item_b is None:
            continue

        # Check vertical overlap: item's bbox should overlap with formula's bbox
        # Condition: item.t < formula.t AND item.b > formula.b
        # This means the item is vertically within or overlapping the formula's row
        if item_t < formula_t and item_b > formula_b:
            # Check if this text contains a standalone formula number
            orig_text = getattr(item, "orig", None) or ""
            orig_text = orig_text.strip()

            # Match standalone formula number like "(65)" or just "65"
            match = re.match(FORMULA_NUMBER_PATTERN, orig_text)
            if match and match.group(0) == orig_text:
                # The entire text is a formula number
                return match.group(1)

            # Also try matching just a bare number for cases like "65"
            if re.match(r"^\d+$", orig_text):
                return orig_text

    return None


def _find_adjacent_text_formula_number(
    formula_item: Any,
    all_texts: list[Any],
    max_horizontal_gap: float = 400.0,
    min_vertical_overlap_ratio: float = 0.3,
) -> str | None:
    """
    Find formula number in adjacent TEXT elements to the right of a formula.

    Searches for TEXT elements (not formula elements) that are positioned to the
    right of the formula and contain a formula number pattern. This handles cases
    where formula numbers in the right margin are labeled as "text" by Docling
    instead of "formula".

    Args:
        formula_item: The formula item to find adjacent number for
        all_texts: All text items from the document
        max_horizontal_gap: Maximum horizontal distance (pixels) to search right
        min_vertical_overlap_ratio: Minimum vertical overlap ratio (0.0-1.0)
            relative to the smaller element height

    Returns:
        Formula number if found, None otherwise

    Safeguards against false positives:
    - Only searches elements to the RIGHT of the formula
    - Requires at least 30% vertical overlap
    - Uses strict formula number pattern matching (not list markers)
    - Limits horizontal search distance
    """
    formula_bbox = _get_item_full_bbox(formula_item)

    if (
        formula_bbox["page_no"] is None
        or formula_bbox["r"] is None
        or formula_bbox["t"] is None
        or formula_bbox["b"] is None
    ):
        return None

    formula_page = formula_bbox["page_no"]
    formula_right = formula_bbox["r"]
    formula_top = formula_bbox["t"]
    formula_bottom = formula_bbox["b"]
    formula_height = abs(formula_top - formula_bottom)

    for item in all_texts:
        # Skip if no label
        if not hasattr(item, "label") or item.label is None:
            continue

        label = item.label
        label_value = label.value if hasattr(label, "value") else str(label)

        # Only consider TEXT elements (the key difference from existing bbox search)
        if label_value != "text":
            continue

        cand_bbox = _get_item_full_bbox(item)

        # Must have valid bbox
        if (
            cand_bbox["page_no"] is None
            or cand_bbox["l"] is None
            or cand_bbox["r"] is None
            or cand_bbox["t"] is None
            or cand_bbox["b"] is None
        ):
            continue

        # Must be on same page
        if cand_bbox["page_no"] != formula_page:
            continue

        cand_left = cand_bbox["l"]
        cand_top = cand_bbox["t"]
        cand_bottom = cand_bbox["b"]
        cand_height = abs(cand_top - cand_bottom)

        # Must be to the RIGHT of the formula
        if cand_left <= formula_right:
            continue

        # Check horizontal gap
        h_gap = cand_left - formula_right
        if h_gap > max_horizontal_gap:
            continue

        # Check vertical overlap (at least min_vertical_overlap_ratio of smaller height)
        overlap_top = min(formula_top, cand_top)
        overlap_bottom = max(formula_bottom, cand_bottom)
        overlap_height = max(0, overlap_top - overlap_bottom)
        min_height = min(formula_height, cand_height)

        if min_height > 0:
            overlap_ratio = overlap_height / min_height
            if overlap_ratio < min_vertical_overlap_ratio:
                continue
        else:
            # Skip if either element has zero height
            continue

        # Try to extract formula number from candidate's orig text
        orig_text = getattr(item, "orig", "") or ""
        orig_text = orig_text.strip()

        if not orig_text:
            continue

        # Use extract_formula_number to validate the pattern
        number = extract_formula_number(orig_text)
        if number:
            logger.debug(
                "Adjacent text found formula number '%s' (gap=%.1fpx, overlap=%.1f%%)",
                number,
                h_gap,
                overlap_ratio * 100 if min_height > 0 else 0,
            )
            return number

    return None


def build_formula_ref_map(doc: Any) -> dict[str, tuple[str, str, int | None]]:
    """
    Build a mapping from formula self_ref to (formula_number, latex_text, page_no).

    This mapping includes formula numbers found via bbox fallback for cases
    where the formula number was parsed as a separate text element.

    Args:
        doc: DoclingDocument instance to extract formulas from

    Returns:
        Dict mapping self_ref (e.g., "#/texts/987") to tuple of
        (formula_number, latex_text, page_no), e.g., {"#/texts/987": ("65", "$...$", 5)}
    """
    formula_map: dict[str, tuple[str, str, int | None]] = {}

    if doc is None:
        return formula_map

    # Use iterate_items with traverse_pictures=True to include formulas inside pictures
    if not hasattr(doc, "iterate_items"):
        # Fallback for non-DoclingDocument objects (e.g., mocks)
        texts = getattr(doc, "texts", None)
        if not texts or not isinstance(texts, list | tuple):
            return formula_map
        items_iter = [
            item
            for item in texts
            if hasattr(item, "label")
            and item.label is not None
            and (item.label.value if hasattr(item.label, "value") else str(item.label))
            == DocItemLabel.FORMULA.value
        ]
    else:
        # Filter to formula items using iterate_items with picture traversal
        items_iter = [
            item
            for item, _level in doc.iterate_items(traverse_pictures=True)
            if hasattr(item, "label")
            and item.label is not None
            and (item.label.value if hasattr(item.label, "value") else str(item.label))
            == DocItemLabel.FORMULA.value
        ]

    # Also need doc.texts for bbox fallback searches
    texts = getattr(doc, "texts", None) or []

    # Track formulas without numbers for bbox fallback
    formulas_without_numbers: list[tuple[Any, str, int | None]] = []  # (item, self_ref, page_no)

    for item in items_iter:
        # items_iter already filtered to FORMULA labels, just need self_ref
        self_ref = getattr(item, "self_ref", None)
        if not self_ref:
            continue

        orig_text = getattr(item, "orig", None) or ""
        latex_text = getattr(item, "text", "") or ""
        formula_num = extract_formula_number(orig_text, latex_text)

        # Extract page number from provenance
        page_no: int | None = None
        prov = getattr(item, "prov", None)
        if prov and len(prov) > 0:
            page_no = getattr(prov[0], "page_no", None)

        if formula_num:
            formula_map[self_ref] = (formula_num, latex_text, page_no)
        else:
            formulas_without_numbers.append((item, self_ref, page_no))

    # Bbox fallback for formulas without embedded numbers
    if formulas_without_numbers:
        logger.debug(
            "Found %d formulas without embedded numbers, trying fallback methods",
            len(formulas_without_numbers),
        )

    bbox_found = 0
    adjacent_text_found = 0
    not_found = 0
    for item, self_ref, page_no in formulas_without_numbers:
        # First try: existing bbox overlap method
        formula_num = _find_formula_number_by_bbox(item, texts)
        if formula_num:
            latex_text = getattr(item, "text", "") or ""
            formula_map[self_ref] = (formula_num, latex_text, page_no)
            bbox_found += 1
            logger.debug(
                "Bbox fallback found formula number '%s' for %s",
                formula_num,
                self_ref,
            )
            continue

        # Second try: adjacent TEXT element search (for right-margin numbers)
        formula_num = _find_adjacent_text_formula_number(item, texts)
        if formula_num:
            latex_text = getattr(item, "text", "") or ""
            formula_map[self_ref] = (formula_num, latex_text, page_no)
            adjacent_text_found += 1
            logger.debug(
                "Adjacent text fallback found formula number '%s' for %s",
                formula_num,
                self_ref,
            )
            continue

        # No formula number found
        not_found += 1
        orig_text = getattr(item, "orig", "") or ""
        logger.debug(
            "No formula number found for %s (orig: '%s')",
            self_ref,
            orig_text[:50] + "..." if len(orig_text) > 50 else orig_text,
        )

    if formulas_without_numbers:
        logger.debug(
            "Fallback results: bbox=%d, adjacent_text=%d, not_found=%d",
            bbox_found,
            adjacent_text_found,
            not_found,
        )

    return formula_map


def collect_all_formula_declarations(doc: Any) -> set[str]:
    """
    Collect all formula declarations from a DoclingDocument.

    Iterates through all text items in the document and extracts formula
    numbers from items labeled as FORMULA. Uses two strategies:
    1. Extract number from formula's orig text (comparing with LaTeX)
    2. For formulas without embedded numbers, search for nearby text elements
       on the same row (using bbox overlap) that contain the formula number

    Args:
        doc: DoclingDocument instance to extract formulas from

    Returns:
        Set of all formula identifiers found in the document (e.g., {"1", "2", "45", "A6.1"})
    """
    formula_map = build_formula_ref_map(doc)
    return {num for num, _, _ in formula_map.values()}


def _get_label_value(item: dict[str, Any] | Any) -> str | None:
    """
    Extract label value from a document item (dict or object format).

    Args:
        item: Document item as dict (resolved refs) or object (raw Docling item)

    Returns:
        Label value as string, or None if not available
    """
    if isinstance(item, dict):
        label = item.get("label")
        if label is None:
            return None
        return label.value if hasattr(label, "value") else str(label)

    if not hasattr(item, "label") or item.label is None:
        return None

    label = item.label
    return label.value if hasattr(label, "value") else str(label)


def detect_content_types_from_doc_items(
    doc_items: list[dict[str, Any]] | list[Any],
) -> tuple[bool, bool, bool]:
    """
    Detect presence of formulas, tables, and figures in document items.

    Checks the label attribute/key of each item against DocItemLabel values
    to determine what content types are present in the chunk.

    Args:
        doc_items: List of doc item dicts (resolved refs) or objects (raw items)

    Returns:
        Tuple of (has_formula, has_table, has_figure)
    """
    has_formula = False
    has_table = False
    has_figure = False

    if not doc_items:
        return has_formula, has_table, has_figure

    # Guard against Mock objects - must be iterable sequence
    if not isinstance(doc_items, list | tuple):
        return has_formula, has_table, has_figure

    for item in doc_items:
        label_value = _get_label_value(item)
        if label_value is None:
            continue

        if label_value == DocItemLabel.FORMULA.value:
            has_formula = True
        elif label_value == DocItemLabel.TABLE.value:
            has_table = True
        elif label_value == DocItemLabel.PICTURE.value:
            has_figure = True

        # Early exit if all types found
        if has_formula and has_table and has_figure:
            break

    return has_formula, has_table, has_figure


def _get_item_text(item: dict[str, Any] | Any) -> str:
    """
    Extract text content from a document item (dict or object format).

    Args:
        item: Document item as dict (resolved refs) or object (raw Docling item)

    Returns:
        Text content from orig or text field, empty string if not available
    """
    if isinstance(item, dict):
        return item.get("orig") or item.get("text") or ""
    return getattr(item, "orig", None) or getattr(item, "text", "") or ""


def extract_table_declarations_from_doc_items(
    doc_items: list[dict[str, Any]] | list[Any],
) -> list[str]:
    """
    Extract table labels from document items.

    Looks for TABLE_DECLARATION_PATTERN in:
    1. CAPTION labels containing "Table N" pattern
    2. TABLE labels with caption/header text
    3. Any text containing table declarations

    Args:
        doc_items: List of doc item dicts (resolved refs) or objects (raw items)

    Returns:
        List of full table labels (e.g., ["Table 1", "Table 2.3"])
        Deduplicated and sorted.
    """
    tables: set[str] = set()

    if not doc_items:
        return []

    # Guard against Mock objects - must be iterable sequence
    if not isinstance(doc_items, list | tuple):
        return []

    for item in doc_items:
        label_value = _get_label_value(item)
        text = _get_item_text(item)

        if not text:
            continue

        # Check CAPTION and TABLE labels for table declarations
        if label_value in (DocItemLabel.CAPTION.value, DocItemLabel.TABLE.value):
            matches = re.findall(TABLE_DECLARATION_PATTERN, text)
            for match in matches:
                # Normalize to "Table N" format (capitalize T)
                normalized = "Table" + match[5:]  # Keep everything after "Table" or "table"
                tables.add(normalized)

    return sorted(tables)
