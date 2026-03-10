import pytest

from vector_store import QdrantConnector


@pytest.mark.integration
@pytest.mark.asyncio
async def test_qdrant_search(
    qdrant_connector: QdrantConnector,
    mock_document_data_science_question: str,
    mock_document_data_science_best_answer: str,
):
    result = await qdrant_connector.search(mock_document_data_science_question)

    assert len(result) > 0
    assert result[0].content == mock_document_data_science_best_answer
