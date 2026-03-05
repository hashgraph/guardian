from unittest.mock import AsyncMock, MagicMock

import pytest
from qdrant_client import models

from mcp_server.models import FieldCondition, SearchFilter
from vector_store import QdrantConnector


@pytest.mark.asyncio
async def test_qdrant_search_with_filter(
    mock_async_qdrant_client,
    mock_qdrant_connector,
    mock_embedding_provider,
    mock_embedding_vector,
    mock_collection_name,
):
    """Test QdrantConnector search with native qdrant filter."""
    # Create a native qdrant filter
    query_filter = models.Filter(
        must=[
            models.FieldCondition(
                key="metadata.source", match=models.MatchValue(value="test_source")
            )
        ]
    )
    query = "test"
    limit = 11

    await mock_qdrant_connector.search(query, query_filter=query_filter, limit=limit)

    # Verify embedding was generated for the query
    mock_embedding_provider.embed_query.assert_awaited_once_with(query)

    # Verify query_points was called with expected core parameters
    mock_async_qdrant_client.query_points.assert_awaited_once()
    call_kwargs = mock_async_qdrant_client.query_points.call_args.kwargs
    assert call_kwargs["collection_name"] == mock_collection_name
    assert call_kwargs["query"] == mock_embedding_vector
    assert call_kwargs["limit"] == limit
    assert call_kwargs["query_filter"] == query_filter


@pytest.mark.asyncio
async def test_mcp_search_methodology_with_filter_query_and_filters(
    mcp_server, mock_methodology_connector
):
    """Test search with both query and filters using SearchFilter.to_qdrant()."""
    query = "test query"
    filters = SearchFilter(
        must=[
            FieldCondition(key="metadata.source", match=models.MatchValue(value="methodology_name"))
        ]
    )
    limit = 10

    # Mock search results
    mock_methodology_connector.search.return_value = []

    # Call the tool through the MCP server with converted filter
    await mcp_server._methodology_connector.search(
        query, query_filter=filters.to_qdrant(), limit=limit
    )

    # Verify the connector was called correctly
    mock_methodology_connector.search.assert_awaited_once()


@pytest.mark.asyncio
async def test_mcp_search_methodology_with_filter_filters_only(
    mcp_server, mock_methodology_connector
):
    """Test search with filters only (no query)."""
    filters = SearchFilter(
        must=[
            FieldCondition(key="metadata.source", match=models.MatchValue(value="methodology_name"))
        ]
    )
    limit = 5

    # Mock search results
    mock_methodology_connector.search.return_value = []

    # Call with empty query and converted filter
    await mcp_server._methodology_connector.search(
        "", query_filter=filters.to_qdrant(), limit=limit
    )

    # Verify the connector was called with empty query
    mock_methodology_connector.search.assert_awaited_once()


@pytest.mark.asyncio
async def test_mcp_search_methodology_with_filter_query_only(
    mcp_server, mock_methodology_connector
):
    """Test search with query only (no filters)."""
    query = "test query"
    limit = 5

    # Mock search results
    mock_methodology_connector.search.return_value = []

    # Call with no filters
    await mcp_server._methodology_connector.search(query, limit=limit)

    # Verify the connector was called correctly
    mock_methodology_connector.search.assert_awaited_once_with(query, limit=limit)


@pytest.mark.asyncio
async def test_mcp_search_methodology_with_must_and_should_filters(
    mcp_server, mock_methodology_connector
):
    """Test search with both must and should conditions."""
    query = "test query"
    filters = SearchFilter(
        must=[
            FieldCondition(key="metadata.source", match=models.MatchValue(value="methodology_name"))
        ],
        should=[
            FieldCondition(key="metadata.section", match=models.MatchValue(value="applicability"))
        ],
    )
    limit = 5

    # Mock search results
    mock_methodology_connector.search.return_value = []

    # Call with both must and should filters using to_qdrant()
    await mcp_server._methodology_connector.search(
        query, query_filter=filters.to_qdrant(), limit=limit
    )

    # Verify the connector was called correctly
    mock_methodology_connector.search.assert_awaited_once()


@pytest.mark.asyncio
async def test_hybrid_search_filter_in_prefetch():
    """Test that hybrid_search passes filter into each Prefetch (not top-level)."""
    # Build a hybrid provider mock
    mock_provider = MagicMock()
    mock_provider.embed_query = AsyncMock(
        return_value={"dense": [0.1] * 1024, "sparse": {1: 0.5, 100: 0.3}}
    )
    mock_provider.get_dense_vector_size = MagicMock(return_value=1024)

    mock_client = AsyncMock()
    mock_client.collection_exists.return_value = True
    mock_result = MagicMock()
    mock_result.points = []
    mock_client.query_points.return_value = mock_result

    connector = QdrantConnector(
        url="http://localhost:6333",
        collection_name="test_methodology",
        embedding_provider=mock_provider,
        client=mock_client,
    )

    query_filter = models.Filter(
        must=[
            models.FieldCondition(
                key="metadata.source_name",
                match=models.MatchValue(value="VCS-VM0042"),
            )
        ]
    )

    await connector.hybrid_search(
        query="applicability conditions",
        query_filter=query_filter,
        limit=10,
    )

    call_kwargs = mock_client.query_points.call_args.kwargs

    # Filter must NOT be at top level when prefetch is used
    assert "query_filter" not in call_kwargs

    # Filter must be inside each Prefetch
    prefetch = call_kwargs["prefetch"]
    assert len(prefetch) == 2
    for pf in prefetch:
        assert pf.filter == query_filter
