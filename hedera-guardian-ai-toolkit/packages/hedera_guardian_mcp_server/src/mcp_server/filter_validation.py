"""Server-side filter key validation for MCP search tools.

Validates that FieldCondition keys in SearchFilter match the indexed
payload fields, catching common mistakes (bare field names, wrong
dot-paths) before they silently return empty results from Qdrant.
"""

import difflib
import logging
import time

from qdrant_client import models as qdrant_models

from vector_store import QdrantConnector

from .models.slim_search_filter import FieldCondition, SearchFilter

logger = logging.getLogger(__name__)


class InvalidFilterKeyError(ValueError):
    """Raised when a filter contains field keys not present in the payload schema."""


# Simple TTL cache: {(url, collection_name): (keys_set, timestamp)}
_valid_keys_cache: dict[tuple[str, str], tuple[set[str], float]] = {}
_CACHE_TTL_SECONDS = 60.0


def clear_filter_key_cache() -> None:
    """Clear the filter key validation cache. Useful for testing."""
    _valid_keys_cache.clear()


def extract_field_condition_keys(search_filter: SearchFilter) -> set[str]:
    """Extract all FieldCondition keys from a SearchFilter.

    Walks must, should, and must_not clauses to collect every
    FieldCondition.key value.

    Args:
        search_filter: The search filter to inspect.

    Returns:
        Set of field key strings used in the filter.
    """
    keys: set[str] = set()

    for clause in (search_filter.must, search_filter.should, search_filter.must_not):
        if clause is None:
            continue
        conditions = clause if isinstance(clause, list) else [clause]
        for cond in conditions:
            if isinstance(cond, FieldCondition):
                keys.add(cond.key)
            elif isinstance(cond, qdrant_models.IsEmptyCondition):
                keys.add(cond.is_empty.key)
            elif isinstance(cond, qdrant_models.IsNullCondition):
                keys.add(cond.is_null.key)

    return keys


async def _get_valid_keys(connector: QdrantConnector) -> set[str] | None:
    """Get valid payload keys from connector, using TTL cache.

    Returns:
        Set of valid key strings, or None if payload schema is unavailable.
    """
    cache_key = (connector.url, connector.collection_name)
    now = time.monotonic()

    cached = _valid_keys_cache.get(cache_key)
    if cached is not None:
        keys, timestamp = cached
        if now - timestamp < _CACHE_TTL_SECONDS:
            return keys

    stats = await connector.get_stats()
    if stats.payload_schema is None:
        # No payload schema available — can't validate
        return None

    valid_keys = {field.key for field in stats.payload_schema}
    _valid_keys_cache[cache_key] = (valid_keys, now)
    return valid_keys


def _build_error_message(invalid_keys: set[str], valid_keys: set[str]) -> str:
    """Build a descriptive error message with 'did you mean?' suggestions."""
    sorted_valid = sorted(valid_keys)
    lines = ["Invalid filter key(s) detected:"]

    for key in sorted(invalid_keys):
        close_matches = difflib.get_close_matches(key, sorted_valid, n=2, cutoff=0.4)
        if close_matches:
            suggestions = ", ".join(f"'{m}'" for m in close_matches)
            lines.append(f"  - '{key}' is not a valid filter key. Did you mean: {suggestions}?")
        else:
            lines.append(f"  - '{key}' is not a valid filter key.")

    lines.append("")
    lines.append(f"Available filterable fields: {sorted_valid}")
    lines.append(
        "Hint: Field keys use dot-paths like 'metadata.source_name',"
        " not bare names like 'source_name'."
    )

    return "\n".join(lines)


async def validate_filter_keys(
    search_filter: SearchFilter,
    connector: QdrantConnector,
) -> None:
    """Validate that all FieldCondition keys exist in the collection's payload schema.

    Args:
        search_filter: The filter to validate.
        connector: QdrantConnector to look up the payload schema.

    Raises:
        InvalidFilterKeyError: If any keys are not in the payload schema.
    """
    used_keys = extract_field_condition_keys(search_filter)
    if not used_keys:
        return

    valid_keys = await _get_valid_keys(connector)
    if valid_keys is None:
        logger.warning(
            "No payload schema available for collection '%s'; skipping filter key validation.",
            connector.collection_name,
        )
        return

    invalid_keys = used_keys - valid_keys
    if invalid_keys:
        raise InvalidFilterKeyError(_build_error_message(invalid_keys, valid_keys))
