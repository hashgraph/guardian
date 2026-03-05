"""Tests for QdrantConnector."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from qdrant_client import models

from vector_store import CollectionStats, QdrantConnector, SearchResult


class TestQdrantConnectorInit:
    """Tests for QdrantConnector initialization."""

    def test_init_with_required_params(self, mock_embedding_provider):
        """Test initialization with required parameters."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient"):
            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
            )

            assert connector.url == "http://localhost:6333"
            assert connector.collection_name == "test_collection"
            assert connector.embedding_provider == mock_embedding_provider
            assert connector.api_key is None
            assert connector.timeout == 60

    def test_init_with_optional_params(self, mock_embedding_provider):
        """Test initialization with optional parameters."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient"):
            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
                api_key="test-key",
                timeout=120,
            )

            assert connector.api_key == "test-key"
            assert connector.timeout == 120

    def test_init_with_injected_client(self, mock_embedding_provider):
        """Test that an injected client is stored directly without creating a new one."""
        mock_client = AsyncMock()
        connector = QdrantConnector(
            url="http://localhost:6333",
            collection_name="test_collection",
            embedding_provider=mock_embedding_provider,
            client=mock_client,
        )
        assert connector._client is mock_client

    def test_owns_client_when_created_internally(self, mock_embedding_provider):
        """Test that connector owns client when none is injected."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient"):
            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
            )
            assert connector._owns_client is True

    def test_does_not_own_injected_client(self, mock_embedding_provider):
        """Test that connector does not own an injected client."""
        mock_client = AsyncMock()
        connector = QdrantConnector(
            url="http://localhost:6333",
            collection_name="test_collection",
            embedding_provider=mock_embedding_provider,
            client=mock_client,
        )
        assert connector._owns_client is False

    @pytest.mark.asyncio
    async def test_close_skips_injected_client(self, mock_embedding_provider):
        """Test that close() does not close an injected client."""
        mock_client = AsyncMock()
        connector = QdrantConnector(
            url="http://localhost:6333",
            collection_name="test_collection",
            embedding_provider=mock_embedding_provider,
            client=mock_client,
        )

        await connector.close()

        mock_client.close.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_close_closes_owned_client(self, mock_embedding_provider):
        """Test that close() closes a self-created client."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient") as mock_cls:
            mock_client = AsyncMock()
            mock_cls.return_value = mock_client
            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
            )

            await connector.close()

            mock_client.close.assert_awaited_once()


class TestEnsureCollectionExists:
    """Tests for ensure_collection_exists method."""

    @pytest.mark.asyncio
    async def test_collection_already_exists(self, mock_embedding_provider):
        """Test when collection already exists."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            mock_client.collection_exists.return_value = True

            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
            )

            await connector.ensure_collection_exists()

            mock_client.collection_exists.assert_called_once_with("test_collection")
            mock_client.create_collection.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_collection_with_auto_size(self, mock_embedding_provider):
        """Test creating collection with auto-detected vector size."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            mock_client.collection_exists.return_value = False

            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
            )

            await connector.ensure_collection_exists()

            mock_embedding_provider.get_vector_size.assert_called_once()
            mock_client.create_collection.assert_called_once()

            # Check the call arguments
            call_args = mock_client.create_collection.call_args
            assert call_args[1]["collection_name"] == "test_collection"

    @pytest.mark.asyncio
    async def test_create_collection_with_explicit_size(self, mock_embedding_provider):
        """Test creating collection with explicit vector size."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            mock_client.collection_exists.return_value = False

            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
            )

            await connector.ensure_collection_exists(vector_size=512)

            mock_embedding_provider.get_vector_size.assert_not_called()
            mock_client.create_collection.assert_called_once()


