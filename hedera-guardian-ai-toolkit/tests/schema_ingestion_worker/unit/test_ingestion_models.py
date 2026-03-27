"""Unit tests for schema_ingestion_worker.models."""

import json
from pathlib import Path
from uuid import UUID

import pytest
from pydantic import ValidationError

from schema_ingestion_worker.models import (
    PipelineState,
    SchemaDocument,
    create_initial_state,
)


class TestSchemaDocument:
    """Test suite for SchemaDocument model."""

    def test_valid_instantiation(self):
        """Test creating a valid SchemaDocument."""
        doc = SchemaDocument(
            embedding_input="Property: name, Type: string",
            content={"property_name": "name", "type": "string"},
            source="schemas/user.json",
        )

        assert doc.embedding_input == "Property: name, Type: string"
        assert doc.content == {"property_name": "name", "type": "string"}
        assert doc.source == "schemas/user.json"

    def test_valid_instantiation_with_complex_content(self):
        """Test creating a SchemaDocument with complex nested content."""
        complex_content = {
            "property_name": "address",
            "type": "object",
            "properties": {
                "street": {"type": "string"},
                "city": {"type": "string"},
                "zipcode": {"type": "integer"},
            },
            "required": ["street", "city"],
        }

        doc = SchemaDocument(
            embedding_input="Address object with street and city properties",
            content=complex_content,
            source="schemas/address.json",
        )

        assert doc.embedding_input == "Address object with street and city properties"
        assert doc.content == complex_content
        assert doc.source == "schemas/address.json"

    def test_embedding_input_whitespace_stripped(self):
        """Test that embedding_input whitespace is stripped."""
        doc = SchemaDocument(
            embedding_input="  Property: name  ",
            content={"property_name": "name"},
            source="test.json",
        )

        assert doc.embedding_input == "Property: name"

    def test_missing_required_fields(self):
        """Test that missing required fields raise ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            SchemaDocument()

        errors = exc_info.value.errors()
        assert len(errors) == 3  # All three fields are required
        field_names = {error["loc"][0] for error in errors}
        assert field_names == {"embedding_input", "content", "source"}

    def test_empty_embedding_input(self):
        """Test that empty embedding_input raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            SchemaDocument(embedding_input="", content={"key": "value"}, source="test.json")

        errors = exc_info.value.errors()
        assert any("embedding_input" in str(error["loc"]) for error in errors)

    def test_whitespace_only_embedding_input(self):
        """Test that whitespace-only embedding_input raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            SchemaDocument(embedding_input="   ", content={"key": "value"}, source="test.json")

        errors = exc_info.value.errors()
        assert any("embedding_input" in str(error["loc"]) for error in errors)

    def test_empty_content(self):
        """Test that empty content dict raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            SchemaDocument(embedding_input="Some text", content={}, source="test.json")

        errors = exc_info.value.errors()
        assert any("content" in str(error["loc"]) for error in errors)

    def test_empty_source(self):
        """Test that empty source raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            SchemaDocument(embedding_input="Some text", content={"key": "value"}, source="")

        errors = exc_info.value.errors()
        assert any("source" in str(error["loc"]) for error in errors)

    def test_invalid_content_type(self):
        """Test that non-dict content raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            SchemaDocument(
                embedding_input="Some text",
                content="not a dict",  # type: ignore
                source="test.json",
            )

        errors = exc_info.value.errors()
        assert any("content" in str(error["loc"]) for error in errors)

    def test_serialization_to_dict(self):
        """Test serializing SchemaDocument to dictionary."""
        doc = SchemaDocument(
            embedding_input="Property: name, Type: string",
            content={"property_name": "name", "type": "string"},
            source="schemas/user.json",
        )

        doc_dict = doc.model_dump()

        assert doc_dict == {
            "embedding_input": "Property: name, Type: string",
            "content": {"property_name": "name", "type": "string"},
            "source": "schemas/user.json",
        }

    def test_serialization_to_json(self):
        """Test serializing SchemaDocument to JSON string."""
        doc = SchemaDocument(
            embedding_input="Property: name, Type: string",
            content={"property_name": "name", "type": "string"},
            source="schemas/user.json",
        )

        json_str = doc.model_dump_json()
        parsed = json.loads(json_str)

        assert parsed == {
            "embedding_input": "Property: name, Type: string",
            "content": {"property_name": "name", "type": "string"},
            "source": "schemas/user.json",
        }

    def test_deserialization_from_dict(self):
        """Test deserializing SchemaDocument from dictionary."""
        data = {
            "embedding_input": "Property: name, Type: string",
            "content": {"property_name": "name", "type": "string"},
            "source": "schemas/user.json",
        }

        doc = SchemaDocument(**data)

        assert doc.embedding_input == "Property: name, Type: string"
        assert doc.content == {"property_name": "name", "type": "string"}
        assert doc.source == "schemas/user.json"

    def test_deserialization_from_json(self):
        """Test deserializing SchemaDocument from JSON string."""
        json_str = json.dumps(
            {
                "embedding_input": "Property: name, Type: string",
                "content": {"property_name": "name", "type": "string"},
                "source": "schemas/user.json",
            }
        )

        doc = SchemaDocument.model_validate_json(json_str)

        assert doc.embedding_input == "Property: name, Type: string"
        assert doc.content == {"property_name": "name", "type": "string"}
        assert doc.source == "schemas/user.json"

    def test_round_trip_serialization(self):
        """Test that serialization and deserialization preserve data."""
        original = SchemaDocument(
            embedding_input="Property: email, Type: string, Format: email",
            content={
                "property_name": "email",
                "type": "string",
                "format": "email",
                "description": "User email address",
            },
            source="schemas/user.json",
        )

        # Round trip through JSON
        json_str = original.model_dump_json()
        restored = SchemaDocument.model_validate_json(json_str)

        assert restored.embedding_input == original.embedding_input
        assert restored.content == original.content
        assert restored.source == original.source

    def test_content_with_special_characters(self):
        """Test SchemaDocument with special characters in content."""
        doc = SchemaDocument(
            embedding_input="Property with special chars: <>&'\"",
            content={
                "property_name": "special",
                "description": "Contains <>&'\" characters",
                "examples": ["value1", "value2"],
            },
            source="schemas/special.json",
        )

        assert doc.content["description"] == "Contains <>&'\" characters"

    def test_content_with_unicode(self):
        """Test SchemaDocument with Unicode characters."""
        doc = SchemaDocument(
            embedding_input="Property: 名前 (name in Japanese)",
            content={"property_name": "名前", "description": "ユーザーの名前 (User's name)"},
            source="schemas/i18n.json",
        )

        assert doc.content["property_name"] == "名前"
        assert "ユーザーの名前" in doc.content["description"]


