"""Shared models for vector storage."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

# Mapping from Qdrant data-type string to (recommended_match, example_template).
# The example_template uses "{key}" as a placeholder for the actual field key.
FIELD_TYPE_MATCH_GUIDANCE: dict[str, tuple[str, dict[str, Any]]] = {
    "keyword": (
        "match.value (exact string match)",
        {"key": "{key}", "match": {"value": "<exact string>"}},
    ),
    "integer": (
        "match.value (exact) or range (gt/gte/lt/lte)",
        {"key": "{key}", "match": {"value": 42}},
    ),
    "bool": (
        "match.value (true/false)",
        {"key": "{key}", "match": {"value": True}},
    ),
    "text": (
        "match.text (full-text search, requires text index)",
        {"key": "{key}", "match": {"text": "<search terms>"}},
    ),
    "float": (
        "range (gt/gte/lt/lte)",
        {"key": "{key}", "range": {"gte": 0.0, "lte": 100.0}},
    ),
    "datetime": (
        "range with ISO-8601 strings",
        {"key": "{key}", "range": {"gte": "2024-01-01T00:00:00Z"}},
    ),
    "uuid": (
        "match.value (exact UUID string)",
        {"key": "{key}", "match": {"value": "<uuid-string>"}},
    ),
}


def create_payload_field_schema(key: str, data_type_value: str) -> "PayloadFieldSchema":
    """Create a PayloadFieldSchema with recommended_match and example populated.

    Args:
        key: Dot-path field key (e.g., "metadata.source_name").
        data_type_value: Qdrant data type string (e.g., "keyword", "integer").

    Returns:
        PayloadFieldSchema with all fields populated.
    """
    guidance = FIELD_TYPE_MATCH_GUIDANCE.get(data_type_value)
    if guidance:
        recommended_match, example_template = guidance
        example = {**example_template, "key": key}
    else:
        recommended_match = f"See Qdrant docs for '{data_type_value}' type"
        example = {"key": key}

    return PayloadFieldSchema(
        key=key,
        type=data_type_value,
        recommended_match=recommended_match,
        example=example,
    )


class DocumentChunkMetadata(BaseModel):
    """
    Flat metadata structure for document chunks stored in Qdrant.

    This model provides a typed structure for document ingestion metadata.
    Text content is stored separately in DocumentPayload.document_chunk,
    NOT in this metadata, to avoid duplication.

    Used by:
    - document_ingestion_worker for indexing document chunks
    - hedera_guardian_mcp_server for reading search results
    """

    chunk_id: int = Field(..., description="Sequential chunk number within document")
    heading: str = Field(default="", description="Last/most specific heading for display")
    headings: list[str] = Field(default_factory=list, description="Full heading hierarchy")
    source: str = Field(..., description="Source document path")
    source_format: str = Field(default="pdf", description="Document format (pdf, docx)")
    source_name: str = Field(..., description="Source name without extension")
    page_no: int | None = Field(default=None, description="Page number in source document")
    token_count: int = Field(default=0, description="Number of tokens in chunk")


class DocumentPayload(BaseModel):
    """
    Payload structure for stored documents in Qdrant.

    This model represents the data stored in a Qdrant point's payload.
    """

    document_chunk: str = Field(..., description="The text content of the document chunk")
    metadata: dict[str, Any] | None = Field(
        default=None, description="Optional metadata associated with the document"
    )


class SearchResult(BaseModel):
    """
    A search result from Qdrant.

    Represents a single document chunk returned from a semantic search query.
    """

    content: str = Field(..., description="The text content of the matched document chunk")
    score: float | None = Field(default=None, description="Similarity score from the search")
    metadata: dict[str, Any] | None = Field(
        default=None, description="Optional metadata associated with the document"
    )


class PayloadFieldSchema(BaseModel):
    """Schema information for an indexed payload field."""

    model_config = ConfigDict(frozen=True)

    key: str = Field(
        ...,
        description="Dot-path to the field (e.g., 'metadata.source_name')"
        " — use directly as FieldCondition.key",
    )
    type: str = Field(
        ...,
        description="Data type: keyword (exact match via MatchValue),"
        " integer (exact or Range), bool (exact via MatchValue),"
        " text (full-text via MatchText), float, datetime, geo, uuid",
    )
    recommended_match: str | None = Field(
        default=None,
        description="Recommended match operator for this field type."
        " IMPORTANT: 'keyword' fields must use match.value (NOT match.text or match.phrase)."
        " Only 'text'-indexed fields support match.text.",
    )
    example: dict[str, Any] | None = Field(
        default=None,
        description="Complete FieldCondition example you can copy into a filter."
        " Replace placeholder values with your actual filter values.",
    )


class CollectionStats(BaseModel):
    """
    Statistics for a Qdrant collection.

    Provides information about the current state of a collection.
    """

    name: str = Field(..., description="Name of the collection")
    vectors_count: int = Field(..., description="Number of vectors in the collection")
    points_count: int = Field(..., description="Number of points in the collection")
    indexed_vectors_count: int = Field(default=0, description="Number of indexed vectors")
    status: str = Field(default="unknown", description="Collection status")
    config: dict[str, Any] | None = Field(default=None, description="Collection configuration")
    payload_schema: list[PayloadFieldSchema] | None = Field(
        default=None,
        description="Indexed payload fields available for filtering."
        " Use 'key' as FieldCondition.key and 'type' to choose"
        " the correct match operator.",
    )
