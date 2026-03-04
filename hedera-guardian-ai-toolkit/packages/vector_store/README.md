# Vector Store Package

Shared vector storage infrastructure for Hedera Guardian AI Toolkit. Provides async-first Qdrant integration with flexible embedding providers for semantic search and document retrieval.

## Features

- **Async-first architecture** with AsyncQdrantClient
- **FastEmbed integration** for fast, efficient embeddings
- **Unified QdrantConnector interface** for all vector operations
- **Type-safe** with Pydantic models
- **Easy to use** with sensible defaults

## Architecture

The vector_store package provides a clean abstraction layer:

```
┌─────────────────────────────────────┐
│      Application Layer              │
│  (MCP Server, Ingestion Worker)     │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│       QdrantConnector               │
│  (Unified async interface)          │
└──────────┬──────────────────────────┘
           │
    ┌──────┴───────┐
    │              │
┌───▼───┐     ┌───▼─────────────────────┐
│Qdrant │     │   EmbeddingProvider     │
│Client │     │ (BGE-M3 ONNX/FastEmbed) │
└───────┘     └─────────────────────────┘
```

### Package Structure
```text
vector_store/
├── __init__.py                 # Package exports
├── config.py                   # Internal configuration (not exported)
├── models.py                   # Pydantic models
├── qdrant_connector.py         # Qdrant database connector
└── embeddings/
    ├── __init__.py            # Embeddings module exports
    ├── base.py                # Abstract base for dense embeddings
    ├── multi_vector_base.py   # Abstract base for multi-vector
    ├── fastembed.py           # FastEmbed implementation
    ├── bge_m3_onnx.py         # BGE-M3 ONNX implementation
    ├── factory.py             # Provider factory
    └── types.py               # Enums and types
```

### Key Components

#### 1. Embedding Providers

**AsyncEmbeddingProvider** (Base)
- Dense-only embeddings
- Async interface for query and batch embedding
- Used by: FastEmbedProvider

**MultiVectorEmbeddingProvider** (Base)
- Dense + sparse embeddings
- Hybrid search support
- Used by: BGEM3ONNXProvider

#### 2. Models

**DocumentChunkMetadata**
- Flat metadata structure for document chunks
- Fields: chunk_id, heading, headings, source, source_format, source_name, page_no, token_count
- Used for document ingestion and search result display

**DocumentPayload**
- Payload structure for Qdrant points
- Contains document text and optional metadata

**SearchResult**
- Search result from Qdrant queries
- Includes content, similarity score, and metadata

**CollectionStats**
- Statistics for Qdrant collections
- Provides vectors count, points count, status, config

#### 3. QdrantConnector

Main interface for vector database operations.

## Installation

This package is part of the Hedera Guardian AI Toolkit workspace. Install it via Poetry:

```bash
poetry install
```

## Configuration

### Embedding Provider Configuration

**FastEmbed Provider**
```python
provider = create_embedding_provider(
    provider_type="fastembed",
    model_name="BAAI/bge-small-en-v1.5",  # Or other FastEmbed models
    cache_dir="./model_cache"
)
```

**BGE-M3 ONNX Provider**
```python
provider = create_embedding_provider(
    provider_type="bge_m3_onnx",
    model_name="aapot/bge-m3-onnx",
    cache_dir="./model_cache",
    max_inference_batch_size=64  # Adjust based on available memory
)
```

### Memory Management

The BGE-M3 ONNX provider includes memory management features:

> **Note:** The BGE-M3 ONNX model (`aapot/bge-m3-onnx`) is approximately 2.3 GB and downloads on first use. In Docker, the `huggingface_cache` named volume persists the download across container runs.

- **max_inference_batch_size**: Controls the maximum number of texts processed in a single ONNX inference call
- Default: 64 (balances throughput and memory usage)
- Lower values reduce peak memory at the cost of throughput
- Higher values increase throughput but require more memory
```python
# Low memory configuration
provider = create_embedding_provider(
    provider_type="bge_m3_onnx",
    model_name="aapot/bge-m3-onnx",
    max_inference_batch_size=32  # Reduced for lower memory
)
```

### Resource Cleanup

Always cleanup providers when done to free memory:
```python
try:
    # Use provider
    results = await provider.embed_batch(texts)
finally:
    # Release resources
    provider.cleanup()
```

### Basic Usage

