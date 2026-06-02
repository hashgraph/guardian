"""
Orphan List Item Detector and Fixer.

Detects and fixes list items that get misclassified as section_headers
when they span page boundaries in PDF documents.

The problem occurs because Docling processes pages independently, and when
a list continues on the next page, the first item on the new page may be
incorrectly labeled as a section_header instead of list_item.

Algorithm:
1. Identify page boundaries in the document
2. For each page break, analyze content before and after
3. Detect orphaned list items using pattern matching and context analysis
4. Fix labels by changing section_header -> list_item
"""

import logging
import re
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)

# Patterns that indicate list items
LIST_PATTERNS: list[tuple[str, str]] = [
    # Lettered: a), b., (a), A)
    (r"^([a-z])\)\s", "letter_paren"),
    (r"^([a-z])\.\s", "letter_dot"),
    (r"^\(([a-z])\)\s", "letter_paren_enclosed"),
    (r"^([A-Z])\)\s", "letter_upper_paren"),
    # Numbered: 1), 2., (1), 1:
    (r"^(\d+)\)\s", "number_paren"),
    (r"^(\d+)\.\s", "number_dot"),
    (r"^\((\d+)\)\s", "number_paren_enclosed"),
    (r"^(\d+):\s", "number_colon"),
    # Roman: i), ii., (i)
    (r"^(i{1,3}|iv|vi{0,3}|ix|x)\)\s", "roman_lower_paren"),
    (r"^(I{1,3}|IV|VI{0,3}|IX|X)\)\s", "roman_upper_paren"),
    # Bullets
    (r"^[•\-\*–]\s", "bullet"),
]

# Labels to skip when looking for "real content"
FURNITURE_LABELS = {"page_header", "page_footer", "footnote", "caption"}

# Labels that indicate list items
LIST_LABELS = {"list_item"}


@dataclass
class ListPattern:
    """Detected list pattern info."""

    pattern_type: str
    marker: str
    sequence_value: int | str


@dataclass
class OrphanedItem:
    """Information about a detected orphaned list item."""

    index: int
    text: str
    page: int | None
    current_label: str
    suggested_label: str
    reason: str
    confidence: str


def is_picture_child(item: dict[str, Any]) -> bool:
    """Check if item is a child of a picture (OCR from image)."""
    parent = item.get("parent")
    if parent and isinstance(parent, dict):
        ref = parent.get("$ref", "")
        if "#/pictures/" in ref:
            return True
    return False


def detect_list_pattern(text: str) -> ListPattern | None:
    """Detect if text starts with a list item pattern."""
    text = text.strip()

    for pattern, pattern_type in LIST_PATTERNS:
        match = re.match(pattern, text, re.IGNORECASE)
        if match:
            marker = match.group(0).strip()

            # Extract sequence value
            if pattern_type.startswith("letter"):
                value = match.group(1).lower()
            elif pattern_type.startswith("number"):
                value = int(match.group(1))
            elif pattern_type.startswith("roman"):
                value = match.group(1).lower()
            else:
                value = marker

            return ListPattern(pattern_type, marker, value)

    return None


def get_sequence_next(pattern: ListPattern) -> str | int | None:
    """Get the expected next value in a sequence."""
    value = pattern.sequence_value

    if isinstance(value, int):
        return value + 1
    if isinstance(value, str) and len(value) == 1 and value.isalpha():
        # a -> b, b -> c, etc.
        if value == "z":
            return None
        return chr(ord(value) + 1)
    if isinstance(value, str):
        # Roman numerals - simplified
        roman_seq = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]
        if value in roman_seq:
            idx = roman_seq.index(value)
            if idx + 1 < len(roman_seq):
                return roman_seq[idx + 1]

    return None


