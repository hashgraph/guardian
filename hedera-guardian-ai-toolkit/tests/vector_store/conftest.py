"""Shared test fixtures for vector_store tests."""

from unittest.mock import AsyncMock, MagicMock

import pytest


@pytest.fixture
def mock_embedding_provider():
    """Mock async embedding provider."""
    provider = AsyncMock()
    provider.embed_query.return_value = [0.1] * 1024
    provider.embed_batch.return_value = [[0.1] * 1024, [0.2] * 1024, [0.3] * 1024]
    # get_vector_size is NOT async, so use MagicMock for it
    provider.get_vector_size = MagicMock(return_value=1024)
    return provider


@pytest.fixture
def mock_qdrant_client():
    """Mock AsyncQdrantClient."""
    client = AsyncMock()

    # Mock collection_exists
    client.collection_exists.return_value = True

    # Mock create_collection
    client.create_collection.return_value = None

    # Mock upsert
    client.upsert.return_value = None

    # Mock query_points
    mock_result = MagicMock()
    mock_result.points = []
    client.query_points.return_value = mock_result

    # Mock get_collection
    mock_collection_info = MagicMock()
    mock_collection_info.vectors_count = 10
    mock_collection_info.points_count = 10
    mock_collection_info.indexed_vectors_count = 10
    mock_collection_info.status = MagicMock(value="green")

    mock_config = MagicMock()
    mock_config.params.vectors.size = 1024
    mock_config.params.vectors.distance = MagicMock(value="Cosine")
    mock_collection_info.config = mock_config
    mock_collection_info.payload_schema = None

    client.get_collection.return_value = mock_collection_info

    # Mock delete
    client.delete.return_value = None

    # Mock delete_collection
    client.delete_collection.return_value = None

    # Mock close
    client.close.return_value = None

    return client


@pytest.fixture
def sample_documents():
    """Sample documents for testing."""
    return [
        "FastEmbed is a fast and efficient embedding library.",
        "Qdrant is a vector search engine.",
        "Semantic search enables finding similar content.",
    ]


@pytest.fixture
def sample_metadata():
    """Sample metadata for testing."""
    return [
        {"source": "doc1.txt", "type": "documentation"},
        {"source": "doc2.txt", "type": "documentation"},
        {"source": "doc3.txt", "type": "documentation"},
    ]


@pytest.fixture
def sample_search_results():
    """Sample search results from Qdrant."""
    results = []

    for i, score in enumerate([0.95, 0.87, 0.75]):
        mock_point = MagicMock()
        mock_point.id = f"id-{i}"
        mock_point.score = score
        mock_point.payload = {
            "document_chunk": f"Sample document {i}",
            "metadata": {"index": i},
        }
        results.append(mock_point)

    return results