```python
import asyncio
from vector_store import QdrantConnector, create_embedding_provider, EmbeddingProviderType

async def main():
    # Create embedding provider (BGE-M3 ONNX for hybrid search)
    embedding_provider = create_embedding_provider(
        provider_type=EmbeddingProviderType.BGE_M3_ONNX,
        model_name="aapot/bge-m3-onnx"
    )

    # Create connector
    connector = QdrantConnector(
        url="http://localhost:6333",
        collection_name="my_documents",
        embedding_provider=embedding_provider
    )

    # Pre-embed documents (for batch efficiency)
    documents = [
        "FastEmbed is a fast embedding library.",
        "Qdrant is a vector search engine.",
        "Semantic search finds similar content.",
    ]
    embeddings = await embedding_provider.embed_batch(documents)

    # Add pre-embedded documents
    ids = await connector.add_pre_embedded_documents(documents, embeddings)
    print(f"Added {len(ids)} documents")

    # Search (uses hybrid search with RRF fusion)
    results = await connector.hybrid_search("vector database", limit=3)
    for result in results:
        print(f"Score: {result.score:.3f} - {result.content}")

    # Get stats
    stats = await connector.get_stats()
    print(f"Collection has {stats.points_count} points")

    await connector.close()

if __name__ == "__main__":
    asyncio.run(main())
```

### With Metadata

```python
documents = ["Document 1", "Document 2"]
metadata = [
    {"source": "file1.txt", "type": "text"},
    {"source": "file2.txt", "type": "text"}
]
embeddings = await embedding_provider.embed_batch(documents)

ids = await connector.add_pre_embedded_documents(documents, embeddings, metadata=metadata)
```

### Context Manager

```python
async with QdrantConnector(url, collection_name, embedding_provider) as connector:
    results = await connector.search("query")
    # Automatically closes connection
```

## API Reference

### QdrantConnector

Main class for interacting with Qdrant vector store.

#### Methods

- `async add_pre_embedded_documents(documents, embeddings, metadata=None, ids=None)` - Add documents with pre-computed embeddings
- `async search(query=None, limit=5, offset=None, score_threshold=None, query_filter=None)` - Semantic or filter-only search (dense)
- `async hybrid_search(query=None, limit=10, prefetch_limit=20, offset=None, ...)` - Hybrid search with RRF fusion (dense + sparse)
- `async clear_collection()` - Delete all points from the collection
- `async delete_collection()` - Delete the entire collection
- `async get_stats()` - Get collection statistics
- `async ensure_collection_exists(vector_size=None, distance=COSINE)` - Ensure collection exists
- `async ensure_hybrid_collection_exists(dense_vector_size=None, dense_distance=COSINE)` - Create hybrid collection (dense + sparse vectors)
- `async create_text_index(field_name, tokenizer=WORD, min_token_len=2, max_token_len=50, lowercase=True)` - Create text payload index for MatchText filtering
- `async close()` - Close the client connection

### Embedding Providers

#### create_embedding_provider

Factory function to create embedding providers.

```python
provider = create_embedding_provider(
    provider_type=EmbeddingProviderType.FASTEMBED,
    model_name="BAAI/bge-m3",
    cache_dir=None  # Optional cache directory
)
```

### AsyncEmbeddingProvider

Base class for dense-only embedding providers.

#### Methods

- `async embed_query(query: str) -> list[float]`: Embed single query
- `async embed_batch(texts: list[str]) -> list[list[float]]`: Embed multiple texts
- `get_vector_size() -> int`: Get embedding dimension
- `cleanup() -> None`: Release model resources

### MultiVectorEmbeddingProvider

Base class for multi-vector embedding providers (dense + sparse).

#### Methods

- `async embed_query(query: str) -> EmbeddingOutput`: Embed single query (dense + sparse)
- `async embed_batch(texts: list[str]) -> list[EmbeddingOutput]`: Embed multiple texts
- `get_dense_vector_size() -> int`: Get dense vector dimension
- `async embed_dense_only(text: str) -> list[float]`: Get only dense embedding
- `async embed_batch_dense_only(texts: list[str]) -> list[list[float]]`: Get only dense embeddings
- `cleanup() -> None`: Release model resources

### EmbeddingOutput

TypedDict for multi-vector embedding output.
```python
{
    "dense": list[float],        # Dense embedding (e.g., 1024-dim)
    "sparse": dict[int, float]   # Sparse weights {token_id: weight}
}
```

### Adding a New Provider

1. Create a new file in `vector_store/embeddings/`
2. Inherit from `AsyncEmbeddingProvider` or `MultiVectorEmbeddingProvider`
3. Implement required abstract methods
4. Add to `EmbeddingProviderType` enum in `types.py`
5. Update factory in `factory.py`
6. Add tests

## Testing

```bash
# From the repository root
pytest tests/vector_store/ -v

# Unit tests only (no external services needed)
pytest tests/vector_store/ -m "not integration" -v
```

## Contributing

For development guidelines and contribution instructions, see [CONTRIBUTING.md](../../docs/CONTRIBUTING.md).

## License

MIT License - see [LICENSE](../../LICENSE) for details.
