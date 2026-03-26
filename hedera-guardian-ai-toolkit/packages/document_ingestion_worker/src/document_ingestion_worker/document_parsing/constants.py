"""
Constants for document ingestion.

This module provides centralized constants for embedding configuration
and chunking parameters used throughout the document ingestion pipeline.
"""

import re

# =============================================================================
# Embedding Configuration
# =============================================================================

DEFAULT_EMBEDDING_MODEL = "BAAI/bge-m3"
"""Default SentenceTransformer model for tokenization."""

# =============================================================================
# Chunking Configuration
# =============================================================================

DEFAULT_MAX_TOKENS = 5000
"""Default maximum tokens per chunk."""

DEFAULT_OVERLAP_TOKENS = 0
"""Default number of overlapping tokens between chunks."""

# =============================================================================
# Formula Extraction Configuration
# =============================================================================

FORMULA_NUMBER_PATTERN = r"\(([A-Z]+\d*(?:\.\d+)*|[A-Za-z]?\d+(?:\.\d+)*[a-z]?)\)"
"""Regex pattern to extract formula number from original text.

Matches parenthesized formula identifiers anywhere in string:
- "(5)" -> "5"
- "(12)" -> "12"
- "(2.1)" -> "2.1"
- "(5.3.1)" -> "5.3.1"
- "(A)" -> "A" (uppercase only - lowercase (x) is typically variable notation)
- "(A6.1)" -> "A6.1"
- "(3a)" -> "3a"
- "(45)" in middle of text -> "45"

Does NOT match:
- "(x)" -> None (lowercase single letter - likely function argument f(x))

Used in conjunction with LaTeX comparison to distinguish formula numbers
from parenthesized values that are part of the formula content.
"""

# =============================================================================
# Formula Number Normalization Patterns
# =============================================================================

FORMULA_TAG_PATTERN = re.compile(r"\\tag\s*\{([^}]+)\}")
r"""Pattern to extract formula number from \tag{N} in LaTeX.

Matches:
- "\\tag{5}" -> "5"
- "\\tag{12}" -> "12"
- "\\tag {2.1}" -> "2.1" (with space)
- "\\tag{A}" -> "A"

Used as fallback in extract_formula_number when orig_text has no number.
"""

# Inner pattern for formula numbers - handles both regular and appendix formats
# Matches: 5, 12, 2.1, 5a, 2.1a, A, A1, A1.1, A6.1, AB
_FORMULA_NUM_INNER = r"(?:[A-Z]+\d*|\d+)(?:\.\d+)*[a-z]?"

FORMULA_PAREN_END_PATTERN = re.compile(rf"\(({_FORMULA_NUM_INNER})\)\s*$")
"""Pattern to match (N) at the end of LaTeX content.

Matches:
- "...content (5)" -> "5"
- "...content (12)" -> "12"
- "...content (2.1a)" -> "2.1a"
- "...content (A1.1)" -> "A1.1" (appendix format)
- "...content (A6.1)" -> "A6.1" (appendix format)

Does NOT match mid-string occurrences - only at end (with optional trailing whitespace).
"""

FORMULA_PAREN_OUTSIDE_LATEX = re.compile(rf"(\$\$?)\s*\n*\s*\(({_FORMULA_NUM_INNER})\)\s*$")
"""Pattern to match (N) appearing after closing $ or $$ delimiter.

Matches:
- "$$...$$\\n(5)" -> captures ("$$", "5")
- "$...$  (12)" -> captures ("$", "12")
- "$$...$$\\n\\n(2.1)" -> captures ("$$", "2.1")
- "$$...$$\\n(A1.1)" -> captures ("$$", "A1.1") (appendix format)

Used when Surya produces number outside the math environment.
"""

