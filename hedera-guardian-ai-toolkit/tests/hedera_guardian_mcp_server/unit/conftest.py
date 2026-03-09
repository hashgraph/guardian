from unittest.mock import AsyncMock, Mock

import pytest
import pytest_asyncio
from fastmcp.client import Client
from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import QueryResponse
from qdrant_client.models import ScoredPoint

from mcp_server.server import HederaGuardianMCPServer
from vector_store import QdrantConnector
from vector_store.embeddings.base import AsyncEmbeddingProvider
from vector_store.models import DocumentPayload, SearchResult

METHODOLOGY_METADATA_1 = {
    "source": "unit_test",
    "source_name": "unit_test",
    "source_format": "pdf",
    "chunk_id": 0,
    "heading": "",
    "headings": [],
    "token_count": 100,
    "page_no": 1,
    "has_formula": False,
    "has_table": False,
    "has_figure": False,
    "formulas_declaration": [],
    "formulas_references": [],
    "tables_declaration": [],
}

METHODOLOGY_METADATA_2 = {
    "source": "unit_test",
    "source_name": "unit_test",
    "source_format": "pdf",
    "chunk_id": 1,
    "heading": "",
    "headings": [],
    "token_count": 50,
    "page_no": 1,
    "has_formula": False,
    "has_table": False,
    "has_figure": False,
    "formulas_declaration": [],
    "formulas_references": [],
    "tables_declaration": [],
}


@pytest.fixture
def mock_query_points() -> list[dict]:
    """Provides mocked query points for testing."""

    return QueryResponse(
        points=[
            ScoredPoint(
                id=1,
                version=1,
                score=0.95,
                payload=DocumentPayload(
                    document_chunk="Test document content",
                    metadata=METHODOLOGY_METADATA_1,
                ).model_dump(),
            ),
            ScoredPoint(
                id=2,
                version=1,
                score=0.90,
                payload=DocumentPayload(
                    document_chunk="Another test document",
                    metadata=METHODOLOGY_METADATA_2,
                ).model_dump(),
            ),
        ]
    )


@pytest.fixture
def mock_search_results() -> list[SearchResult]:
    """Provides mocked search results for testing."""
    return [
        SearchResult(
            content="Test document content",
            score=0.95,
            metadata=METHODOLOGY_METADATA_1,
        ),
        SearchResult(
            content="Another test document",
            score=0.90,
            metadata=METHODOLOGY_METADATA_2,
        ),
    ]


@pytest.fixture
def mock_async_qdrant_client(mock_query_points):
    """Provides a mocked Qdrant client for testing."""
    mock_client = Mock(spec=AsyncQdrantClient)
    mock_client.collection_exists = AsyncMock(return_value=True)
    mock_client.query_points = AsyncMock(return_value=mock_query_points)

    return mock_client


@pytest.fixture
def mock_embedding_vector() -> list[float]:
    """Provides a consistent mock embedding vector for testing."""
    return [0.1] * 1024


@pytest.fixture
def mock_embedding_provider(mock_embedding_vector) -> AsyncEmbeddingProvider:
    """Provides a mocked AsyncEmbeddingProvider for testing."""
    mock_provider = Mock(spec=AsyncEmbeddingProvider)
    mock_provider.embed_query = AsyncMock(return_value=mock_embedding_vector)

    return mock_provider


@pytest.fixture
def mock_collection_name() -> str:
    """Provides a consistent mock collection name for testing."""
    return "test_collection"


@pytest.fixture
def mock_qdrant_connector(
    mock_embedding_provider, mock_async_qdrant_client, mock_collection_name, mock_search_results
) -> QdrantConnector:
    mock_connector = QdrantConnector(
        url="http://localhost:6333",
        embedding_provider=mock_embedding_provider,
        collection_name=mock_collection_name,
        client=mock_async_qdrant_client,
    )

    mock_connector.search = AsyncMock(
        return_value=mock_search_results, side_effect=mock_connector.search
    )

    return mock_connector


@pytest.fixture
def mock_methodology_connector(mock_search_results) -> Mock:
    """Provides a mocked QdrantConnector for methodology documents."""
    mock_connector = Mock(spec=QdrantConnector)
    mock_connector.search = AsyncMock(return_value=mock_search_results)
    return mock_connector


@pytest.fixture
def mcp_server(mock_qdrant_connector, mock_methodology_connector) -> HederaGuardianMCPServer:
    """Provides an MCP server instance with mocked connectors."""
    return HederaGuardianMCPServer(
        schema_connector=mock_qdrant_connector,
        methodology_connector=mock_methodology_connector,
    )


@pytest_asyncio.fixture
async def mock_mcp_client(mock_qdrant_connector):
    """Fixture to create an MCP client for testing."""
    mcp = HederaGuardianMCPServer(
        schema_connector=mock_qdrant_connector,
        methodology_connector=mock_qdrant_connector,
    )

    async with Client(transport=mcp) as mcp_client:
        yield mcp_client
