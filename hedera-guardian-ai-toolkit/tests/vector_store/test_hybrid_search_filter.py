"""Tests for hybrid_search filter propagation into Prefetch objects."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from qdrant_client import models

from vector_store import QdrantConnector


@pytest.fixture
def hybrid_connector():
    """Create a QdrantConnector with a mocked hybrid embedding provider and client."""
    mock_client = AsyncMock()
    mock_client.collection_exists.return_value = True

    mock_result = MagicMock()
    mock_result.points = []
    mock_client.query_points.return_value = mock_result

    # Create a hybrid (MultiVectorEmbeddingProvider) mock
    mock_provider = MagicMock()
    mock_provider.embed_query = AsyncMock(
        return_value={
            "dense": [0.1] * 1024,
            "sparse": {1: 0.5, 100: 0.3},
        }
    )
    mock_provider.get_dense_vector_size = MagicMock(return_value=1024)

    connector = QdrantConnector(
        url="http://localhost:6333",
        collection_name="test_collection",
        embedding_provider=mock_provider,
        client=mock_client,
    )

    yield connector, mock_client, mock_provider


class TestHybridSearchFilterInPrefetch:
    """Tests for filter placement inside Prefetch objects."""

    @pytest.mark.asyncio
    async def test_filter_passed_to_prefetch(self, hybrid_connector):
        """Test that query_filter is placed inside each Prefetch object."""
        connector, mock_client, _ = hybrid_connector

        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="metadata.source_name",
                    match=models.MatchValue(value="test_source"),
                )
            ]
        )

        await connector.hybrid_search(
            query="test query",
            query_filter=query_filter,
            limit=10,
        )

        mock_client.query_points.assert_awaited_once()
        call_kwargs = mock_client.query_points.call_args.kwargs

        # Filter should NOT be at top level when prefetch is used
        assert "query_filter" not in call_kwargs

        # Filter should be in each Prefetch
        prefetch = call_kwargs["prefetch"]
        assert len(prefetch) == 2
        assert prefetch[0].filter == query_filter
        assert prefetch[1].filter == query_filter

    @pytest.mark.asyncio
    async def test_no_filter_means_no_prefetch_filter(self, hybrid_connector):
        """Test that no filter results in None filter on Prefetch objects."""
        connector, mock_client, _ = hybrid_connector

        await connector.hybrid_search(query="test query", limit=10)

        call_kwargs = mock_client.query_points.call_args.kwargs

        prefetch = call_kwargs["prefetch"]
        assert len(prefetch) == 2
        assert prefetch[0].filter is None
        assert prefetch[1].filter is None

        # No top-level query_filter either
        assert "query_filter" not in call_kwargs

    @pytest.mark.asyncio
    async def test_filter_only_uses_top_level(self, hybrid_connector):
        """Test that filter-only (no query) path uses top-level query_filter."""
        connector, mock_client, _ = hybrid_connector

        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="metadata.source_name",
                    match=models.MatchValue(value="test_source"),
                )
            ]
        )

        await connector.hybrid_search(
            query=None,
            query_filter=query_filter,
            limit=10,
        )

        call_kwargs = mock_client.query_points.call_args.kwargs

        # Should be top-level since there are no Prefetch objects
        assert call_kwargs["query_filter"] == query_filter
        assert "prefetch" not in call_kwargs

    @pytest.mark.asyncio
    async def test_prefetch_limit_increased_with_filter(self, hybrid_connector):
        """Test that prefetch limit is increased when filter is present."""
        connector, mock_client, _ = hybrid_connector

        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="metadata.source_name",
                    match=models.MatchValue(value="test_source"),
                )
            ]
        )

        await connector.hybrid_search(
            query="test query",
            query_filter=query_filter,
            limit=10,
            prefetch_limit=20,
        )

        call_kwargs = mock_client.query_points.call_args.kwargs
        prefetch = call_kwargs["prefetch"]

        # effective_prefetch = max(20, 10 * 4) = 40
        assert prefetch[0].limit == 40
        assert prefetch[1].limit == 40

    @pytest.mark.asyncio
    async def test_prefetch_limit_unchanged_without_filter(self, hybrid_connector):
        """Test that prefetch limit stays at default when no filter."""
        connector, mock_client, _ = hybrid_connector

        await connector.hybrid_search(
            query="test query",
            limit=10,
            prefetch_limit=20,
        )

        call_kwargs = mock_client.query_points.call_args.kwargs
        prefetch = call_kwargs["prefetch"]

        assert prefetch[0].limit == 20
        assert prefetch[1].limit == 20

    @pytest.mark.asyncio
    async def test_prefetch_limit_not_reduced_by_filter(self, hybrid_connector):
        """Test that prefetch_limit is not reduced when it's already > limit*4."""
        connector, mock_client, _ = hybrid_connector

        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="metadata.source_name",
                    match=models.MatchValue(value="test_source"),
                )
            ]
        )

        await connector.hybrid_search(
            query="test query",
            query_filter=query_filter,
            limit=5,
            prefetch_limit=50,
        )

        call_kwargs = mock_client.query_points.call_args.kwargs
        prefetch = call_kwargs["prefetch"]

        # effective_prefetch = max(50, 5 * 4) = 50 (prefetch_limit wins)
        assert prefetch[0].limit == 50
        assert prefetch[1].limit == 50

    @pytest.mark.asyncio
    async def test_no_query_no_filter_calls_query_points_unfiltered(self, hybrid_connector):
        """Test that query=None, query_filter=None results in unfiltered search."""
        connector, mock_client, _ = hybrid_connector

        await connector.hybrid_search(
            query=None,
            query_filter=None,
            limit=10,
        )

        mock_client.query_points.assert_awaited_once()
        call_kwargs = mock_client.query_points.call_args.kwargs

        # No prefetch, no query_filter, no query
        assert "prefetch" not in call_kwargs
        assert "query_filter" not in call_kwargs
        assert "query" not in call_kwargs
        assert call_kwargs["collection_name"] == "test_collection"
        assert call_kwargs["limit"] == 10


class TestHybridSearchAcorn:
    """Tests for ACORN search params in hybrid search Prefetch."""

    @pytest.mark.asyncio
    async def test_acorn_enabled_when_filter_present(self, hybrid_connector):
        """ACORN should be enabled in Prefetch params when a filter is provided."""
        connector, mock_client, _ = hybrid_connector

        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="metadata.source_name",
                    match=models.MatchValue(value="test_source"),
                )
            ]
        )

        await connector.hybrid_search(query="test query", query_filter=query_filter, limit=10)

        call_kwargs = mock_client.query_points.call_args.kwargs
        prefetch = call_kwargs["prefetch"]

        # ACORN only affects HNSW (dense), not inverted index (sparse)
        dense_pf = [pf for pf in prefetch if pf.using == "dense"]
        sparse_pf = [pf for pf in prefetch if pf.using == "sparse"]

        for pf in dense_pf:
            assert pf.params is not None
            assert pf.params.acorn is not None
            assert pf.params.acorn.enable is True

        for pf in sparse_pf:
            assert pf.params is None

    @pytest.mark.asyncio
    async def test_acorn_not_set_without_filter(self, hybrid_connector):
        """ACORN params should be None when no filter is provided."""
        connector, mock_client, _ = hybrid_connector

        await connector.hybrid_search(query="test query", limit=10)

        call_kwargs = mock_client.query_points.call_args.kwargs
        prefetch = call_kwargs["prefetch"]

        for pf in prefetch:
            assert pf.params is None
