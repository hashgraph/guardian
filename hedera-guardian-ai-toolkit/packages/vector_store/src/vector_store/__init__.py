"""
Vector Store Package

Shared vector storage infrastructure for Hedera Guardian AI Toolkit.
Provides async-first Qdrant integration with FastEmbed embeddings.
"""

from vector_store.embeddings import (
    AsyncEmbeddingProvider,
    EmbeddingOutput,
    EmbeddingProviderType,
    MultiVectorEmbeddingProvider,
    create_embedding_provider,
)
from vector_store.models import (
    CollectionStats,
    DocumentChunkMetadata,
    DocumentPayload,
    PayloadFieldSchema,
    SearchResult,
)
from vector_store.qdrant_connector import QdrantConnector

__version__ = "0.1.0"

__all__ = [
    # Main connector
    "QdrantConnector",
    # Models
    "DocumentChunkMetadata",
    "DocumentPayload",
    "PayloadFieldSchema",
    "SearchResult",
    "CollectionStats",
    # Embeddings
    "AsyncEmbeddingProvider",
    "EmbeddingOutput",
    "EmbeddingProviderType",
    "MultiVectorEmbeddingProvider",
    "create_embedding_provider",
]
