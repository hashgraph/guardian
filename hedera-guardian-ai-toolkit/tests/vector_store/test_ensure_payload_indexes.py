"""Tests for QdrantConnector.ensure_payload_indexes()."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from qdrant_client import models

from vector_store import QdrantConnector


@pytest.fixture
def connector_with_mock_client():
    """Create a QdrantConnector with a mock client injected via DI."""
    mock_client = AsyncMock()
    mock_client.collection_exists.return_value = True
    mock_client.create_payload_index.return_value = None

    # Default: no existing indexes
    mock_collection_info = MagicMock()
    mock_collection_info.payload_schema = {}
    mock_client.get_collection.return_value = mock_collection_info

    connector = QdrantConnector(
        url="http://localhost:6333",
        collection_name="test_collection",
        client=mock_client,
    )

    yield connector, mock_client, mock_collection_info


class TestEnsurePayloadIndexes:
    """Tests for ensure_payload_indexes method."""

    @pytest.mark.asyncio
    async def test_creates_all_indexes(self, connector_with_mock_client):
        """Test that all provided indexes are created when none exist."""
        connector, mock_client, _ = connector_with_mock_client

        indexes = [
            ("metadata.source_name", models.PayloadSchemaType.KEYWORD),
            ("metadata.page_no", models.PayloadSchemaType.INTEGER),
            ("metadata.has_table", models.PayloadSchemaType.BOOL),
        ]

        await connector.ensure_payload_indexes(indexes)

        assert mock_client.create_payload_index.await_count == 3
        calls = mock_client.create_payload_index.call_args_list

        assert calls[0].kwargs["field_name"] == "metadata.source_name"
        assert calls[0].kwargs["field_schema"] == models.PayloadSchemaType.KEYWORD
        assert calls[0].kwargs["wait"] is True

        assert calls[1].kwargs["field_name"] == "metadata.page_no"
        assert calls[1].kwargs["field_schema"] == models.PayloadSchemaType.INTEGER

        assert calls[2].kwargs["field_name"] == "metadata.has_table"
        assert calls[2].kwargs["field_schema"] == models.PayloadSchemaType.BOOL

    @pytest.mark.asyncio
    async def test_skips_existing_indexes(self, connector_with_mock_client):
        """Test that already-existing indexes are skipped."""
        connector, mock_client, mock_info = connector_with_mock_client

        # Simulate "metadata.source_name" already indexed
        mock_info.payload_schema = {
            "metadata.source_name": MagicMock(),
        }

        indexes = [
            ("metadata.source_name", models.PayloadSchemaType.KEYWORD),
            ("metadata.page_no", models.PayloadSchemaType.INTEGER),
        ]

        await connector.ensure_payload_indexes(indexes)

        # Only page_no should be created
        assert mock_client.create_payload_index.await_count == 1
        call_kwargs = mock_client.create_payload_index.call_args.kwargs
        assert call_kwargs["field_name"] == "metadata.page_no"

    @pytest.mark.asyncio
    async def test_collection_not_exists_skips_gracefully(self, connector_with_mock_client):
        """Test graceful skip when collection does not exist."""
        connector, mock_client, _ = connector_with_mock_client
        mock_client.collection_exists.return_value = False

        indexes = [
            ("metadata.source_name", models.PayloadSchemaType.KEYWORD),
        ]

        await connector.ensure_payload_indexes(indexes)

        mock_client.get_collection.assert_not_awaited()
        mock_client.create_payload_index.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_partial_failure_continues(self, connector_with_mock_client):
        """Test that one index failure doesn't block others."""
        connector, mock_client, _ = connector_with_mock_client

        # First call fails, second succeeds
        mock_client.create_payload_index.side_effect = [
            Exception("Connection error"),
            None,
        ]

        indexes = [
            ("metadata.source_name", models.PayloadSchemaType.KEYWORD),
            ("metadata.page_no", models.PayloadSchemaType.INTEGER),
        ]

        # Should not raise
        await connector.ensure_payload_indexes(indexes)

        # Both were attempted
        assert mock_client.create_payload_index.await_count == 2

    @pytest.mark.asyncio
    async def test_empty_indexes_list_is_noop(self, connector_with_mock_client):
        """Test that empty indexes list does nothing."""
        connector, mock_client, _ = connector_with_mock_client

        await connector.ensure_payload_indexes([])

        mock_client.collection_exists.assert_not_awaited()
        mock_client.get_collection.assert_not_awaited()
        mock_client.create_payload_index.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_none_payload_schema_treated_as_empty(self, connector_with_mock_client):
        """Test that None payload_schema is treated as no existing indexes."""
        connector, mock_client, mock_info = connector_with_mock_client
        mock_info.payload_schema = None

        indexes = [
            ("metadata.source_name", models.PayloadSchemaType.KEYWORD),
        ]

        await connector.ensure_payload_indexes(indexes)

        assert mock_client.create_payload_index.await_count == 1
