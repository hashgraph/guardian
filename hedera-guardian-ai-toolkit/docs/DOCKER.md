# Docker Setup & Development

> **Audience:** DevOps engineers and operators

This document covers Docker configuration, service architecture, and development workflows.

## Quick Reference

```bash
# Start infrastructure (Qdrant + MCP server)
docker compose up -d

# Start only Qdrant (for local development)
docker compose up -d qdrant

# Run schema ingestion worker (on-demand)
docker compose run --rm schema-ingestion-worker

# Run document ingestion worker - CPU (on-demand)
docker compose run --rm document-ingestion-worker

# Run document ingestion worker - GPU
docker compose -f docker-compose.yml -f docker-compose.gpu.yml run --rm document-ingestion-worker

# Run MCP server with GPU-accelerated embeddings
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d hedera-guardian-mcp-server

# Run schema ingestion worker - GPU
docker compose -f docker-compose.yml -f docker-compose.gpu.yml run --rm schema-ingestion-worker

# Run document ingestion worker - Low-Memory (8-12GB RAM)
docker compose -f docker-compose.yml -f docker-compose.low-memory.yml run --rm document-ingestion-worker

# View logs
docker compose logs -f hedera-guardian-mcp-server

# Rebuild after code changes
docker compose build hedera-guardian-mcp-server
docker compose build --no-cache  # Full rebuild
```

## Understanding Profiles

Services are split into two groups using Docker Compose **profiles**:

| Group | Services | Profile(s) | Lifecycle |
|-------|----------|------------|-----------|
| Infrastructure | qdrant, hedera-guardian-mcp-server | _(none)_ | Always-on, start with `up -d` |
| Schema worker | schema-ingestion-worker | `workers`, `ingest-schemas` | On-demand, run with `run --rm` |
| Document worker | document-ingestion-worker | `workers`, `ingest-documents` | On-demand, run with `run --rm` |

**Why profiles?** Without profiles, `docker compose up -d` starts everything — workers run once, exit, and leave confusing stopped containers. With profiles, `up -d` only starts infrastructure. Workers are invoked explicitly when needed.

**Key behaviors:**
- `docker compose up -d` starts only infrastructure (no profile = always active)
- `docker compose run --rm <worker>` auto-activates the worker's profile — no `--profile` flag needed
- `docker compose --profile workers build` builds infrastructure + all workers
- `docker compose --profile ingest-schemas run --rm schema-ingestion-worker` runs only the schema worker

> **Memory warning:** `--profile workers` starts ALL workers simultaneously (4g + 10g = 14g+). Prefer running workers individually or use the specific `ingest-schemas` / `ingest-documents` profiles.

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Service Dependencies                      │
└─────────────────────────────────────────────────────────────┘

qdrant (port 6333, 6334) ──── always-on, healthcheck
  │
  ├── hedera-guardian-mcp-server (port 9000) ──── always-on, healthcheck
  │     ├── depends: qdrant (service_healthy)
  │     └── Exposes semantic search via MCP protocol
  │
  ├── schema-ingestion-worker ──── on-demand [profile: workers | ingest-schemas]
  │     ├── depends: qdrant (service_healthy)
  │     └── Indexes JSON schemas into schema_properties collection
  │
  └── document-ingestion-worker ──── on-demand [profile: workers | ingest-documents]
        ├── depends: qdrant (service_healthy)
        ├── Indexes PDF documents into methodology_documents collection
        └── Supports CPU/GPU variants (see below)
```

## Services

| Service | Port | Restart | Profile | Purpose |
|---------|------|---------|---------|---------|
| qdrant | 6333, 6334 | always | _(infra)_ | Vector database |
| hedera-guardian-mcp-server | 9000 | unless-stopped | _(infra)_ | MCP semantic search |
| schema-ingestion-worker | - | no (one-shot) | `workers`, `ingest-schemas` | Schema ingestion pipeline |
| document-ingestion-worker | - | no (one-shot) | `workers`, `ingest-documents` | Document ingestion (CPU/GPU) |

## Document Ingestion Worker: CPU vs GPU

The document-ingestion-worker supports both CPU and GPU builds via docker compose override:

| Variant | Image Size | Build Command |
|---------|-----------|---------------|
| CPU (default) | ~3.5 GB | `docker compose --profile workers build document-ingestion-worker` |
| GPU | ~14 GB | `docker compose -f docker-compose.yml -f docker-compose.gpu.yml --profile workers build document-ingestion-worker` |

### CPU Version (Default)
```bash
docker compose --profile workers build document-ingestion-worker
docker compose run --rm document-ingestion-worker
```

### GPU Version
Requires NVIDIA Docker runtime installed.

```bash
# Build
docker compose -f docker-compose.yml -f docker-compose.gpu.yml --profile workers build document-ingestion-worker