def detect_orphaned_list_items(doc_dict: dict[str, Any]) -> list[OrphanedItem]:
    """
    Analyze document for orphaned list items.

    Args:
        doc_dict: DoclingDocument exported as dictionary

    Returns:
        List of OrphanedItem objects describing detected orphans
    """
    texts = doc_dict.get("texts", [])

    if not texts:
        return []

    # Group items by page
    pages: dict[int, list[tuple[int, dict]]] = {}
    for i, item in enumerate(texts):
        prov = item.get("prov", [{}])
        page = prov[0].get("page_no", 0) if prov else 0
        if page not in pages:
            pages[page] = []
        pages[page].append((i, item))

    orphans: list[OrphanedItem] = []
    page_numbers = sorted(pages.keys())

    for i, page_num in enumerate(page_numbers[:-1]):
        next_page_num = page_numbers[i + 1]

        current_page_items = pages[page_num]
        next_page_items = pages[next_page_num]

        # Get last real content items (skip furniture and picture children)
        last_content_items: list[tuple[int, dict, ListPattern | None]] = []
        for idx, item in reversed(current_page_items):
            label = item.get("label", "")
            if label not in FURNITURE_LABELS and not is_picture_child(item):
                text = item.get("text", "")
                pattern = detect_list_pattern(text)
                if label in LIST_LABELS or pattern:
                    last_content_items.insert(0, (idx, item, pattern))
                if len(last_content_items) >= 5:
                    break

        # Get first real content items on next page (skip furniture and picture children)
        first_content_items: list[tuple[int, dict]] = []
        for idx, item in next_page_items:
            label = item.get("label", "")
            if label not in FURNITURE_LABELS and not is_picture_child(item):
                first_content_items.append((idx, item))
                if len(first_content_items) >= 5:
                    break

        if not last_content_items or not first_content_items:
            continue

        # Check if next page starts with potential orphan
        for idx, item in first_content_items:
            label = item.get("label", "")
            text = item.get("text", "")

            # Only check section_headers (likely misclassified)
            if label != "section_header":
                continue

            pattern = detect_list_pattern(text)
            if not pattern:
                continue

            # CASE 1: Sequence continuation (a->b->c->d)
            last_item = last_content_items[-1] if last_content_items else None
            if last_item:
                last_pattern = last_item[2]
                if last_pattern and pattern.pattern_type == last_pattern.pattern_type:
                    expected_next = get_sequence_next(last_pattern)
                    if expected_next and pattern.sequence_value == expected_next:
                        prov = item.get("prov", [{}])
                        page = prov[0].get("page_no") if prov else None
                        orphans.append(
                            OrphanedItem(
                                index=idx,
                                text=text,
                                page=page,
                                current_label=label,
                                suggested_label="list_item",
                                reason=(
                                    f"Continues sequence from page {page_num}: "
                                    f"{last_pattern.marker} -> {pattern.marker}"
                                ),
                                confidence="high",
                            )
                        )
                        continue

            # CASE 2: Page ends with list_item labels, next page has list-like pattern
            # This handles cases where previous items don't have visible markers
            # but are labeled as list_item, and orphan has a marker like "d)"
            prev_list_labels = [
                it for it in last_content_items if it[1].get("label") == "list_item"
            ]

            if prev_list_labels:
                prov = item.get("prov", [{}])
                page = prov[0].get("page_no") if prov else None
                orphans.append(
                    OrphanedItem(
                        index=idx,
                        text=text,
                        page=page,
                        current_label=label,
                        suggested_label="list_item",
                        reason=(
                            f"Page {page_num} ends with {len(prev_list_labels)} list_item(s), "
                            f"this looks like continuation with marker '{pattern.marker}'"
                        ),
                        confidence="medium",
                    )
                )

    return orphans


def _find_previous_section_header(texts: list[dict[str, Any]], current_idx: int) -> int | None:
    """
    Find the index of the nearest section_header before the current item.

    Args:
        texts: List of text items from the document
        current_idx: Index of the current item

    Returns:
        Index of the previous section_header, or None if not found
    """
    for i in range(current_idx - 1, -1, -1):
        if texts[i].get("label") == "section_header":
            return i
    return None


