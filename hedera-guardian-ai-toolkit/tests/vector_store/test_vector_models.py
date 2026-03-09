"""Tests for Pydantic models."""

import pytest
from pydantic import ValidationError

from vector_store import (
    CollectionStats,
    DocumentChunkMetadata,
    DocumentPayload,
    PayloadFieldSchema,
    SearchResult,
)
from vector_store.models import create_payload_field_schema


class TestDocumentChunkMetadata:
    """Tests for DocumentChunkMetadata model."""

    def test_create_with_required_fields(self):
        """Test creating metadata with required fields only."""
        metadata = DocumentChunkMetadata(
            chunk_id=1,
            source="/path/to/doc.pdf",
            source_name="doc",
        )

        assert metadata.chunk_id == 1
        assert metadata.source == "/path/to/doc.pdf"
        assert metadata.source_name == "doc"
        # Check defaults
        assert metadata.heading == ""
        assert metadata.headings == []
        assert metadata.source_format == "pdf"
        assert metadata.page_no is None
        assert metadata.token_count == 0

    def test_create_with_all_fields(self):
        """Test creating metadata with all fields."""
        metadata = DocumentChunkMetadata(
            chunk_id=5,
            heading="Section 1.1",
            headings=["Chapter 1", "Section 1.1"],
            source="/docs/methodology.pdf",
            source_format="pdf",
            source_name="methodology",
            page_no=10,
            token_count=500,
        )

        assert metadata.chunk_id == 5
        assert metadata.heading == "Section 1.1"
        assert metadata.headings == ["Chapter 1", "Section 1.1"]
        assert metadata.source == "/docs/methodology.pdf"
        assert metadata.source_format == "pdf"
        assert metadata.source_name == "methodology"
        assert metadata.page_no == 10
        assert metadata.token_count == 500

    def test_missing_required_field(self):
        """Test validation error on missing required field."""
        with pytest.raises(ValidationError):
            DocumentChunkMetadata(chunk_id=1)  # Missing source and source_name

    def test_model_dump(self):
        """Test converting model to dict for Qdrant payload."""
        metadata = DocumentChunkMetadata(
            chunk_id=1,
            heading="Test",
            headings=["Test"],
            source="test.pdf",
            source_name="test",
            page_no=1,
            token_count=100,
        )

        data = metadata.model_dump()

        assert data == {
            "chunk_id": 1,
            "heading": "Test",
            "headings": ["Test"],
            "source": "test.pdf",
            "source_format": "pdf",
            "source_name": "test",
            "page_no": 1,
            "token_count": 100,
        }

    def test_docx_format(self):
        """Test metadata with DOCX format."""
        metadata = DocumentChunkMetadata(
            chunk_id=1,
            source="/docs/guide.docx",
            source_format="docx",
            source_name="guide",
        )

        assert metadata.source_format == "docx"


class TestDocumentPayload:
    """Tests for DocumentPayload model."""

    def test_create_with_content_only(self):
        """Test creating payload with just content."""
        payload = DocumentPayload(document_chunk="test content")

        assert payload.document_chunk == "test content"
        assert payload.metadata is None

    def test_create_with_metadata(self):
        """Test creating payload with metadata."""
        payload = DocumentPayload(
            document_chunk="test content", metadata={"source": "test.txt", "page": 1}
        )

        assert payload.document_chunk == "test content"
        assert payload.metadata == {"source": "test.txt", "page": 1}

    def test_missing_required_field(self):
        """Test validation error on missing required field."""
        with pytest.raises(ValidationError):
            DocumentPayload()

    def test_model_dump(self):
        """Test converting model to dict."""
        payload = DocumentPayload(document_chunk="test", metadata={"key": "value"})

        data = payload.model_dump()

        assert data == {
            "document_chunk": "test",
            "metadata": {"key": "value"},
        }


class TestSearchResult:
    """Tests for SearchResult model."""

    def test_create_with_all_fields(self):
        """Test creating search result with all fields."""
        result = SearchResult(
            content="matched content",
            score=0.95,
            metadata={"source": "doc.txt"},
        )

        assert result.content == "matched content"
        assert result.score == 0.95
        assert result.metadata == {"source": "doc.txt"}

    def test_create_with_optional_none(self):
        """Test creating search result with optional fields as None."""
        result = SearchResult(content="content")

        assert result.content == "content"
        assert result.score is None
        assert result.metadata is None

    def test_score_float(self):
        """Test score as float."""
        result = SearchResult(content="test", score=0.856789)

        assert isinstance(result.score, float)
        assert result.score == pytest.approx(0.856789)

    def test_model_dump(self):
        """Test converting to dict."""
        result = SearchResult(content="test", score=0.9, metadata={"key": "value"})

        data = result.model_dump()

        assert data == {
            "content": "test",
            "score": 0.9,
            "metadata": {"key": "value"},
        }


