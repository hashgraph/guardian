# Schema Ingestion Worker Configuration Reference

Complete configuration reference for the `schema_ingestion_worker` package — the async JSON schema ingestion pipeline.

## Configuration Class

```python
from schema_ingestion_worker.config import Settings

config = Settings()  # Reads from environment
```

All environment variables use the `SCHEMA_INGESTION_` prefix.

## Configuration Loading

Configuration is loaded via Pydantic Settings with the following precedence (highest to lowest):
1. Environment variables (`SCHEMA_INGESTION_*`)
2. `.env` file values
3. Default values in `Settings` class

## Resource Profiles

The default settings target systems with 16 GB RAM. Adjust batch sizes for your hardware:

| Profile | RAM | `embedding_batch_size` | `onnx_inference_batch_size` | `vector_upsert_batch_size` |
|---------|-----|------------------------|-----------------------------|----------------------------|
| **Low Memory** | 8 GB | 128 | 16 | 25 |
| **Standard (Default)** | 16 GB | 256 | 32 | 50 |
| **High Performance** | 32+ GB | 500 | 64 | 100 |

> **Tip:** Copy the values from your target profile into environment variables or your `.env` file.

## Settings Reference

### Qdrant Connection

| Variable | Type | Default | Validation | Description |
|----------|------|---------|------------|-------------|
| `SCHEMA_INGESTION_QDRANT_URL` | str | `http://localhost:6333` | — | Qdrant server URL |
| `SCHEMA_INGESTION_QDRANT_COLLECTION_NAME` | str | `schema_properties` | — | Qdrant collection name for indexed schema properties |
| `SCHEMA_INGESTION_QDRANT_API_KEY` | str \| None | `None` | — | Qdrant API key for authentication (optional) |

### Embedding Configuration

| Variable | Type | Default | Validation | Description |
|----------|------|---------|------------|-------------|
| `SCHEMA_INGESTION_EMBEDDING_PROVIDER_TYPE` | str | `bge_m3_onnx` | — | Embedding provider type (`bge_m3_onnx` for hybrid search, `fastembed` for dense-only) |
| `SCHEMA_INGESTION_EMBEDDING_MODEL_NAME` | str | `aapot/bge-m3-onnx` | — | HuggingFace embedding model name |
| `SCHEMA_INGESTION_EMBEDDING_BATCH_SIZE` | int | `256` | 1–1000 | Number of properties per outer processing batch. Each batch is embedded and then upserted in sub-batches controlled by `vector_upsert_batch_size` |
| `SCHEMA_INGESTION_ONNX_INFERENCE_BATCH_SIZE` | int | `32` | 1–500 | Maximum number of texts per ONNX Runtime `session.run()` call. Bounds peak memory during inference |

### Pipeline Configuration

| Variable | Type | Default | Validation | Description |
|----------|------|---------|------------|-------------|
| `SCHEMA_INGESTION_MODE` | `override` \| `append` | `override` | — | **override**: Validates and parses all schemas, then clears collection before re-indexing. **append**: Adds new data without removing existing entries (running twice creates duplicates) |
| `SCHEMA_INGESTION_VECTOR_UPSERT_BATCH_SIZE` | int | `50` | 1–1000 | Batch size for Qdrant upsert operations within each embedding batch |

### Data Directories

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SCHEMA_INGESTION_INPUT_SCHEMAS_DIR` | Path | `data/input/schemas` | Directory containing input JSON schema files. In Docker: `/data/input/schemas` |
| `SCHEMA_INGESTION_OUTPUT_DIR` | Path | `data/output` | Directory for output files. In Docker: `/data/output` |

### Timeouts

| Variable | Type | Default | Validation | Description |
|----------|------|---------|------------|-------------|
| `SCHEMA_INGESTION_EMBEDDING_TIMEOUT` | int | `300` | 10–600 | Timeout in seconds for embedding a single batch (~256 properties). Increase for slower hardware |
| `SCHEMA_INGESTION_UPSERT_TIMEOUT` | int | `60` | 10–300 | Timeout in seconds for upserting a single batch to Qdrant |

### Logging

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SCHEMA_INGESTION_LOG_LEVEL` | str | `INFO` | Logging level: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` |

## Configuration Flow

```
Environment Variables (SCHEMA_INGESTION_*)
    ↓
Settings (Pydantic BaseSettings)
    ↓
AsyncSchemaIngestionPipeline(settings)
    ↓
