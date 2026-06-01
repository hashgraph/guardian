import logging

from qdrant_client import AsyncQdrantClient, QdrantClient

from vector_store import (
    AsyncEmbeddingProvider,
    MultiVectorEmbeddingProvider,
    QdrantConnector,
    create_embedding_provider,
)

from .server import HederaGuardianMCPServer
from .settings import (
    AsyncQdrantClientSettings,
    EmbeddingProviderSettings,
    McpServerSettings,
    QdrantConnectorSettings,
)

logger = logging.getLogger(__name__)


def create_qdrant_connectors() -> tuple[
    QdrantConnector,
    QdrantConnector,
    AsyncQdrantClient,
    AsyncEmbeddingProvider | MultiVectorEmbeddingProvider,
]:
    """Create both schema and methodology QdrantConnectors."""

    # Create shared embedding provider
    embedding_settings = EmbeddingProviderSettings()
    embedding_provider = create_embedding_provider(
        provider_type=embedding_settings.provider_type,
        model_name=embedding_settings.model_name,
    )

    # Pre-load embedding model (downloads ~2.3 GB on first run, loads from cache on subsequent runs)
    embedding_provider.warm_up()

    # Health-check with disposable sync client (no event loop involved)
    qdrant_client_settings = AsyncQdrantClientSettings()
    logger.info("Checking Qdrant connection...")
    sync_client = None
    try:
        sync_client = QdrantClient(
            host=qdrant_client_settings.host,
            port=qdrant_client_settings.port,
            api_key=qdrant_client_settings.api_key,
        )
        sync_client.get_collections()
        logger.info(
            f"Successfully connected to Qdrant server at {qdrant_client_settings.host}:{qdrant_client_settings.port}"
        )
    except Exception as e:
        logger.error(f"Failed to connect to Qdrant server: {e}")
    finally:
        if sync_client is not None:
            sync_client.close()

    # Async client created fresh — never touched before FastMCP's event loop starts
    qdrant_client = AsyncQdrantClient(
        port=qdrant_client_settings.port,
        host=qdrant_client_settings.host,
        api_key=qdrant_client_settings.api_key,
    )

    qdrant_connector_settings = QdrantConnectorSettings()

    # Create schema connector (reuse the shared client)
    schema_connector = QdrantConnector(
        url=f"http://{qdrant_client_settings.host}:{qdrant_client_settings.port}",
        collection_name=qdrant_connector_settings.schema_collection,
        embedding_provider=embedding_provider,
        api_key=qdrant_client_settings.api_key,
        client=qdrant_client,
    )

    # Create methodology connector (reuse the shared client)
    methodology_connector = QdrantConnector(
        url=f"http://{qdrant_client_settings.host}:{qdrant_client_settings.port}",
        collection_name=qdrant_connector_settings.methodology_collection,
        embedding_provider=embedding_provider,
        api_key=qdrant_client_settings.api_key,
        client=qdrant_client,
    )

    return schema_connector, methodology_connector, qdrant_client, embedding_provider


# Create connectors and shared resources
schema_connector, methodology_connector, qdrant_client, embedding_provider = (
    create_qdrant_connectors()
)

mcp_server_settings = McpServerSettings()


# Initialize MCP server with both connectors and shared resources for lifespan cleanup
mcp = HederaGuardianMCPServer(
    schema_connector=schema_connector,
    methodology_connector=methodology_connector,
    tool_logging_enabled=mcp_server_settings.tool_logging_enabled,
    qdrant_client=qdrant_client,
    embedding_provider=embedding_provider,
)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Hedera Guardian MCP Server")
    parser.add_argument(
        "--stdio",
        action="store_true",
        help="Run server with stdio transport",
    )
    args = parser.parse_args()

    if args.stdio:
        # Run with stdio transport
        mcp.run(transport="stdio")
    else:
        # Run with HTTP transport
        mcp.run(
            transport="streamable-http",
            host=mcp_server_settings.host,
            port=mcp_server_settings.port,
        )


if __name__ == "__main__":
    main()
