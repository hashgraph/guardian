"""Extract methodology identifiers from file paths for schema ingestion."""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_SHARED_DIRECTORY_NAMES = frozenset({"shared", "common", "generic"})


def extract_methodology_from_path(file_path: Path) -> str | None:
    """
    Extract methodology from the parent directory name of a file path.

    Returns the uppercased parent directory name, or None for shared directories.

    Examples:
        >>> extract_methodology_from_path(Path("/input/VM0042/policy.json"))
        'VM0042'
        >>> extract_methodology_from_path(Path("/input/shared/common.json")) is None
        True
    """
    parent_dir = file_path.parent.name
    if parent_dir.lower() in _SHARED_DIRECTORY_NAMES:
        logger.debug("Directory '%s' identified as shared/common", parent_dir)
        return None
    methodology = parent_dir.upper()
    logger.debug("Using directory name as methodology: '%s'", methodology)
    return methodology