# Run
docker compose -f docker-compose.yml -f docker-compose.gpu.yml run --rm document-ingestion-worker
```

**Tip:** Create an alias:
```bash
alias dc-gpu='docker compose -f docker-compose.yml -f docker-compose.gpu.yml'
dc-gpu --profile workers build document-ingestion-worker
dc-gpu run --rm document-ingestion-worker
```

### Low-Memory Systems (8-12GB)

For systems with 8-12GB RAM (common on Windows laptops with Docker Desktop), use the low-memory compose override. This reduces container `mem_limit` values to fit within the ~8GB available after Windows/macOS VM overhead.

```bash
# Run document ingestion with low-memory limits
docker compose -f docker-compose.yml -f docker-compose.low-memory.yml run --rm document-ingestion-worker

# Start infrastructure with low-memory limits
docker compose -f docker-compose.yml -f docker-compose.low-memory.yml up -d
```

**Tip:** Create an alias:
```bash
alias dc-low='docker compose -f docker-compose.yml -f docker-compose.low-memory.yml'
dc-low up -d
dc-low run --rm document-ingestion-worker
```

> **Note:** The low-memory and GPU overrides are mutually exclusive. Low-memory forces CPU mode for compatibility with resource-constrained systems.

**What the override changes:**

| Service | Default `mem_limit` | Low-Memory `mem_limit` |
|---------|--------------------|-----------------------|
| qdrant | 4g | 2g |
| hedera-guardian-mcp-server | 4g | 2g |
| schema-ingestion-worker | 4g | 3g |
| document-ingestion-worker | 10g | 6g |

Additionally, the document worker override disables Surya formula enrichment, enables subprocess memory enforcement (5GB psutil limit), reduces batch sizes to 1, and forces CPU mode. For further tuning, see `packages/document_ingestion_worker/.env.low-memory.example`.

### Build Architecture & Workarounds

The document-ingestion-worker Dockerfile uses different strategies for CPU vs GPU builds due to PyTorch's complex dependency structure:

#### The Problem

PyTorch on PyPI bundles NVIDIA CUDA dependencies (~1.5GB of nvidia-* packages) even though CPU-only wheels exist at `https://download.pytorch.org/whl/cpu`. Poetry's dependency resolver uses PyPI metadata and can't be configured to use package-index-specific resolution, so a naive `poetry install` always pulls CUDA dependencies.

#### CPU Build Solution: pip export + filtering

```dockerfile
# 1. Export dependencies to requirements.txt
poetry export -f requirements.txt --without-hashes -o /tmp/requirements-full.txt

# 2. Filter out nvidia-* and triton packages (CUDA dependencies)
grep -v -E '^(nvidia-|triton)' /tmp/requirements-full.txt > /tmp/requirements.txt

# 3. Install with CPU torch index as primary
pip install -r /tmp/requirements.txt \
    --index-url https://download.pytorch.org/whl/cpu \
    --extra-index-url https://pypi.org/simple
```

This gives us CPU-only torch (~180MB) instead of CUDA torch (~2GB).

#### GPU Build Solution: pip export + filtering (same as CPU)

```dockerfile
# 1. Export dependencies, filter out torch/nvidia/triton
poetry export -f requirements.txt --without-hashes --extras surya -o /tmp/requirements-full.txt
grep -v -E '^(nvidia-|triton|torch)' /tmp/requirements-full.txt > /tmp/requirements.txt

# 2. Install CUDA torch separately (prevents pip pulling CPU torch from PyPI)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128

# 3. Install remaining deps from PyPI
pip install -r /tmp/requirements.txt
```

Torch and NVIDIA packages are installed from the cu128 index in a dedicated step; remaining dependencies come from PyPI with those packages filtered out to avoid version conflicts.

## MCP Server & Schema Worker: GPU Builds

> Requires NVIDIA Docker runtime installed.

