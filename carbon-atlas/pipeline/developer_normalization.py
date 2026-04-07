"""
Developer name normalization for deduplication.

Strips legal suffixes, normalizes punctuation/whitespace/casing,
and groups variant spellings of the same entity into a single
canonical developer record.
"""

import re

# ── Legal suffix patterns (longest first to avoid partial matches) ────

_LEGAL_SUFFIXES: list[str] = [
    # Multi-word compound suffixes (must come first)
    r"GmbH\s*&\s*Co\.?\s*KG",
    r"Pty\.?\s*Ltd\.?",
    r"Pvt\.?\s*Ltd\.?",
    r"Pte\.?\s*Ltd\.?",
    r"Co\.?,?\s*Ltd\.?",
    # Single-word suffixes
    r"Incorporated",
    r"Corporation",
    r"Limited",
    r"Private",
    r"gGmbH",
    r"GmbH",
    r"Corp\.?",
    r"LTDA",
    r"Ltda\.?",
    r"LLC",
    r"L\.L\.C\.?",
    r"Ltd\.?",
    r"Inc\.?",
    r"PLC",
    r"P\.L\.C\.?",
    r"Pte\.?",
    r"Pvt\.?",
    r"Pty\.?",
    r"S\.A\.S\.?",
    r"S\.A\.?",
    r"S\.r\.l\.?",
    r"S\.R\.L\.?",
    r"S\.p\.A\.?",
    r"S\.C\.V\.?",
    r"SCV",
    r"JSC",
    r"A\.\s*[SŞ]\.?",  # Turkish A.Ş.
    r"AS",              # Turkish AS without dots
    r"A/S",             # Danish
    r"AG",
    r"SE",
    r"B\.V\.?",
    r"BV",
    r"UG",
    r"OU",
]

# Build a single regex that strips one suffix at a time from the end.
# We allow an optional leading comma/space before the suffix.
_SUFFIX_RE = re.compile(
    r"[,\s]*\b(?:" + "|".join(_LEGAL_SUFFIXES) + r")\s*\.?\s*$",
    re.IGNORECASE,
)


def _strip_suffixes(name: str) -> str:
    """Iteratively strip legal suffixes from the end of a name."""
    prev = None
    while prev != name:
        prev = name
        name = _SUFFIX_RE.sub("", name).strip()
    return name


def _strip_parenthetical(name: str) -> str:
    """
    Remove parenthetical text that contains legal terms or repeats the
    company name, e.g. 'Carbonsink (Carbonsink Group S.r.l.)' → 'Carbonsink'.
    Only removes trailing parentheticals.
    """
    m = re.search(r"\s*\([^)]+\)\s*$", name)
    if not m:
        return name
    paren_content = m.group(0)
    # Only remove if the parenthetical contains a legal suffix keyword
    legal_keywords = (
        "ltd", "llc", "inc", "corp", "gmbh", "s.a", "s.r.l",
        "pte", "pvt", "pty", "plc", "limited", "jsc", "ag", "b.v",
    )
    if any(kw in paren_content.lower() for kw in legal_keywords):
        return name[: m.start()].strip()
    return name


def normalize_developer_name(raw: str) -> str:
    """
    Produce a canonical matching key from a raw proponent string.

    The key is used to group variant spellings of the same entity.
    It is NOT the display name — the display name is the most common
    raw variant within each group.

    Steps:
      1. Strip trailing whitespace
      2. Remove parenthetical legal descriptions
      3. Iteratively strip legal suffixes
      4. Normalize internal whitespace and trailing punctuation
      5. Collapse to lowercase for matching
    """
    s = raw.strip()
    if not s:
        return ""

    # Remove parenthetical legal descriptions
    s = _strip_parenthetical(s)

    # Strip legal suffixes
    s = _strip_suffixes(s)

    # Normalize whitespace (collapse multiple spaces)
    s = re.sub(r"\s+", " ", s).strip()

    # Strip trailing punctuation (commas, periods, hyphens)
    s = re.sub(r"[,.\-]+$", "", s).strip()

    # Lowercase for matching
    return s.lower()


def pick_canonical_name(variants: list[tuple[str, int]]) -> str:
    """
    Given a list of (raw_name, frequency) tuples that all normalize to
    the same key, pick the best display name.

    Strategy: prefer the most frequently used variant. On ties, prefer
    the shorter name (cleaner, fewer suffixes).
    """
    if not variants:
        return ""
    # Sort by frequency desc, then length asc
    variants.sort(key=lambda x: (-x[1], len(x[0])))
    return variants[0][0]
