# Schema Ingestion Worker

JSON schema ingestion pipeline for the Hedera Guardian AI Toolkit. This worker discovers, parses, embeds, and indexes JSON schemas into a Qdrant vector store for semantic search.

## Features

- **Property-Batched Pipeline**: Async pipeline with property-level batching for reliable processing
- **Async-First Architecture**: Full async/await support for I/O operations
- **BGE-M3 ONNX Embeddings**: Fast, efficient embeddings via shared vector_store package
- **Qdrant Vector Store**: Indexes schemas into `schema_properties` collection
- **Schema Parsing**: Extracts and flattens JSON schema definitions with full metadata
- **Batch Processing**: Configurable property-level batching with independent commit per batch
- **Error Handling**: Custom exception hierarchy with CriticalPipelineError abort mechanism

## Architecture

The ingestion pipeline uses an async property-batched architecture:

```
┌─────────────────┐
│ Discover Schemas│ → Find .json files in input directory
└────────┬────────┘
         │
┌────────▼────────┐
│Validate Schemas │ → Validate all schemas can be loaded (fail-fast)
└────────┬────────┘
         │
┌────────▼────────┐
│Prepare Collection│ → Ensure collection exists
└────────┬────────┘
         │
┌────────▼────────┐
│  Parse Schemas  │ → Extract ALL properties from ALL schemas (once)
└────────┬────────┘
         │
┌────────▼────────┐
│ Clear Collection│ → Clear if override mode (after successful parse)
└────────┬────────┘
         │
┌────────▼─────────────────────────────────────────────┐
│ Property Batches (N batches of embedding_batch_size) │
│  ┌──────────────┐    ┌───────────────────┐           │
│  │ Embed Batch  │ →  │ Upsert to Qdrant  │  (repeat) │
│  └──────────────┘    └───────────────────┘           │
└────────┬─────────────────────────────────────────────┘
         │
┌────────▼────────┐
│ Update Progress │ → Track completion and stats
└─────────────────┘
```

### Pipeline Phases

1. **discover_schemas**: Scans input directory for JSON schema files
2. **validate_all_schemas**: Validates all schemas can be loaded before processing
3. **prepare_collection**: Ensures Qdrant collection exists
4. **parse_all_schemas**: Parses ALL schemas once, extracting properties with metadata
5. **clear_collection**: Clears collection if in override mode (after validation + parsing)
6. **property_batches**: Splits properties into batches and processes each:
   - **embed_batch**: Generates embeddings using BGE-M3 ONNX (with timeout)
   - **upsert_to_qdrant**: Indexes documents in Qdrant (with timeout)
7. **update_progress**: Updates processing statistics

## Prerequisites

- Python 3.11+
- Poetry (dependency management)
- Docker (for running Qdrant)
- Qdrant running on localhost:6333 (or configure custom URL)

Start Qdrant:
```bash
docker compose -f ../../docker-compose.yml up -d qdrant
```

## Installation

From the schema_ingestion_worker directory:

```bash
poetry install
```

This installs the package with all dependencies including the shared `vector_store` package.

## Configuration

### Environment Variables

Configure via environment variables or `.env` file:

```bash
# Qdrant Configuration
SCHEMA_INGESTION_QDRANT_URL=http://localhost:6333
SCHEMA_INGESTION_QDRANT_API_KEY=                     # Optional
SCHEMA_INGESTION_QDRANT_COLLECTION_NAME=schema_properties

# Embedding Configuration
SCHEMA_INGESTION_EMBEDDING_MODEL_NAME=aapot/bge-m3-onnx
SCHEMA_INGESTION_EMBEDDING_PROVIDER_TYPE=bge_m3_onnx
SCHEMA_INGESTION_EMBEDDING_BATCH_SIZE=256
SCHEMA_INGESTION_ONNX_INFERENCE_BATCH_SIZE=32        # Max texts per ONNX session.run()

# Data Directories
SCHEMA_INGESTION_INPUT_SCHEMAS_DIR=./data/input/schemas  # Example override; see CONFIG.md for actual defaults
SCHEMA_INGESTION_OUTPUT_DIR=./data/output                # Example override; see CONFIG.md for actual defaults

# Pipeline Configuration
SCHEMA_INGESTION_MODE=override                         # 'override' or 'append'
SCHEMA_INGESTION_VECTOR_UPSERT_BATCH_SIZE=50
SCHEMA_INGESTION_LOG_LEVEL=INFO

# Timeout Configuration
SCHEMA_INGESTION_EMBEDDING_TIMEOUT=300               # seconds (for ~256 properties)
SCHEMA_INGESTION_UPSERT_TIMEOUT=60                   # seconds (for ~256 properties)
```

**Note**: All environment variables use the `SCHEMA_INGESTION_` prefix. For the full configuration reference with types, defaults, and validation ranges, see [CONFIG.md](CONFIG.md).