FORMULA_NUMBER_ONLY_PATTERN = re.compile(rf"^\s*\$?\s*\(({_FORMULA_NUM_INNER})\)\s*\$?\s*$")
"""Pattern to match text/formula elements that contain ONLY a formula number.

Matches entire element content that is just a parenthesized number:
- "(37)" -> "37"
- "$(37)$" -> "37" (formula element with $ delimiters)
- " (5) " -> "5" (with whitespace)
- "(2.1a)" -> "2.1a"
- "(A1.1)" -> "A1.1" (appendix format)
- "$(A6.1)$" -> "A6.1" (appendix formula element)

Used to identify adjacent formula number elements for bbox extension.
"""

# =============================================================================
# Bbox Extension for Adjacent Number Elements
# =============================================================================

MAX_NUMBER_ELEMENT_GAP_PX = 400
"""Maximum horizontal gap (pixels) between formula bbox and number element.

Set to 400 to handle right-margin formula numbers in wide-margin PDFs.
Examples from VM0042:
- Formula 37: 64px gap
- Formulas 6, 66, 74: 240-374px gaps (numbers placed in right margin)

Elements beyond this distance are not considered part of the formula.
"""

MIN_VERTICAL_OVERLAP_RATIO = 0.5
"""Minimum vertical overlap ratio for number element detection.

A value of 0.5 means at least 50% of the number element's height must
overlap with the formula's vertical extent to be considered adjacent.
"""

TABLE_DECLARATION_PATTERN = r"([Tt]able\s+\d+(?:\.\d+)*[a-z]?)"
"""Regex pattern to extract table declarations from captions or text.

Matches full table labels:
- "Table 1" -> "Table 1"
- "Table 2.3" -> "Table 2.3"
- "table 5a" -> "table 5a"
- "Table 10" -> "Table 10"

Used to identify table declarations in document chunks.
"""

FORMULA_REFERENCE_PATTERNS = [
    # Singular forms without parentheses
    r"[Ee]quation\s+(\d+(?:\.\d+)*)",  # "Equation 5", "equation 12"
    r"[Ee]q\.?\s+(\d+(?:\.\d+)*)",  # "Eq. 5", "Eq 12"
    r"[Ff]ormula\s+(\d+(?:\.\d+)*)",  # "Formula 5", "formula 12"
    # Singular forms with parentheses
    r"[Ee]quation\s+\((\d+(?:\.\d+)*)\)",  # "equation (5)", "Equation (12)"
    r"[Ff]ormula\s+\((\d+(?:\.\d+)*)\)",  # "formula (5)", "Formula (12)"
    # Plural forms without parentheses
    r"[Ee]quations?\s+(\d+(?:\.\d+)*)",  # "Equations 5", handles singular too
    r"[Ff]ormulas?\s+(\d+(?:\.\d+)*)",  # "Formulas 5"
    r"[Ee]qs\.?\s+(\d+(?:\.\d+)*)",  # "Eqs. 5", "Eqs 12"
    # Plural forms with parentheses - captures each number individually
    r"[Ee]quations?\s+\((\d+(?:\.\d+)*)\)",  # "Equations (1)", "Equations (2)"
    r"[Ff]ormulas?\s+\((\d+(?:\.\d+)*)\)",  # "Formulas (1)"
    # Standalone parenthesized numbers after "and", "or", "to" (for "Equations (1) and (2)")
    # Using word boundary \b to avoid matching "for" -> "or"
    r"\b(?:and|or|to)\s+\((\d+(?:\.\d+)*)\)",  # "and (2)", "or (3)", "to (5)"
    # NOTE: Bare number patterns like "and 6" removed - too many false positives
    # from phrases like "Approaches 1 and 2" or "30 cm and 50 cm"
]
"""List of regex patterns to detect formula cross-references in text.

Each pattern captures the formula number (without surrounding text).
Patterns are case-insensitive and support decimal identifiers (e.g., "2.1").
Handles both singular and plural forms (Equation/Equations, Formula/Formulas).
Requires explicit "Equation/Formula" prefix or parenthesized numbers to avoid
false positives from generic number contexts.
"""