The MCP server and schema ingestion worker also support GPU builds for GPU-accelerated ONNX embedding inference. The GPU override installs `onnxruntime-gpu` with NVIDIA CUDA 12 libraries.

```bash
# Build GPU variants
docker compose -f docker-compose.yml -f docker-compose.gpu.yml build hedera-guardian-mcp-server schema-ingestion-worker

# Run MCP server with GPU
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d hedera-guardian-mcp-server

# Run schema worker with GPU
docker compose -f docker-compose.yml -f docker-compose.gpu.yml run --rm schema-ingestion-worker
```

GPU detection is automatic — `CUDAExecutionProvider` is used when available, with CPU fallback. Check logs for `ONNX Runtime active providers: ['CUDAExecutionProvider', 'CPUExecutionProvider']` to confirm GPU is active.

## Environment Variables

> For the complete environment variable reference for each service, see the per-package CONFIG.md files linked from the [root README](../README.md#package-documentation).

### Local Development (.env)
```bash
QDRANT_HOST=localhost
QDRANT_PORT=6333
SCHEMA_INGESTION_QDRANT_URL=http://localhost:6333
DOCUMENT_INGESTION_QDRANT_URL=http://localhost:6333
EMBEDDING_MODEL=aapot/bge-m3-onnx
SCHEMA_INGESTION_MODE=override
```

### Docker (docker-compose.yml)
```bash
QDRANT_HOST=qdrant                              # Docker service name
SCHEMA_INGESTION_QDRANT_URL=http://qdrant:6333  # Set in docker-compose.yml
DOCUMENT_INGESTION_QDRANT_URL=http://qdrant:6333 # Set in docker-compose.yml
```

Key difference: Use service names (`qdrant`) instead of `localhost` inside Docker network.

## Volume Mounts

### Named Volumes

| Volume | Container Path | Services | Purpose |
|--------|---------------|----------|---------|
| `qdrant_storage` | /qdrant/storage | qdrant | Database persistence |
| `huggingface_cache` | /home/nonroot/.cache/huggingface | mcp-server, schema-worker, document-worker | BGE-M3 embedding model (~2.3 GB) |
| `datalab_cache` | /home/nonroot/.cache/datalab | document-worker | Surya OCR model cache (~1.4 GB) |

### Bind Mounts

| Host Path | Container Path | Services | Purpose |
|-----------|---------------|----------|---------|
| ./data | /data | all workers + mcp-server | Input data, output, staging |

## Model Caching

> For a complete inventory of all ML models, configuration variables, and the models-by-package matrix, see [MODELS.md](MODELS.md).

The pipeline uses two independent model cache ecosystems, each backed by a Docker named volume:

| Cache | Volume | Models | Size | Services |
|-------|--------|--------|------|----------|
| HuggingFace | `huggingface_cache` | BGE-M3 ONNX embeddings | ~2.3 GB | mcp-server, schema-worker, document-worker |
| Datalab | `datalab_cache` | Surya OCR text recognition | ~1.4 GB | document-worker only |

**First run** downloads models from their respective sources (~5-10 min depending on network speed). Subsequent container runs reuse cached models from the named volumes with no re-download.

**Cache management:**
```bash
# List volumes
docker volume ls | grep hedera-guardian-ai-toolkit

# Inspect a volume
docker volume inspect hedera-guardian-ai-toolkit_datalab_cache

# Clear a specific cache (forces re-download on next run)
docker volume rm hedera-guardian-ai-toolkit_datalab_cache
docker volume rm hedera-guardian-ai-toolkit_huggingface_cache
```

## Health Checks

Both infrastructure services have health checks:

| Service | Method | Interval | Timeout | Retries | Start Period |
|---------|--------|----------|---------|---------|--------------|
| qdrant | HTTP /readyz on port 6333 (bash) | 30s | 10s | 3 | 10s |
| hedera-guardian-mcp-server | TCP on port 9000 (python) | 10s | 5s | 5 | 60s |

The MCP server uses a longer start period (60s) because the BGE-M3 ONNX embedding model takes 30-45s to load on cold start (10-20s cached). Total startup tolerance is 60s start period + (10s interval x 5 retries) = 110s.

Workers depend on `qdrant: service_healthy` and the MCP server depends on `qdrant: service_healthy`, so Qdrant must pass its health check before dependents start.

> **No manual health checks needed:** The MCP server uses `depends_on: qdrant: condition: service_healthy`, so it automatically waits for Qdrant to become healthy before starting. Simply run `docker compose up -d` and both services will start in the correct order.

## Memory Limits

All services have `mem_limit` and `memswap_limit` to prevent silent OOM kills and unbounded memory growth:

| Service | mem_limit | memswap_limit | Rationale |
|---------|-----------|---------------|-----------|
| qdrant | 4g | 5g | Vector DB with on-disk storage; 4GB covers typical index sizes |
| hedera-guardian-mcp-server | 4g | 5g | BGE-M3 ONNX model (~600MB) + embedding inference overhead |
| schema-ingestion-worker | 4g | 5g | ONNX inference peak (~600MB model + attention matrices + ColBERT output) |
| document-ingestion-worker (CPU) | 10g | 12g | PDF parsing + Surya formula enrichment; adjust for system RAM (see comments in compose) |
| document-ingestion-worker (low-memory) | 6g | 7g | Low-memory override; Surya disabled, subprocess limit 5g |
| document-ingestion-worker (GPU) | 24g | 28g | 4 parallel subprocesses with GPU-accelerated models |

Stateless workers (schema-ingestion) also run with `read_only: true` and `tmpfs: /tmp` for additional filesystem isolation.

### Docker Desktop Memory Note

On Windows/macOS, Docker Desktop runs inside a VM (WSL2 or HyperKit) that reserves 3–4 GB overhead:

| System RAM | Available for Docker | Recommended Compose Override |
|------------|---------------------|------------------------------|
| 8-12 GB | ~6-8 GB | `docker-compose.low-memory.yml` |
| 16 GB | ~10 GB | default (`docker-compose.yml`) |
| 32+ GB | ~20+ GB | `docker-compose.gpu.yml` (if GPU available) |

The default profile (Qdrant 4g + document worker 10g = 14g limits) exceeds what 12GB systems can provide. Use the low-memory override to reduce limits to fit within the available budget. Note that `mem_limit` is a cap, not a reservation — actual memory usage is typically much lower than the limit.

## Log Rotation

All services use Docker's `json-file` logging driver with size-based rotation:

| Service Type | max-size | max-file | Total Cap | Rationale |
|-------------|----------|----------|-----------|-----------|
| Infrastructure (qdrant, MCP server) | 10m | 3 | 30MB | Always-on; bounded growth prevents disk exhaustion |
| Workers (schema, document ingestion) | 100m | 5 | 500MB | Multi-hour batch runs; generous cap preserves full run logs |

Workers run with `docker compose run --rm`, which deletes the container and its logs on exit. Mid-run rotation would discard early diagnostic output with no recovery path, so worker limits are sized to cover multi-hour runs (~10h at peak output).

## Common Workflows

### Fresh Setup
```bash
cp .env.example .env
# Start infrastructure (Qdrant + MCP server)
docker compose up -d
# Verify both are healthy
docker compose ps
# Run ingestion workers
docker compose run --rm schema-ingestion-worker
docker compose run --rm document-ingestion-worker
```

### Re-index Schemas
```bash
# Override mode replaces all data
SCHEMA_INGESTION_MODE=override docker compose run --rm schema-ingestion-worker
```

### Re-index Documents
```bash
# Override mode replaces all data (CPU)
DOCUMENT_INGESTION_MODE=override docker compose run --rm document-ingestion-worker

# With GPU
DOCUMENT_INGESTION_MODE=override docker compose -f docker-compose.yml -f docker-compose.gpu.yml run --rm document-ingestion-worker
```

### Development Cycle
```bash
# Make code changes, then:
docker compose build hedera-guardian-mcp-server
docker compose up -d hedera-guardian-mcp-server
```

### View Qdrant Collections
```bash
curl http://localhost:6333/collections
curl http://localhost:6333/collections/schema_properties
```

## Local Dev vs Docker Dev

| Aspect | Local Dev | Docker Dev |
|--------|-----------|------------|
| Qdrant URL | localhost:6333 | qdrant:6333 |
| Code changes | Immediate | Requires rebuild |
| Debugging | Full IDE support | Container logs |
| Dependencies | System packages | Containerized |

**Recommended workflow**: Run Qdrant in Docker, services locally:
```bash
docker compose up -d qdrant
poetry run python -m schema_ingestion_worker
poetry run python -m mcp_server
```

## Troubleshooting

**"Connection refused to Qdrant"**
- Ensure Qdrant is running: `docker compose up -d qdrant`
- Check health: `docker compose ps` (should show "healthy")

**"No schema files found"**
- Verify `./data/input/schemas/` contains .json files
- Check mount: `docker compose run --rm schema-ingestion-worker ls /data/input/schemas`

**"No PDF files found"**
- Verify `./data/input/documents/` contains .pdf files
- Check mount: `docker compose run --rm document-ingestion-worker ls /data/input/documents`

**Service won't start**
- Check logs: `docker compose logs <service-name>`
- Verify dependencies are healthy: `docker compose ps`

**Stale data after code changes**
- Rebuild: `docker compose build <service-name>`
- Or use override mode for ingestion

**Models re-downloading every run**
- Verify named volumes are mounted: `docker inspect <container-id> | grep -A5 "Mounts"`
- Check that `huggingface_cache` and `datalab_cache` volumes exist: `docker volume ls`
- Ensure you're using `docker compose run --rm` (not `docker run`) so compose volumes apply

**Surya model corrupted**
- Remove and re-download: `docker volume rm hedera-guardian-ai-toolkit_datalab_cache`
- Next run will re-download the Surya text recognition model (~1.4 GB)

**Schema worker OOM or timeout in Docker Desktop**
- Default batch sizes (256/32/50) target 16 GB systems with 12 GB Docker allocation
- For 8 GB systems: use `SCHEMA_INGESTION_EMBEDDING_BATCH_SIZE=128`, `SCHEMA_INGESTION_ONNX_INFERENCE_BATCH_SIZE=16`, `SCHEMA_INGESTION_VECTOR_UPSERT_BATCH_SIZE=25`, and reduce `mem_limit` to `2g`
- For 32+ GB systems: use `SCHEMA_INGESTION_EMBEDDING_BATCH_SIZE=500`, `SCHEMA_INGESTION_ONNX_INFERENCE_BATCH_SIZE=64`, `SCHEMA_INGESTION_VECTOR_UPSERT_BATCH_SIZE=100`, and increase `mem_limit` to `6g`
- Monitor live memory: `docker stats schema-ingestion-worker`
- See `packages/schema_ingestion_worker/CONFIG.md` for profile details

**Docker container OOM on 8-12GB Windows/macOS**
- The default `mem_limit: 10g` for the document worker exceeds available memory on 12GB systems
- Use the low-memory compose override: `docker compose -f docker-compose.yml -f docker-compose.low-memory.yml run --rm document-ingestion-worker`
- This reduces container limits (worker 6g, Qdrant 2g) and enables subprocess memory enforcement

**Subprocess memory grows unbounded**
- The subprocess memory limit requires psutil (bundled as a required dependency)
- Set `DOCUMENT_INGESTION_SUBPROCESS_MEMORY_LIMIT_GB` in `.env` or use `docker-compose.low-memory.yml` (sets 5GB)
- The limit is enforced via psutil RSS monitoring inside the container (works on all host OSes)

**Document fails with OOM but system has free memory**
- The subprocess memory limit (psutil) kills individual document subprocesses at the configured threshold (default: 5GB in low-memory override)
- Failed documents are logged and skipped — there is no automatic retry
- To process large documents, increase the limit: `DOCUMENT_INGESTION_SUBPROCESS_MEMORY_LIMIT_GB=8`
- Also increase `mem_limit` in compose if needed to accommodate the higher subprocess limit

**Out of disk space**
- Total model cache is ~3.7 GB (HuggingFace ~2.3 GB + Surya ~1.4 GB)
- Clear all caches: `docker volume rm hedera-guardian-ai-toolkit_huggingface_cache hedera-guardian-ai-toolkit_datalab_cache`
- Clear Qdrant data: `docker volume rm hedera-guardian-ai-toolkit_qdrant_storage`

---

## See Also

- [QUICKSTART.md](QUICKSTART.md) — Quick setup and first search
- [USER-GUIDE.md](USER-GUIDE.md) — End-user guide for Claude Desktop integration
- [CONTRIBUTING.md](CONTRIBUTING.md) — Development workflow and code style
- [MODELS.md](MODELS.md) — ML/AI models inventory, configuration, resource requirements
- [Root README](../README.md) — Project overview and package index