### Configuration Class

The pipeline uses Pydantic settings for configuration:

```python
from schema_ingestion_worker.config import Settings

config = Settings(
    qdrant_url="http://localhost:6333",
    qdrant_collection_name="schema_properties",
    input_schemas_dir="./data/input/schemas",
    embedding_batch_size=256,
    mode="override"
)
```

### Ingestion Modes

The pipeline supports two ingestion modes:

#### Append Mode

```bash
SCHEMA_INGESTION_MODE=append
```

- **Behavior**: Adds new documents to the existing collection without removing old ones
- **Use case**: Incremental ingestion where you want to keep historical data
- **Note**: Running the pipeline multiple times with the same schemas will create duplicate documents

**Example**:
```bash
# First run: 100 documents added → Total: 100
# Second run: 100 documents added → Total: 200 (duplicates)
```

#### Override Mode (Default)

```bash
SCHEMA_INGESTION_MODE=override
```

- **Behavior**: Replaces all existing data in the collection on each run
- **Use case**: When you want a fresh import each time, discarding old data
- **Safety**: Validates all schemas AND parses all properties before clearing to prevent data loss

**Example**:
```bash
# First run: 100 documents added → Total: 100
# Second run: Collection cleared, 100 documents added → Total: 100 (no duplicates)
```

**Override Mode Workflow**:
1. Discover all schema files
2. **Validate all schemas can be loaded** (fail-fast if any fail)
3. **Parse all properties** (resolves $ref dependencies)
4. **Clear collection** only after successful validation + parsing
5. Process property batches (embed → upsert per batch)
6. If validation or parsing fails, collection is NOT cleared (preserves existing data)

## Usage

### Running the Worker

```bash
# From the schema_ingestion_worker directory
poetry run python -m schema_ingestion_worker

# With custom config
SCHEMA_INGESTION_QDRANT_URL=http://qdrant:6333 poetry run python -m schema_ingestion_worker
```

### Input Data Structure

Place JSON schema files in the input directory:

```
data/
└── input/
    └── schemas/
        ├── user.schema.json
        ├── product.schema.json
        └── order.schema.json
```

### Schema File Format

The pipeline expects standard JSON Schema format:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique user identifier"
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "User email address"
    }
  },
  "required": ["id", "email"]
}
```

### Programmatic Usage

```python
import asyncio
from schema_ingestion_worker.pipeline import AsyncSchemaIngestionPipeline
from schema_ingestion_worker.config import Settings

async def main():
    config = Settings(
        input_schemas_dir="./data/input/schemas",
        qdrant_url="http://localhost:6333",
    )

    async with AsyncSchemaIngestionPipeline(config) as pipeline:
        result = await pipeline.run()
        print(f"Indexed {result.get('total_documents_upserted', 0)} schema properties")

if __name__ == "__main__":
    asyncio.run(main())
```

### Pipeline Details

#### State Management

The pipeline uses a `PipelineState` TypedDict to track workflow state:

```python
class PipelineState(TypedDict, total=False):
    schema_files: list[Path]
    validation_passed: bool
    parsed_documents: list[SchemaDocument]
    embedded_documents: list[dict[str, Any]]
    processed_count: int
    failed_files: list[tuple[Path, str]]
    batch_id: str
```

#### Utility Classes

- **PipelineNodeExecutor**: Standardized node execution with timeout and error handling
- **AsyncBatchProcessor**: Generic batch processing with failure tracking
- **PipelineResultBuilder**: Pydantic model for aggregating pipeline results
- **PipelineValidation**: Memory safety validation (max 10k properties)
- **SchemaMetadataBuilder**: Builds metadata for vector store documents

**Note**: Schema parsing logic (JSON schema extraction, flattening, $ref resolution) is located in the `schema_parsing/` sub-module.

#### Document Format

Parsed schema properties are stored as:

```python
{
    "id": "user.schema.json#/properties/email",
    "content": "email: User email address (string, format: email)",
    "metadata": {
        "schema_name": "User",
        "property_name": "email",
        "property_type": "string",
        "property_format": "email",
        "source_file": "user.schema.json",
        "is_required": True
    }
}
```

## Testing

Run tests from the repository root directory:

```bash
# Unit tests
pytest tests/schema_ingestion_worker/ -v

# With coverage
pytest tests/schema_ingestion_worker/ --cov=schema_ingestion_worker --cov-report=html
```

## Docker

Build and run the worker in Docker:

```bash
# Build the image
docker compose build schema-ingestion-worker

