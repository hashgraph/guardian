import pytest
from fastmcp.client import Client

from vector_store import QdrantConnector


@pytest.mark.asyncio
async def test_methodology_document_search_tool(
    mock_mcp_client: Client,
    mock_qdrant_connector: QdrantConnector,
    mock_search_results,
):
    """Test calling methodology_documents_search tool with mock data."""
    query = "test query"
    limit = 5
    # Call the tool through the MCP client
    call_tool_result = await mock_mcp_client.call_tool(
        "methodology_documents_search", arguments={"query": query, "limit": limit}
    )
    data = call_tool_result.data

    # Verify the connector's search method was called with the query
    mock_qdrant_connector.search.assert_awaited_once()

    assert data is not None
    assert len(data) > 0

    mock_search_results_json = [result.model_dump() for result in mock_search_results]

    assert data == mock_search_results_json
