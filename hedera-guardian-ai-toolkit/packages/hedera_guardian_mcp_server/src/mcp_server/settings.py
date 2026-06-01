from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from vector_store import EmbeddingProviderType


class McpServerSettings(BaseSettings):
    """
    Configuration for the MCP server.
    """

    model_config = SettingsConfigDict(
        env_ignore_empty=True, env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    host: str = Field(
        default="0.0.0.0",
        validation_alias="MCP_SERVER_HOST",
        description="Server bind address (0.0.0.0 for Docker, 127.0.0.1 for local)",
    )
    port: int = Field(
        default=9000,
        validation_alias="MCP_SERVER_PORT",
        description="Server port (only used with HTTP transport, ignored in stdio mode)",
    )
    log_level: str = Field(
        default="INFO",
        validation_alias="MCP_SERVER_LOG_LEVEL",
        description="Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)",
    )

    tool_logging_enabled: bool = Field(
        default=False,
        validation_alias="MCP_SERVER_TOOL_LOGGING_ENABLED",
        description="Enable detailed logging for tool usage (arguments, responses)",
    )


class EmbeddingProviderSettings(BaseSettings):
    """
    Configuration for the embedding provider.
    """

    model_config = SettingsConfigDict(
        env_ignore_empty=True, env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    provider_type: EmbeddingProviderType = Field(
        default=EmbeddingProviderType.BGE_M3_ONNX,
        validation_alias="EMBEDDING_PROVIDER",
        description="Embedding provider type (bge_m3_onnx for hybrid search, fastembed for dense-only)",
    )
    model_name: str = Field(
        default="aapot/bge-m3-onnx",
        validation_alias="EMBEDDING_MODEL",
        description="Embedding model name (must match model used during ingestion)",
    )


class AsyncQdrantClientSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_ignore_empty=True, env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    host: str = Field(
        default="localhost",
        validation_alias="QDRANT_HOST",
        description="Qdrant server hostname (use 'qdrant' for Docker networking)",
    )
    port: int = Field(
        default=6333,
        validation_alias="QDRANT_PORT",
        description="Qdrant server HTTP API port",
    )
    api_key: str | None = Field(
        default=None,
        validation_alias="QDRANT_API_KEY",
        description="Qdrant API key for authentication (optional)",
        repr=False,
    )


class QdrantConnectorSettings(BaseSettings):
    """
    Configuration for the Qdrant connector.
    """

    model_config = SettingsConfigDict(
        env_ignore_empty=True, env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    methodology_collection: str = Field(
        default="methodology_documents",
        validation_alias="QDRANT_METHODOLOGY_COLLECTION",
        description="Qdrant collection for methodology documents",
    )
    schema_collection: str = Field(
        default="schema_properties",
        validation_alias="QDRANT_SCHEMA_COLLECTION",
        description="Qdrant collection for JSON schemas",
    )
