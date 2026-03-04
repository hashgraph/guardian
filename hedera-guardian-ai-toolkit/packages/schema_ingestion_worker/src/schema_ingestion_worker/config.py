"""Configuration management for schema ingestion worker using Pydantic Settings."""

import logging
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Get the hedera-guardian-ai-toolkit zone root directory
_PACKAGE_ROOT = Path(__file__).parent.parent.parent.parent.parent


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_prefix="SCHEMA_INGESTION_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        env_ignore_empty=True,
    )

    # Qdrant Configuration
    qdrant_url: str = Field(
        default="http://localhost:6333",
        description="Qdrant server URL",
    )
    qdrant_collection_name: str = Field(
        default="schema_properties",
        description="Qdrant collection name for schema properties",
    )
    qdrant_api_key: str | None = Field(
        default=None,
        description="Qdrant API key for authentication (optional)",
    )

    # Embedding Configuration
    embedding_provider_type: str = Field(
        default="bge_m3_onnx",
        description="Type of embedding provider to use (bge_m3_onnx, fastembed)",
    )
    embedding_model_name: str = Field(
        default="aapot/bge-m3-onnx",
        description="Embedding model name",
    )
    embedding_batch_size: int = Field(
        default=256,
        ge=1,
        le=1000,
        description="Batch size for embedding operations and property-level batching. "
        "Determines how many properties to process in each pipeline batch (embed → upsert cycle). "
        "Each batch is committed to Qdrant independently, preventing data loss on timeout.",
    )
    onnx_inference_batch_size: int = Field(
        default=32,
        ge=1,
        le=500,
        description="Maximum texts per ONNX Runtime session.run() call. "
        "Limits peak GPU/CPU memory from attention matrices and ColBERT output tensors. "
        "The pipeline batch (embedding_batch_size) is split into sub-batches of this size "
        "before ONNX inference. Lower values reduce peak memory at the cost of more inference calls.",
    )

    # Vector Store Configuration
    vector_upsert_batch_size: int = Field(
        default=50,
        ge=1,
        le=1000,
        description="Batch size for vector upsert operations",
    )

    # Ingestion Mode Configuration
    mode: Literal["append", "override"] = Field(
        default="override",
        description="Data handling strategy: 'override' (default) to replace all data on each run, 'append' for incremental ingestion",
    )

    # Path Configuration
    input_schemas_dir: Path = Field(
        default=Path("data/input/schemas"),
        description="Directory containing input JSON schema files (relative to package root or absolute)",
    )
    output_dir: Path = Field(
        default=Path("data/output"),
        description="Directory for output and processed files (relative to package root or absolute)",
    )

    # Timeout Configuration
    embedding_timeout: int = Field(
        default=300,
        ge=10,
        le=600,
        description="Timeout in seconds for embedding operations (default: 300s for ~256 properties)",
    )
    upsert_timeout: int = Field(
        default=60,
        ge=10,
        le=300,
        description="Timeout in seconds for vector upsert operations (default: 60s for ~256 properties)",
    )

    # Logging Configuration
    log_level: str = Field(
        default="INFO",
        description="Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)",
    )

    @model_validator(mode="after")
    def resolve_paths(self):
        """Resolve relative paths to absolute paths based on package root."""
        if not self.input_schemas_dir.is_absolute():
            self.input_schemas_dir = (_PACKAGE_ROOT / self.input_schemas_dir).resolve()
        if not self.output_dir.is_absolute():
            self.output_dir = (_PACKAGE_ROOT / self.output_dir).resolve()
        return self

    @model_validator(mode="after")
    def validate_timeouts_vs_batch_size(self):
        """Validate that timeouts are reasonable for configured batch sizes."""
        # Rough estimate: ~0.5s per embedding, plus 30s buffer
        min_embedding_timeout = (self.embedding_batch_size * 0.5) + 30
        if self.embedding_timeout < min_embedding_timeout:
            logger.warning(
                f"embedding_timeout ({self.embedding_timeout}s) may be too low "
                f"for embedding_batch_size ({self.embedding_batch_size}). "
                f"Recommended: >= {min_embedding_timeout:.0f}s"
            )

        # Rough estimate: ~0.1s per upsert, plus 10s buffer
        min_upsert_timeout = (self.vector_upsert_batch_size * 0.1) + 10
        if self.upsert_timeout < min_upsert_timeout:
            logger.warning(
                f"upsert_timeout ({self.upsert_timeout}s) may be too low "
                f"for vector_upsert_batch_size ({self.vector_upsert_batch_size}). "
                f"Recommended: >= {min_upsert_timeout:.0f}s"
            )

        return self

    def get_log_level(self) -> int:
        """Convert string log level to logging constant."""
        return getattr(logging, self.log_level.upper(), logging.INFO)


def load_settings() -> Settings:
    """Load settings from environment variables and .env file."""
    return Settings()