class TestCollectionStats:
    """Tests for CollectionStats model."""

    def test_create_with_required_fields(self):
        """Test creating stats with required fields."""
        stats = CollectionStats(name="test_collection", vectors_count=100, points_count=100)

        assert stats.name == "test_collection"
        assert stats.vectors_count == 100
        assert stats.points_count == 100
        assert stats.indexed_vectors_count == 0  # default
        assert stats.status == "unknown"  # default
        assert stats.config is None  # default

    def test_create_with_all_fields(self):
        """Test creating stats with all fields."""
        stats = CollectionStats(
            name="test_collection",
            vectors_count=100,
            points_count=100,
            indexed_vectors_count=95,
            status="green",
            config={"vector_size": 1024, "distance": "Cosine"},
        )

        assert stats.name == "test_collection"
        assert stats.vectors_count == 100
        assert stats.points_count == 100
        assert stats.indexed_vectors_count == 95
        assert stats.status == "green"
        assert stats.config == {"vector_size": 1024, "distance": "Cosine"}

    def test_missing_required_fields(self):
        """Test validation error on missing required fields."""
        with pytest.raises(ValidationError):
            CollectionStats(name="test")

    def test_create_with_payload_schema(self):
        """Test creating stats with payload_schema."""
        from vector_store.models import create_payload_field_schema

        stats = CollectionStats(
            name="test",
            vectors_count=10,
            points_count=10,
            payload_schema=[
                create_payload_field_schema("metadata.source", "keyword"),
            ],
        )
        assert stats.payload_schema is not None
        assert len(stats.payload_schema) == 1
        assert stats.payload_schema[0].key == "metadata.source"
        assert stats.payload_schema[0].type == "keyword"
        assert stats.payload_schema[0].recommended_match == "match.value (exact string match)"
        assert stats.payload_schema[0].example == {
            "key": "metadata.source",
            "match": {"value": "<exact string>"},
        }

    def test_payload_schema_defaults_to_none(self):
        """Test that payload_schema defaults to None."""
        stats = CollectionStats(name="test", vectors_count=0, points_count=0)
        assert stats.payload_schema is None

    def test_model_dump(self):
        """Test converting to dict."""
        stats = CollectionStats(
            name="test",
            vectors_count=10,
            points_count=10,
            status="green",
        )

        data = stats.model_dump()

        assert data["name"] == "test"
        assert data["vectors_count"] == 10
        assert data["points_count"] == 10
        assert data["status"] == "green"


class TestPayloadFieldSchema:
    """Tests for PayloadFieldSchema model."""

    def test_create_with_required_fields(self):
        """Test creating schema with required fields."""
        from vector_store.models import create_payload_field_schema

        field = create_payload_field_schema("metadata.source_name", "keyword")
        assert field.key == "metadata.source_name"
        assert field.type == "keyword"
        assert field.recommended_match == "match.value (exact string match)"
        assert field.example == {
            "key": "metadata.source_name",
            "match": {"value": "<exact string>"},
        }

    def test_missing_required_field(self):
        """Test validation error on missing required field."""
        with pytest.raises(ValidationError):
            PayloadFieldSchema()  # Missing key and type

    def test_construct_with_only_key_and_type(self):
        """Test that recommended_match and example default to None."""
        field = PayloadFieldSchema(key="metadata.source", type="keyword")
        assert field.key == "metadata.source"
        assert field.type == "keyword"
        assert field.recommended_match is None
        assert field.example is None

    def test_model_dump(self):
        """Test converting to dict."""
        field = create_payload_field_schema("metadata.heading", "keyword")
        data = field.model_dump()
        assert data == {
            "key": "metadata.heading",
            "type": "keyword",
            "recommended_match": "match.value (exact string match)",
            "example": {"key": "metadata.heading", "match": {"value": "<exact string>"}},
        }

    @pytest.mark.parametrize(
        "data_type,expected_fragment",
        [
            ("keyword", "match.value"),
            ("integer", "match.value"),
            ("bool", "match.value"),
            ("text", "match.text"),
            ("float", "range"),
            ("datetime", "range with ISO-8601"),
            ("uuid", "match.value"),
        ],
    )
    def test_create_payload_field_schema_all_types(self, data_type, expected_fragment):
        """Factory should produce correct recommended_match for every known type."""
        field = create_payload_field_schema("metadata.x", data_type)
        assert field.key == "metadata.x"
        assert field.type == data_type
        assert expected_fragment in field.recommended_match
        assert field.example is not None
        assert field.example["key"] == "metadata.x"

    def test_create_payload_field_schema_unknown_type(self):
        """Unknown types should get a generic recommendation and minimal example."""
        field = create_payload_field_schema("metadata.x", "some_future_type")
        assert "some_future_type" in field.recommended_match
        assert field.example == {"key": "metadata.x"}