Pipeline Nodes: discover → validate → prepare → parse → clear → [embed → upsert] × N batches
```

## Override Mode Safety

When `mode=override`, the pipeline follows a safe sequence:

1. Discover all schema files
2. **Validate** all schemas can be loaded (fail-fast)
3. **Parse** all properties (resolves `$ref` dependencies)
4. **Clear collection** only after successful validation + parsing
5. Process batches (embed → upsert per batch)

If validation or parsing fails, the existing collection is **not cleared** — preserving your data.

## Memory Safety

The pipeline enforces a maximum of **10,000 properties** per run. If your schemas exceed this limit, split them into multiple runs using append mode.

## Memory Profiles

The defaults target 16GB systems with 12GB Docker Desktop allocation. Adjust batch sizes and Docker `mem_limit` based on your system:

| Profile | System RAM | `embedding_batch_size` | `onnx_inference_batch_size` | `vector_upsert_batch_size` | Worker `mem_limit` |
|---------|-----------|------------------------|-----------------------------|-----------------------------|-------------------|
| **Low Memory** | 8 GB | 128 | 16 | 25 | 2g |
| **Standard (Default)** | 16 GB | 256 | 32 | 50 | 4g |
| **High Performance** | 32+ GB | 500 | 64 | 100 | 6g |

See `.env.low-memory.example` and `.env.high-performance.example` for ready-to-use profile files.

### Docker Desktop Memory Allocation

On Windows/macOS, Docker Desktop runs inside a VM (WSL2 or HyperKit) that reserves overhead:

| Docker Desktop Allocation | Usable by Containers | WSL2/HyperKit Overhead |
|--------------------------|---------------------|----------------------|
| 8 GB | ~4–5 GB | ~3–4 GB |
| 10 GB | ~6–7 GB | ~3–4 GB |
| 12 GB (recommended) | ~8–9 GB | ~3–4 GB |
| 16 GB | ~12–13 GB | ~3–4 GB |

**Minimum recommended**: 12 GB Docker Desktop allocation for the Standard profile (Qdrant 4g + schema worker 4g = 8g, leaving ~4g for overhead).

### High Performance Profile Notes

Users running the High Performance profile (onnx_inference_batch_size=64) on slower hardware should increase `SCHEMA_INGESTION_EMBEDDING_TIMEOUT` to 350–400s. The default 300s timeout has only ~1.07x margin at batch_size=500.

## Docker Configuration

The schema ingestion worker runs as an on-demand service in `docker-compose.yml`:

```yaml
schema-ingestion-worker:
  profiles: ["workers", "ingest-schemas"]
  restart: "no"
  mem_limit: 4g
  memswap_limit: 5g
  volumes:
    - ./data:/data
    - huggingface_cache:/home/nonroot/.cache/huggingface
  environment:
    - SCHEMA_INGESTION_QDRANT_URL=http://qdrant:6333
    - SCHEMA_INGESTION_QDRANT_COLLECTION_NAME=schema_properties
    - SCHEMA_INGESTION_QDRANT_API_KEY=${QDRANT_API_KEY:-}
    - SCHEMA_INGESTION_EMBEDDING_MODEL_NAME=aapot/bge-m3-onnx
    - SCHEMA_INGESTION_EMBEDDING_PROVIDER_TYPE=bge_m3_onnx
    - SCHEMA_INGESTION_EMBEDDING_BATCH_SIZE=256
    - SCHEMA_INGESTION_VECTOR_UPSERT_BATCH_SIZE=50
    - SCHEMA_INGESTION_ONNX_INFERENCE_BATCH_SIZE=32
    - SCHEMA_INGESTION_INPUT_SCHEMAS_DIR=/data/input/schemas
    - SCHEMA_INGESTION_OUTPUT_DIR=/data/output
    - SCHEMA_INGESTION_MODE=override
    - SCHEMA_INGESTION_EMBEDDING_TIMEOUT=300
    - SCHEMA_INGESTION_UPSERT_TIMEOUT=60
    - SCHEMA_INGESTION_LOG_LEVEL=INFO
```

> **Note:** User-tunable environment variables in docker-compose.yml use `${VAR:-default}`
> syntax, so values set in your `.env` file automatically propagate to Docker containers.
> The snippet above shows effective defaults for clarity.

Key Docker differences from local development:
- `SCHEMA_INGESTION_QDRANT_URL` uses `http://qdrant:6333` (Docker service name)
- Data directories use container paths (`/data/...`) mapped via bind mount
- BGE-M3 model cached in the `huggingface_cache` named volume (~2.3 GB)

## See Also

- [README.md](README.md) — Package overview, usage examples, and troubleshooting
- [Root .env.example](../../.env.example) — Environment variable template
- [DOCKER.md](../../docs/DOCKER.md) — Docker services, volumes, and memory configuration