class TestSearch:
    """Tests for search method."""

    @pytest.mark.asyncio
    async def test_search_success(self, mock_embedding_provider, sample_search_results):
        """Test successful search."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            mock_client.collection_exists.return_value = True

            mock_result = MagicMock()
            mock_result.points = sample_search_results
            mock_client.query_points.return_value = mock_result

            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
            )

            results = await connector.search("test query", limit=5)

            assert len(results) == 3
            assert all(isinstance(r, SearchResult) for r in results)
            assert results[0].score == 0.95
            assert results[0].content == "Sample document 0"

            mock_embedding_provider.embed_query.assert_called_once_with("test query")
            mock_client.query_points.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_collection_not_exists(self, mock_embedding_provider):
        """Test search when collection doesn't exist."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            mock_client.collection_exists.return_value = False

            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
            )

            results = await connector.search("test query")

            assert results == []
            mock_client.query_points.assert_not_called()

    @pytest.mark.asyncio
    async def test_search_with_score_threshold(
        self, mock_embedding_provider, sample_search_results
    ):
        """Test search with score threshold."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            mock_client.collection_exists.return_value = True

            mock_result = MagicMock()
            mock_result.points = sample_search_results
            mock_client.query_points.return_value = mock_result

            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
            )

            await connector.search("test query", score_threshold=0.8)

            mock_client.query_points.assert_called_once()
            call_kwargs = mock_client.query_points.call_args[1]
            assert "score_threshold" in call_kwargs
            assert call_kwargs["score_threshold"] == 0.8


class TestGetStats:
    """Tests for get_stats method."""

    @pytest.mark.asyncio
    async def test_get_stats_success(self, mock_embedding_provider):
        """Test getting collection stats."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            mock_client.collection_exists.return_value = True

            mock_info = MagicMock()
            mock_info.vectors_count = 100
            mock_info.points_count = 100
            mock_info.indexed_vectors_count = 95
            mock_info.status = MagicMock(value="green")

            mock_config = MagicMock()
            mock_config.params.vectors.size = 1024
            mock_config.params.vectors.distance = MagicMock(value="Cosine")
            mock_info.config = mock_config

            mock_info.payload_schema = {
                "metadata.source": MagicMock(data_type=MagicMock(value="keyword")),
            }

            mock_client.get_collection.return_value = mock_info

            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
            )

            stats = await connector.get_stats()

            assert isinstance(stats, CollectionStats)
            assert stats.name == "test_collection"
            assert stats.vectors_count == 100
            assert stats.points_count == 100
            assert stats.indexed_vectors_count == 95
            assert stats.status == "green"
            assert stats.payload_schema is not None
            assert len(stats.payload_schema) == 1
            field = stats.payload_schema[0]
            assert field.key == "metadata.source"
            assert field.type == "keyword"
            assert field.recommended_match == "match.value (exact string match)"
            assert field.example == {
                "key": "metadata.source",
                "match": {"value": "<exact string>"},
            }

    @pytest.mark.asyncio
    async def test_get_stats_collection_not_exists(self, mock_embedding_provider):
        """Test get_stats when collection doesn't exist."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            mock_client.collection_exists.return_value = False

            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
            )

            result = await connector.get_stats()
            assert result.name == "test_collection"
            assert result.points_count == 0
            assert result.vectors_count == 0
            assert result.indexed_vectors_count == 0
            assert result.status == "not_found"
            assert result.config is None
            assert result.payload_schema is None
            mock_client.get_collection.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_stats_empty_payload_schema_dict(self, mock_embedding_provider):
        """Test get_stats when payload_schema is an empty dict (no indexed fields)."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            mock_client.collection_exists.return_value = True

            mock_info = MagicMock()
            mock_info.vectors_count = 50
            mock_info.points_count = 50
            mock_info.indexed_vectors_count = 50
            mock_info.status = MagicMock(value="green")

            mock_config = MagicMock()
            mock_config.params.vectors.size = 1024
            mock_config.params.vectors.distance = MagicMock(value="Cosine")
            mock_info.config = mock_config
            mock_info.payload_schema = {}

            mock_client.get_collection.return_value = mock_info

            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
            )

            stats = await connector.get_stats()
            assert stats.payload_schema is None

    @pytest.mark.asyncio
    async def test_get_stats_no_payload_schema(self, mock_embedding_provider):
        """Test get_stats when collection has no payload indexes."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            mock_client.collection_exists.return_value = True

            mock_info = MagicMock()
            mock_info.vectors_count = 50
            mock_info.points_count = 50
            mock_info.indexed_vectors_count = 50
            mock_info.status = MagicMock(value="green")

            mock_config = MagicMock()
            mock_config.params.vectors.size = 1024
            mock_config.params.vectors.distance = MagicMock(value="Cosine")
            mock_info.config = mock_config
            mock_info.payload_schema = None

            mock_client.get_collection.return_value = mock_info

            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
            )

            stats = await connector.get_stats()
            assert stats.payload_schema is None


class TestContextManager:
    """Tests for async context manager."""

    @pytest.mark.asyncio
    async def test_context_manager(self, mock_embedding_provider):
        """Test using connector as async context manager."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            mock_client.close = AsyncMock()

            async with QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
                embedding_provider=mock_embedding_provider,
            ) as connector:
                assert connector is not None

            # Verify close was called
            mock_client.close.assert_called_once()