def _reparent_children(
    doc_dict: dict[str, Any],
    orphan_idx: int,
    new_parent_idx: int,
) -> int:
    """
    Move children from an orphan item to a new parent header.

    Updates both the children lists and parent references to maintain
    consistent document structure.

    Args:
        doc_dict: Document dictionary to modify in place
        orphan_idx: Index of the orphan item losing its children
        new_parent_idx: Index of the section_header receiving the children

    Returns:
        Number of children moved
    """
    texts = doc_dict.get("texts", [])
    pictures = doc_dict.get("pictures", [])
    groups = doc_dict.get("groups", [])

    orphan_item = texts[orphan_idx]
    new_parent = texts[new_parent_idx]

    children = orphan_item.get("children", [])
    if not children:
        return 0

    orphan_ref = orphan_item.get("self_ref")
    new_parent_ref = new_parent.get("self_ref")

    # Initialize new parent's children list if needed
    if "children" not in new_parent:
        new_parent["children"] = []

    # Move each child to the new parent
    moved_count = 0
    for child_ref_dict in children:
        child_ref = child_ref_dict.get("$ref", "")

        # Add to new parent's children
        new_parent["children"].append(child_ref_dict)

        # Update the child's parent reference
        if child_ref.startswith("#/texts/"):
            child_idx = int(child_ref.split("/")[-1])
            if child_idx < len(texts):
                texts[child_idx]["parent"] = {"$ref": new_parent_ref}
        elif child_ref.startswith("#/pictures/"):
            child_idx = int(child_ref.split("/")[-1])
            if child_idx < len(pictures):
                pictures[child_idx]["parent"] = {"$ref": new_parent_ref}
        elif child_ref.startswith("#/groups/"):
            child_idx = int(child_ref.split("/")[-1])
            if child_idx < len(groups):
                groups[child_idx]["parent"] = {"$ref": new_parent_ref}

        moved_count += 1

    # Clear the orphan's children
    orphan_item["children"] = []

    logger.debug(f"Moved {moved_count} children from {orphan_ref} to {new_parent_ref}")

    return moved_count


def fix_orphaned_list_items(doc_dict: dict[str, Any]) -> tuple[dict[str, Any], int]:
    """
    Detect and fix orphaned list items in a document.

    When an orphaned list item has children (from hierarchy postprocessing),
    those children are re-parented to the nearest previous section_header
    before the orphan is relabeled. This preserves all document content.

    Modifies the document dictionary in place.

    Args:
        doc_dict: DoclingDocument exported as dictionary

    Returns:
        Tuple of (modified doc_dict, number of items fixed)
    """
    orphans = detect_orphaned_list_items(doc_dict)

    if not orphans:
        return doc_dict, 0

    texts = doc_dict.get("texts", [])

    for orphan in orphans:
        idx = orphan.index
        if idx < len(texts):
            orphan_item = texts[idx]
            children = orphan_item.get("children", [])

            # If the orphan has children, re-parent them before relabeling
            if children:
                prev_header_idx = _find_previous_section_header(texts, idx)
                if prev_header_idx is not None:
                    moved = _reparent_children(doc_dict, idx, prev_header_idx)
                    prev_header = texts[prev_header_idx]
                    logger.info(
                        f"Re-parented {moved} children from orphan at index {idx} "
                        f"to section_header at index {prev_header_idx}: "
                        f"'{prev_header.get('text', '')[:50]}...'"
                    )
                else:
                    logger.warning(
                        f"Orphan at index {idx} has {len(children)} children but "
                        f"no previous section_header found to re-parent them"
                    )

            old_label = orphan_item.get("label", "")
            orphan_item["label"] = orphan.suggested_label

            # Remove 'level' field if present - list_item doesn't support it
            # (hierarchy postprocessing may have added it)
            if "level" in orphan_item:
                del orphan_item["level"]

            logger.info(
                f"Fixed orphaned list item at index {idx} (page {orphan.page}): "
                f"'{old_label}' -> '{orphan.suggested_label}' | "
                f"{orphan.text[:50]}..."
            )
            logger.debug(f"  Reason: {orphan.reason} (confidence: {orphan.confidence})")

    return doc_dict, len(orphans)