# Run the worker
docker compose run --rm schema-ingestion-worker
```

The container will process schemas from `/data/input/schemas` and connect to the Qdrant service.

### Development

#### Project Structure

```
schema_ingestion_worker/
├── src/
│   └── schema_ingestion_worker/
│       ├── __init__.py
│       ├── __main__.py       # Entry point
│       ├── config.py         # Pydantic configuration
│       ├── models.py         # Data models and state
│       ├── parser.py         # Pipeline orchestrator
│       ├── pipeline.py       # Async pipeline with property batching
│       └── utils.py          # Utility classes (errors, batch processing, etc.)
├── Dockerfile
├── pyproject.toml
└── README.md
```

#### Dependencies

Key dependencies:

- `vector_store` - Shared embedding and Qdrant integration
- `fastembed` - Fast embedding generation (via vector_store)
- `qdrant-client` - Vector database client (via vector_store)
- `pydantic` - Configuration and validation

**Note**: Schema parsing logic lives in the `schema_parsing/` sub-module within this package.

#### Async Best Practices

The pipeline uses:

- `asyncio.to_thread()` for CPU-bound operations (file system calls, schema parsing)
- Native async for I/O operations (Qdrant, embeddings)
- `asyncio.timeout()` for per-node timeout protection
- Proper async context managers for resource cleanup

### Output and Monitoring

#### Progress Logging

The pipeline logs progress at each stage:

```
INFO: Discovering schemas in ./data/input/schemas
INFO: Found 15 schema files
INFO: All schema files validated successfully
INFO: Successfully parsed 127 unique properties from 15 root schemas
INFO: Processing 127 properties in 1 batch(es) of 256
INFO: Successfully generated 127 embeddings
INFO: Successfully upserted 127/127 documents to Qdrant
INFO: Pipeline complete!
```

#### Output Stats

The pipeline returns detailed statistics:

```python
{
    "batch_id": "550e8400-e29b-41d4-a716-446655440000",
    "total_schema_files": 15,
    "total_batches": 1,
    "batches_completed": 1,
    "batches_failed": 0,
    "total_properties_parsed": 127,
    "total_embeddings_generated": 127,
    "total_documents_upserted": 127,
    "failed_files": [],
    "validation_passed": True,
    "embedding_failures": [],
    "upsert_failures": [],
}
```

### Performance

- **Async Pipeline**: ~3-5x faster than sync implementation
- **Batch Embedding**: Processes properties in configurable batches (default: 256)
- **FastEmbed**: Lightweight and fast compared to sentence-transformers
- **Independent Commits**: Each batch is committed to Qdrant independently, preventing data loss on timeout

Typical performance on commodity hardware:
- ~10-20 schemas/second parsing
- ~50-100 properties/second embedding
- ~100+ documents/second Qdrant indexing

### Integration with MCP Server

Once schemas are indexed, they can be searched via the MCP server:

```text
# MCP server provides these tools:
- schema_properties_search(query, filter, limit, offset)
- schema_properties_get_index_status()
```

See `hedera_guardian_mcp_server/README.md` for details on querying indexed schemas.

## Troubleshooting

### No Schema Files Found

**Issue**: Pipeline reports "Found 0 schema files"

**Solutions**:
1. Check `SCHEMA_INGESTION_INPUT_SCHEMAS_DIR` path is correct
2. Ensure `.json` files exist in the input directory
3. Verify file permissions allow reading
4. Use absolute paths if relative paths aren't working

### Connection Refused to Qdrant

**Issue**: `ConnectionError: Connection refused to http://localhost:6333`

**Solutions**:
1. Ensure Qdrant is running:
   ```bash
   docker compose -f ../../docker-compose.yml up -d qdrant
   ```
2. Check Qdrant status:
   ```bash
   curl http://localhost:6333/
   ```
3. Verify `SCHEMA_INGESTION_QDRANT_URL` is correct
4. Check firewall/network settings

### First Run Very Slow

**Issue**: First ingestion takes significantly longer than subsequent runs

**Explanation**: This is expected behavior. The first run downloads the embedding model (~2.3 GB for bge-m3-onnx) from HuggingFace. The model is cached locally for future runs.

**Solutions**:
1. Be patient on first run (one-time download)
2. Pre-download models in Docker builds
3. Use a local model cache mount in Docker

### Memory Issues

**Issue**: Out of memory errors during processing

**Solutions**:
1. Reduce `SCHEMA_INGESTION_EMBEDDING_BATCH_SIZE` (default: 256)
2. Process schemas in smaller batches
3. Check for very large schema files (>10k properties triggers safety limit)

### Schema Parsing Errors

**Issue**: `ValidationException` or schema parsing failures

**Solutions**:
1. Validate JSON schema syntax with a JSON validator
2. Check for unsupported `$ref` patterns
3. Enable debug logging: `SCHEMA_INGESTION_LOG_LEVEL=DEBUG`
4. Review failed files in pipeline output

## Contributing

For development guidelines and contribution instructions, see [CONTRIBUTING.md](../../docs/CONTRIBUTING.md).

## License

MIT License - see [LICENSE](../../LICENSE) for details.