class TestSearchAcorn:
    """Tests for ACORN search params gated on query_filter in dense search."""

    @pytest.mark.asyncio
    async def test_acorn_enabled_when_filter_present(self, mock_embedding_provider):
        """search_params includes ACORN when query_filter is provided."""
        mock_client = AsyncMock()
        mock_client.collection_exists.return_value = True

        mock_result = MagicMock()
        mock_result.points = []
        mock_client.query_points.return_value = mock_result

        connector = QdrantConnector(
            url="http://localhost:6333",
            collection_name="test_collection",
            embedding_provider=mock_embedding_provider,
            client=mock_client,
        )

        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="metadata.source_name",
                    match=models.MatchValue(value="test_source"),
                )
            ]
        )

        await connector.search("test query", limit=5, query_filter=query_filter)

        call_kwargs = mock_client.query_points.call_args.kwargs
        assert "search_params" in call_kwargs
        assert call_kwargs["search_params"].acorn is not None
        assert call_kwargs["search_params"].acorn.enable is True

    @pytest.mark.asyncio
    async def test_acorn_not_set_without_filter(self, mock_embedding_provider):
        """search_params omitted when no query_filter is provided."""
        mock_client = AsyncMock()
        mock_client.collection_exists.return_value = True

        mock_result = MagicMock()
        mock_result.points = []
        mock_client.query_points.return_value = mock_result

        connector = QdrantConnector(
            url="http://localhost:6333",
            collection_name="test_collection",
            embedding_provider=mock_embedding_provider,
            client=mock_client,
        )

        await connector.search("test query", limit=5)

        call_kwargs = mock_client.query_points.call_args.kwargs
        assert "search_params" not in call_kwargs

    @pytest.mark.asyncio
    async def test_acorn_not_set_for_filter_only_search(self, mock_embedding_provider):
        """search_params omitted for filter-only search (no query vector)."""
        mock_client = AsyncMock()
        mock_client.collection_exists.return_value = True

        mock_result = MagicMock()
        mock_result.points = []
        mock_client.query_points.return_value = mock_result

        connector = QdrantConnector(
            url="http://localhost:6333",
            collection_name="test_collection",
            client=mock_client,
        )

        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="metadata.source_name",
                    match=models.MatchValue(value="test_source"),
                )
            ]
        )

        await connector.search(query=None, limit=5, query_filter=query_filter)

        call_kwargs = mock_client.query_points.call_args.kwargs
        assert "search_params" not in call_kwargs
        assert call_kwargs["query_filter"] == query_filter


class TestQdrantConnectorWithoutEmbedding:
    """Tests for QdrantConnector without embedding_provider (parent orchestrator mode)."""

    def test_create_without_embedding_provider(self):
        """Test that QdrantConnector can be created without embedding_provider."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient"):
            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
            )

            assert connector.url == "http://localhost:6333"
            assert connector.collection_name == "test_collection"
            assert connector.embedding_provider is None

    @pytest.mark.asyncio
    async def test_ensure_collection_with_explicit_vector_size(self):
        """Test ensure_collection_exists works without embedding_provider when vector_size is given."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            mock_client.collection_exists.return_value = False

            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
            )

            await connector.ensure_collection_exists(vector_size=1024)

            mock_client.create_collection.assert_called_once()

    @pytest.mark.asyncio
    async def test_ensure_collection_without_vector_size_raises(self):
        """Test ensure_collection_exists raises ValueError without embedding_provider and no vector_size."""
        with patch("vector_store.qdrant_connector.AsyncQdrantClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            mock_client.collection_exists.return_value = False

            connector = QdrantConnector(
                url="http://localhost:6333",
                collection_name="test_collection",
            )

            with pytest.raises(ValueError, match="vector_size is required"):
                await connector.ensure_collection_exists()
