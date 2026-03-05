"""Tests for filter key validation."""

from unittest.mock import AsyncMock

import pytest
from qdrant_client import models as qdrant_models

from mcp_server.filter_validation import (
    InvalidFilterKeyError,
    clear_filter_key_cache,
    extract_field_condition_keys,
    validate_filter_keys,
)
from mcp_server.models.slim_search_filter import FieldCondition, SearchFilter
from vector_store import QdrantConnector
from vector_store.models import CollectionStats, create_payload_field_schema


def _make_field_schema(key: str, field_type: str = "keyword"):
    """Helper to create a PayloadFieldSchema via the factory."""
    return create_payload_field_schema(key, field_type)


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear the validation cache before each test."""
    clear_filter_key_cache()
    yield
    clear_filter_key_cache()


@pytest.fixture
def mock_connector():
    """Create a mock QdrantConnector with payload schema."""
    connector = AsyncMock(spec=QdrantConnector)
    connector.url = "http://localhost:6333"
    connector.collection_name = "test_collection"
    connector.get_stats = AsyncMock(
        return_value=CollectionStats(
            name="test_collection",
            vectors_count=100,
            points_count=100,
            payload_schema=[
                _make_field_schema("metadata.source_name"),
                _make_field_schema("metadata.heading"),
                _make_field_schema("metadata.headings"),
                _make_field_schema("metadata.page_no", "integer"),
                _make_field_schema("metadata.source"),
                _make_field_schema("metadata.source_format"),
                _make_field_schema("metadata.chunk_id", "integer"),
                _make_field_schema("metadata.has_formula", "bool"),
                _make_field_schema("metadata.has_table", "bool"),
            ],
        )
    )
    return connector


class TestExtractFieldConditionKeys:
    """Tests for extract_field_condition_keys."""

    def test_extract_from_must(self):
        f = SearchFilter(must=[FieldCondition(key="metadata.source_name", match=None)])
        assert extract_field_condition_keys(f) == {"metadata.source_name"}

    def test_extract_from_should(self):
        f = SearchFilter(
            should=[
                FieldCondition(key="metadata.source_name", match=None),
                FieldCondition(key="metadata.heading", match=None),
            ]
        )
        assert extract_field_condition_keys(f) == {"metadata.source_name", "metadata.heading"}

    def test_extract_from_must_not(self):
        f = SearchFilter(must_not=FieldCondition(key="metadata.source_format", match=None))
        assert extract_field_condition_keys(f) == {"metadata.source_format"}

    def test_extract_from_all_clauses(self):
        f = SearchFilter(
            must=[FieldCondition(key="metadata.source_name", match=None)],
            should=[FieldCondition(key="metadata.heading", match=None)],
            must_not=[FieldCondition(key="metadata.page_no", match=None)],
        )
        keys = extract_field_condition_keys(f)
        assert keys == {"metadata.source_name", "metadata.heading", "metadata.page_no"}

    def test_empty_filter(self):
        f = SearchFilter()
        assert extract_field_condition_keys(f) == set()

    def test_extract_from_is_empty_condition(self):
        f = SearchFilter(
            must=[
                qdrant_models.IsEmptyCondition(
                    is_empty=qdrant_models.PayloadField(key="metadata.source_name")
                )
            ]
        )
        assert extract_field_condition_keys(f) == {"metadata.source_name"}

    def test_extract_from_is_null_condition(self):
        f = SearchFilter(
            must=[
                qdrant_models.IsNullCondition(
                    is_null=qdrant_models.PayloadField(key="metadata.heading")
                )
            ]
        )
        assert extract_field_condition_keys(f) == {"metadata.heading"}


class TestValidateFilterKeys:
    """Tests for validate_filter_keys."""

    @pytest.mark.asyncio
    async def test_valid_keys_pass(self, mock_connector):
        """Valid keys should not raise."""
        f = SearchFilter(must=[FieldCondition(key="metadata.source_name", match=None)])
        await validate_filter_keys(f, mock_connector)

    @pytest.mark.asyncio
    async def test_invalid_key_raises_with_suggestion(self, mock_connector):
        """Invalid key should raise InvalidFilterKeyError with 'did you mean?' suggestion."""
        f = SearchFilter(must=[FieldCondition(key="source_name", match=None)])
        with pytest.raises(
            InvalidFilterKeyError, match="source_name.*Did you mean.*metadata.source_name"
        ):
            await validate_filter_keys(f, mock_connector)

    @pytest.mark.asyncio
    async def test_missing_metadata_prefix_suggests_correct_key(self, mock_connector):
        """Bare field name without metadata. prefix should suggest the dotted version."""
        f = SearchFilter(must=[FieldCondition(key="heading", match=None)])
        with pytest.raises(InvalidFilterKeyError, match="metadata.heading"):
            await validate_filter_keys(f, mock_connector)

    @pytest.mark.asyncio
    async def test_empty_filter_skips_validation(self, mock_connector):
        """Empty filter (no conditions) should skip validation without calling get_stats."""
        f = SearchFilter()
        await validate_filter_keys(f, mock_connector)
        mock_connector.get_stats.assert_not_called()

    @pytest.mark.asyncio
    async def test_no_payload_schema_logs_warning(self):
        """When no payload schema is available, validation should log warning, not error."""
        connector = AsyncMock(spec=QdrantConnector)
        connector.url = "http://localhost:6333"
        connector.collection_name = "empty_collection"
        connector.get_stats = AsyncMock(
            return_value=CollectionStats(
                name="empty_collection",
                vectors_count=0,
                points_count=0,
                payload_schema=None,
            )
        )
        f = SearchFilter(must=[FieldCondition(key="anything", match=None)])
        # Should not raise
        await validate_filter_keys(f, connector)

    @pytest.mark.asyncio
    async def test_cache_avoids_repeated_get_stats(self, mock_connector):
        """TTL cache should prevent repeated get_stats calls for same collection."""
        f = SearchFilter(must=[FieldCondition(key="metadata.source_name", match=None)])
        await validate_filter_keys(f, mock_connector)
        await validate_filter_keys(f, mock_connector)
        await validate_filter_keys(f, mock_connector)

        # get_stats should only be called once due to caching
        assert mock_connector.get_stats.call_count == 1

    @pytest.mark.asyncio
    async def test_error_message_includes_available_fields(self, mock_connector):
        """Error message should list all available filterable fields."""
        f = SearchFilter(must=[FieldCondition(key="nonexistent_field", match=None)])
        with pytest.raises(InvalidFilterKeyError, match="Available filterable fields"):
            await validate_filter_keys(f, mock_connector)

    @pytest.mark.asyncio
    async def test_error_message_includes_hint(self, mock_connector):
        """Error message should include the dot-path hint."""
        f = SearchFilter(must=[FieldCondition(key="bad_key", match=None)])
        with pytest.raises(InvalidFilterKeyError, match="dot-paths"):
            await validate_filter_keys(f, mock_connector)

    @pytest.mark.asyncio
    async def test_validate_rejects_invalid_is_empty_key(self, mock_connector):
        """IsEmptyCondition with bad key should raise InvalidFilterKeyError."""
        f = SearchFilter(
            must=[
                qdrant_models.IsEmptyCondition(
                    is_empty=qdrant_models.PayloadField(key="source_name")
                )
            ]
        )
        with pytest.raises(InvalidFilterKeyError, match="source_name"):
            await validate_filter_keys(f, mock_connector)

    @pytest.mark.asyncio
    async def test_get_stats_exception_propagates(self, mock_connector):
        """RuntimeError from get_stats should propagate."""
        mock_connector.get_stats.side_effect = RuntimeError("Qdrant unavailable")
        f = SearchFilter(must=[FieldCondition(key="metadata.source_name", match=None)])
        with pytest.raises(RuntimeError, match="Qdrant unavailable"):
            await validate_filter_keys(f, mock_connector)

    @pytest.mark.asyncio
    async def test_multiple_invalid_keys_all_appear_in_error(self, mock_connector):
        """All invalid keys should appear in the error message."""
        f = SearchFilter(
            must=[FieldCondition(key="bad_one", match=None)],
            should=[FieldCondition(key="bad_two", match=None)],
        )
        with pytest.raises(InvalidFilterKeyError) as exc_info:
            await validate_filter_keys(f, mock_connector)
        assert "bad_one" in str(exc_info.value)
        assert "bad_two" in str(exc_info.value)
