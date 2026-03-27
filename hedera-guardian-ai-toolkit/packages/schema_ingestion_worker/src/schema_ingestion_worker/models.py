"""Data models for the ingestion pipeline."""

from pathlib import Path
from typing import Any, TypedDict
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SchemaDocument(BaseModel):
    """Parsed schema property from SchemaParser.

    Represents a single document that will be embedded and stored in the vector database.

    Attributes:
        embedding_input: The text content that will be used to generate embeddings
        content: The full content of the document (structured data from schema parsing)
        source: The source file path or identifier for this document
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "embedding_input": "Property: name, Type: string, Description: The user's full name",
                "content": {
                    "property_name": "name",
                    "type": "string",
                    "description": "The user's full name",
                },
                "source": "schemas/user.json",
            }
        }
    )

    embedding_input: str = Field(
        ..., min_length=1, description="Text content for embedding generation"
    )
    content: dict[str, Any] = Field(..., description="Full structured content of the document")
    source: str = Field(..., min_length=1, description="Source file path or identifier")

    @field_validator("embedding_input")
    @classmethod
    def validate_embedding_input(cls, v: str) -> str:
        """Ensure embedding input is not empty or whitespace only."""
        if not v or not v.strip():
            raise ValueError("embedding_input cannot be empty or whitespace only")
        return v.strip()

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: dict[str, Any]) -> dict[str, Any]:
        """Ensure content is not empty."""
        if not v:
            raise ValueError("content cannot be empty")
        return v


class PipelineState(TypedDict, total=False):
    """State object for the ingestion pipeline.

    This state is passed between pipeline stages and tracks
    the progress and results of the ingestion process.

    Attributes:
        schema_files: List of schema file paths to process
        parsed_documents: Documents parsed from schema files
        embedded_documents: Documents with embeddings added
        processed_count: Number of successfully processed documents
        parsed_count: Total properties parsed (set by _log_final_summary)
        embedded_count: Total embeddings generated (set by _log_final_summary)
        failed_files: List of (file_path, error_message) tuples for failed files
        batch_id: Unique identifier for this pipeline execution batch
    """

    schema_files: list[Path]
    parsed_documents: list[SchemaDocument]
    embedded_documents: list[dict[str, Any]]
    processed_count: int
    parsed_count: int
    embedded_count: int
    failed_files: list[tuple[Path, str]]
    batch_id: str


def create_initial_state() -> PipelineState:
    """Create an initial pipeline state with default values.

    Returns:
        A new PipelineState with empty collections and a unique batch_id
    """
    return PipelineState(
        schema_files=[],
        parsed_documents=[],
        embedded_documents=[],
        processed_count=0,
        failed_files=[],
        batch_id=str(uuid4()),
    )