class TestPipelineState:
    """Test suite for PipelineState TypedDict."""

    def test_pipeline_state_structure(self):
        """Test creating a PipelineState with all fields."""
        state: PipelineState = {
            "schema_files": [Path("schema1.json"), Path("schema2.json")],
            "parsed_documents": [
                SchemaDocument(
                    embedding_input="Test doc", content={"key": "value"}, source="test.json"
                )
            ],
            "embedded_documents": [{"embedding": [0.1, 0.2, 0.3], "content": {"key": "value"}}],
            "processed_count": 1,
            "failed_files": [(Path("failed.json"), "Parse error")],
            "batch_id": "test-batch-123",
        }

        assert len(state["schema_files"]) == 2
        assert len(state["parsed_documents"]) == 1
        assert len(state["embedded_documents"]) == 1
        assert state["processed_count"] == 1
        assert len(state["failed_files"]) == 1
        assert state["batch_id"] == "test-batch-123"

    def test_pipeline_state_partial(self):
        """Test creating a partial PipelineState (total=False allows this)."""
        state: PipelineState = {"schema_files": [Path("schema1.json")], "batch_id": "partial-batch"}

        assert len(state["schema_files"]) == 1
        assert state["batch_id"] == "partial-batch"

    def test_pipeline_state_empty_collections(self):
        """Test PipelineState with empty collections."""
        state: PipelineState = {
            "schema_files": [],
            "parsed_documents": [],
            "embedded_documents": [],
            "processed_count": 0,
            "failed_files": [],
            "batch_id": "empty-batch",
        }

        assert state["schema_files"] == []
        assert state["parsed_documents"] == []
        assert state["embedded_documents"] == []
        assert state["processed_count"] == 0
        assert state["failed_files"] == []


class TestCreateInitialState:
    """Test suite for create_initial_state function."""

    def test_create_initial_state(self):
        """Test creating an initial state with default values."""
        state = create_initial_state()

        assert state["schema_files"] == []
        assert state["parsed_documents"] == []
        assert state["embedded_documents"] == []
        assert state["processed_count"] == 0
        assert state["failed_files"] == []
        assert "batch_id" in state
        assert len(state["batch_id"]) > 0

    def test_batch_id_is_valid_uuid(self):
        """Test that batch_id is a valid UUID."""
        state = create_initial_state()

        # Should be able to parse as UUID
        batch_uuid = UUID(state["batch_id"])
        assert str(batch_uuid) == state["batch_id"]

    def test_batch_id_is_unique(self):
        """Test that each call generates a unique batch_id."""
        state1 = create_initial_state()
        state2 = create_initial_state()

        assert state1["batch_id"] != state2["batch_id"]

    def test_initial_state_structure(self):
        """Test that initial state has all required keys."""
        state = create_initial_state()

        required_keys = {
            "schema_files",
            "parsed_documents",
            "embedded_documents",
            "processed_count",
            "failed_files",
            "batch_id",
        }

        assert set(state.keys()) == required_keys

    def test_initial_state_mutability(self):
        """Test that initial state collections can be modified."""
        state = create_initial_state()

        # Should be able to append to lists
        state["schema_files"].append(Path("test.json"))
        state["parsed_documents"].append(
            SchemaDocument(embedding_input="Test", content={"key": "value"}, source="test.json")
        )
        state["processed_count"] += 1

        assert len(state["schema_files"]) == 1
        assert len(state["parsed_documents"]) == 1
        assert state["processed_count"] == 1
