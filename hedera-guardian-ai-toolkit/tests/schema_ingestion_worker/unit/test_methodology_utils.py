"""Unit tests for methodology_utils module."""

from pathlib import Path

from schema_ingestion_worker.methodology_utils import extract_methodology_from_path


class TestExtractMethodologyFromPath:
    """Tests for extract_methodology_from_path."""

    def test_returns_uppercased_parent_directory(self):
        """Normal directory name is returned uppercased."""
        result = extract_methodology_from_path(Path("/input/VM0042/policy.json"))
        assert result == "VM0042"

    def test_lowercase_directory_is_uppercased(self):
        """Lowercase directory name is uppercased."""
        result = extract_methodology_from_path(Path("/input/vm0033/schema.json"))
        assert result == "VM0033"

    def test_shared_directory_returns_none(self):
        """'shared' directory returns None."""
        assert extract_methodology_from_path(Path("/input/shared/common.json")) is None

    def test_common_directory_returns_none(self):
        """'common' directory returns None."""
        assert extract_methodology_from_path(Path("/input/common/base.json")) is None

    def test_generic_directory_returns_none(self):
        """'generic' directory returns None."""
        assert extract_methodology_from_path(Path("/input/generic/template.json")) is None

    def test_shared_case_insensitive(self):
        """Shared directory matching is case-insensitive."""
        assert extract_methodology_from_path(Path("/input/Shared/file.json")) is None
        assert extract_methodology_from_path(Path("/input/SHARED/file.json")) is None
        assert extract_methodology_from_path(Path("/input/Common/file.json")) is None
        assert extract_methodology_from_path(Path("/input/GENERIC/file.json")) is None

    def test_nested_path(self):
        """Uses immediate parent directory, not deeper ancestors."""
        result = extract_methodology_from_path(Path("/data/input/schemas/VM0007/policy.json"))
        assert result == "VM0007"

    def test_mixed_case_directory(self):
        """Mixed-case directory is uppercased."""
        result = extract_methodology_from_path(Path("/input/Vm0042/schema.json"))
        assert result == "VM0042"

    def test_bare_filename_returns_empty_string(self):
        """File with no meaningful parent returns empty string, not None."""
        result = extract_methodology_from_path(Path("file.json"))
        assert result == ""
