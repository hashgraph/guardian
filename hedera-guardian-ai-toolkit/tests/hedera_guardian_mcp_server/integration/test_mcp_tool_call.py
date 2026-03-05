import pytest
from fastmcp.client import Client


@pytest.mark.integration
@pytest.mark.asyncio
async def test_methodology_document_search_tool(
    mcp_client: Client,
    mock_document_data_science_question: str,
    mock_document_data_science_best_answer: str,
):
    """Test calling methodology_documents_search tool with mock data."""

    # Call the tool through the MCP client
    call_tool_result = await mcp_client.call_tool(
        "methodology_documents_search",
        arguments={"query": mock_document_data_science_question, "limit": 5},
    )
    data = call_tool_result.data

    assert data is not None
    assert len(data) > 0

    assert data[0]["content"] == mock_document_data_science_best_answer


@pytest.mark.integration
@pytest.mark.asyncio
async def test_methodology_document_search_with_filter_must_condition(
    mcp_client: Client,
):
    # Filter for documents with source_name='methodology_gs' AND has_table=true
    filter_args = {
        "must": [
            {"key": "metadata.source_name", "match": {"value": "methodology_gs"}},
            {"key": "metadata.has_table", "match": {"value": True}},
        ]
    }

    call_tool_result = await mcp_client.call_tool(
        "methodology_documents_search",
        arguments={"filter": filter_args, "limit": 10},
    )
    data = call_tool_result.data

    assert data is not None
    assert len(data) > 0

    # All results should match the filter criteria
    for result in data:
        metadata = result["metadata"]
        assert metadata["source_name"] == "methodology_gs"
        assert metadata["has_table"] is True


@pytest.mark.integration
@pytest.mark.asyncio
async def test_methodology_document_search_with_filter_should_condition(
    mcp_client: Client,
):
    """Test methodology_document_search_with_filter with should condition on metadata."""

    # Filter for documents with source_name='methodology_verra' OR source_name='methodology_gs'
    filter_args = {
        "should": [
            {"key": "metadata.source_name", "match": {"value": "methodology_verra"}},
            {"key": "metadata.source_name", "match": {"value": "methodology_gs"}},
        ]
    }

    call_tool_result = await mcp_client.call_tool(
        "methodology_documents_search",
        arguments={"filter": filter_args, "limit": 10},
    )
    data = call_tool_result.data

    assert data is not None
    assert len(data) > 0

    # All results should match at least one of the should conditions
    for result in data:
        metadata = result["metadata"]
        assert metadata["source_name"] in ["methodology_verra", "methodology_gs"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_methodology_document_search_with_combined_filter(
    mcp_client: Client,
):
    """Test methodology_document_search_with_filter with combined must and should conditions."""

    # Filter for documents with source_format='pdf' (must)
    # AND (source_name='methodology_gs' OR source_name='methodology_cdm') (should)
    filter_args = {
        "must": [{"key": "metadata.source_format", "match": {"value": "pdf"}}],
        "should": [
            {"key": "metadata.source_name", "match": {"value": "methodology_gs"}},
            {"key": "metadata.source_name", "match": {"value": "methodology_cdm"}},
        ],
    }

    call_tool_result = await mcp_client.call_tool(
        "methodology_documents_search",
        arguments={"filter": filter_args, "limit": 10},
    )
    data = call_tool_result.data

    assert data is not None
    assert len(data) > 0

    # All results should match the must condition and at least one should condition
    for result in data:
        metadata = result["metadata"]
        assert metadata["source_format"] == "pdf"
        assert metadata["source_name"] in ["methodology_gs", "methodology_cdm"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_methodology_document_search_with_query_and_filter(
    mcp_client: Client,
):
    """Test methodology_document_search_with_filter with both query and filter."""

    # Search for "artificial intelligence" with filter for source_name='methodology_verra'
    filter_args = {
        "must": [{"key": "metadata.source_name", "match": {"value": "methodology_verra"}}]
    }

    call_tool_result = await mcp_client.call_tool(
        "methodology_documents_search",
        arguments={"query": "artificial intelligence", "filter": filter_args, "limit": 5},
    )
    data = call_tool_result.data

    assert data is not None
    assert len(data) > 0

    # All results should match the filter
    for result in data:
        metadata = result["metadata"]
        assert metadata["source_name"] == "methodology_verra"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_methodology_document_search_with_filter_no_results(
    mcp_client: Client,
):
    """Test methodology_document_search_with_filter with filter that matches nothing."""

    # Filter for non-existent values
    filter_args = {
        "must": [
            {"key": "metadata.source_name", "match": {"value": "nonexistent"}},
            {"key": "metadata.source_format", "match": {"value": "nonexistent"}},
        ]
    }

    call_tool_result = await mcp_client.call_tool(
        "methodology_documents_search",
        arguments={"filter": filter_args, "limit": 10},
    )
    data = call_tool_result.data

    # Should return empty list when no matches
    assert data is not None
    assert len(data) == 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_methodology_document_search_with_pagination(
    mcp_client: Client,
):
    """Test methodology_document_search_with_filter with pagination."""

    # Filter for source_name='methodology_gs' (4 docs: chunks 1, 3, 8, 11)
    filter_args = {"must": [{"key": "metadata.source_name", "match": {"value": "methodology_gs"}}]}

    # Get first page
    call_tool_result_page1 = await mcp_client.call_tool(
        "methodology_documents_search",
        arguments={"filter": filter_args, "limit": 2, "offset": 0},
    )
    data_page1 = call_tool_result_page1.data

    # Get second page
    call_tool_result_page2 = await mcp_client.call_tool(
        "methodology_documents_search",
        arguments={"filter": filter_args, "limit": 2, "offset": 2},
    )
    data_page2 = call_tool_result_page2.data

    assert data_page1 is not None
    assert data_page2 is not None
    assert len(data_page1) > 0
    assert len(data_page2) > 0

    # Pages should contain different results (use content hash for comparison)
    page1_contents = {result["content"] for result in data_page1}
    page2_contents = {result["content"] for result in data_page2}
    assert page1_contents.isdisjoint(page2_contents)  # No overlap between pages

    # All results should match the filter
    for result in data_page1 + data_page2:
        metadata = result["metadata"]
        assert metadata["source_name"] == "methodology_gs"
