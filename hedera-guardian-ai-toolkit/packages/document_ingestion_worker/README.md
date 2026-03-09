# Document Ingestion Worker

Parallel document processing pipeline that converts methodology documents (PDF, DOCX) into vector embeddings for semantic search.

The document ingestion worker processes documents through a simplified pipeline:

```
Document → Parse (Docling) → Chunk (contextualized) → Embed → Qdrant
```

Each document is processed independently and in parallel, with intermediate results saved for resumability. Chunking uses Docling's `contextualize()` method which automatically includes heading hierarchy as markdown prefixes in chunk text.

## Features

- **Parallel Processing**: Process multiple documents (PDF, DOCX) concurrently with configurable parallelism
- **GPU Acceleration**: CUDA support for layout analysis, table extraction, and OCR models
- **Optimized for Digital PDFs**: OCR disabled by default (digital PDFs have embedded text)
- **Best-in-Class Table Extraction**: TableFormer ACCURATE mode for complex tables
- **Formula Extraction**: Extract equations as LaTeX via formula enrichment
- **Contextual Chunking**: Chunks include heading hierarchy from Docling's contextualization
- **Large Chunk Size**: Default 5000 tokens for comprehensive context
- **Resumable Pipeline**: Resume from parsed or chunked state to skip expensive operations
- **Per-Document Isolation**: Each document has its own staging folder for intermediate files

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  ParallelDocumentIngestionPipeline          │
│                         (Orchestrator)                      │
├─────────────────────────────────────────────────────────────┤
│  • Discovers documents (PDF, DOCX) in input directory       │
│  • Spawns parallel SingleDocumentPipeline per document      │
│  • Manages global collection operations (override mode)     │
│  • Aggregates results                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   SingleDocumentPipeline                    │
│                    (Per-Document Graph)                     │
├─────────────────────────────────────────────────────────────┤
│  validate → parse → save_parsed → chunk → save_raw →        │
│  prepare → save_prepared → embed → save_embedded → upsert   │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
data/
├── input/documents/              # Place PDF/DOCX files here
│   └── methodology.pdf
└── staged/documents/             # Intermediate and final files (per-document)
    └── methodology/
        ├── parsed/
        │   └── methodology.json  # Docling parsed document
        ├── chunks_raw/
        │   └── chunk_00001.json  # Raw chunks with full metadata
        ├── chunks_prepared/
        │   └── chunk_00001.json  # Embedding-ready chunks
        └── chunks_embedded/
            └── chunk_00001.json  # Embedded documents with vectors
```

### Output Formats

#### Prepared Chunks (staged/chunks_prepared/)

Embedding-ready chunks with structured content. The `text` field includes markdown heading prefixes from Docling's contextualization:

```json
{
  "embedding_input": "## 1 SOURCES\n### 1.1 Overview\nactual chunk text...",
  "content": {
    "chunk_id": 1,
    "text": "## 1 SOURCES\n### 1.1 Overview\nactual chunk text...",
    "heading": "1.1 Overview",
    "headings": ["1 SOURCES", "1.1 Overview"],
    "page_no": 5,
    "token_count": 145
  },
  "source": "/data/input/documents/methodology.pdf",
  "document_name": "methodology"
}
```

Note: `heading` contains the last heading in the hierarchy (for display), while `headings` contains the full hierarchy list (for filtering).

#### Embedded Documents (staged/chunks_embedded/)

Final embedded documents with vectors:

```json
{
  "text": "Section: 1 SOURCES > 1.1 Overview | Content: ...",
  "embedding": [0.123, 0.456, ...],
  "metadata": {
    "content": { ... },
    "source": "/data/input/documents/methodology.pdf",
    "document_name": "methodology"
  }
}
```

### Pipeline Nodes

| Node | Description |
|------|-------------|
| `validate_pdf` | Check document exists and is readable |
| `parse_pdf` | Convert PDF/DOCX to DoclingDocument |
| `save_parsed` | Save to `staged/<doc>/parsed/` |
| `chunk_document` | Split into contextualized chunks with headings |
| `save_raw_chunks` | Save to `staged/<doc>/chunks_raw/` |
| `prepare_for_embedding` | Transform to embedding format |
| `save_prepared_chunks` | Save to `staged/<doc>/chunks_prepared/` |
| `embed_chunks` | Generate embeddings with BGE-M3 ONNX |
| `save_embedded_documents` | Save to `staged/<doc>/chunks_embedded/` |
| `upsert_to_qdrant` | Index in Qdrant |

## Installation

### Local Development

```bash
cd packages/document_ingestion_worker
poetry install

# For OCR support (Tesseract)
# Windows: choco install tesseract
# Ubuntu: apt-get install tesseract-ocr
# macOS: brew install tesseract
```

**Note**: Document parsing logic (PDF parser, DOCX parser, chunker) is located in the `document_parsing/` sub-module.

### GPU Support (CUDA)

For GPU acceleration, install PyTorch with CUDA support:

```bash
# Install PyTorch with CUDA 12.8 (recommended)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128

# Or CUDA 12.4 (if your driver doesn't support 12.8)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
```

**Note:** If you already have CPU-only PyTorch installed, use `--force-reinstall`:

```bash
pip install --force-reinstall torch torchvision --index-url https://download.pytorch.org/whl/cu128
```

Verify CUDA is available:

```python
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA version: {torch.version.cuda}")
print(f"GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'}")
```

## Configuration

All settings use the `DOCUMENT_INGESTION_` prefix. See [`.env.high-quality.example`](.env.high-quality.example) and [`.env.low-memory.example`](.env.low-memory.example) for profile-specific settings, or [`../../.env.example`](../../.env.example) for the root environment template.

### Key Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCUMENT_INGESTION_QDRANT_URL` | `http://localhost:6333` | Qdrant server URL |
| `DOCUMENT_INGESTION_QDRANT_COLLECTION_NAME` | `methodology_documents` | Collection for document chunks |
| `DOCUMENT_INGESTION_DATA_DIR` | `data` | Base directory for input/staged/output |
| `DOCUMENT_INGESTION_MODE` | `override` | `override` (default) or `append` existing data |
| `DOCUMENT_INGESTION_MAX_PARALLEL_FILES` | `1` | Concurrent document processing |
| `DOCUMENT_INGESTION_SUBPROCESS_MEMORY_LIMIT_GB` | `None` | Per-subprocess RSS memory limit (GB). Enforced via psutil (bundled). |
| `DOCUMENT_INGESTION_START_FROM` | `beginning` | Pipeline entry point |

### PDF Parser Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCUMENT_INGESTION_DO_OCR` | `false` | Enable OCR (only needed for scanned PDFs) |
| `DOCUMENT_INGESTION_OCR_LANG` | `["eng"]` | Tesseract language codes (ISO 639-3) |
| `DOCUMENT_INGESTION_FORCE_FULL_PAGE_OCR` | `false` | Force full-page OCR |
| `DOCUMENT_INGESTION_TESSERACT_CMD` | (system) | Custom Tesseract path |
| `DOCUMENT_INGESTION_DO_TABLE_STRUCTURE` | `true` | Extract table structure |
| `DOCUMENT_INGESTION_TABLE_STRUCTURE_MODE` | `accurate` | `accurate` or `fast` |
| `DOCUMENT_INGESTION_DO_CELL_MATCHING` | `true` | Map structure to PDF cells |
| `DOCUMENT_INGESTION_DO_FORMULA_ENRICHMENT` | `true` | Extract formulas as LaTeX |

### Postprocessing Options

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCUMENT_INGESTION_APPLY_HIERARCHY_POSTPROCESSING` | `true` | Correct heading levels using PDF TOC/bookmarks |
| `DOCUMENT_INGESTION_FIX_ORPHANED_LIST_ITEMS` | `false` | Fix list items misclassified as section_headers at page boundaries |
| `DOCUMENT_INGESTION_MERGE_SPLIT_TABLES` | `true` | Detect and merge tables split across page boundaries |
| `DOCUMENT_INGESTION_ISOLATE_TABLE_CHUNKS` | `true` | Keep each table as a separate chunk (prevents merging under shared headings) |

### Chunker Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCUMENT_INGESTION_CHUNK_MAX_TOKENS` | `5000` | Maximum tokens per chunk |
| `DOCUMENT_INGESTION_CHUNK_OVERLAP_TOKENS` | `0` | Overlap between chunks |
| `DOCUMENT_INGESTION_EMBEDDING_MODEL_NAME` | `aapot/bge-m3-onnx` | Model for tokenization |

### GPU/Accelerator Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCUMENT_INGESTION_ACCELERATOR_DEVICE` | `auto` | Device for ML models: `auto`, `cuda`, `mps`, or `cpu` |
| `DOCUMENT_INGESTION_NUM_THREADS` | `2` | CPU threads for parallel processing |
| `DOCUMENT_INGESTION_OCR_BATCH_SIZE` | `2` | Batch size for OCR model. Default 2 for 16GB CPU. |
| `DOCUMENT_INGESTION_LAYOUT_BATCH_SIZE` | `2` | Batch size for layout analysis. Default 2 for 16GB CPU. |
| `DOCUMENT_INGESTION_TABLE_BATCH_SIZE` | `2` | Batch size for table structure. Default 2 for 16GB CPU. |

**Device options:**
- `auto` - Automatically detect best available device (CUDA > MPS > CPU)
- `cuda` - Force NVIDIA GPU (requires PyTorch with CUDA)
- `mps` - Apple Silicon GPU (macOS only)
- `cpu` - Force CPU processing

**Batch size recommendations:**
- GPU with 8GB+ VRAM: `layout_batch_size=32-64`, `ocr_batch_size=16-32`
- GPU with 4-8GB VRAM: `layout_batch_size=16-32`, `ocr_batch_size=8-16`
- CPU (16GB RAM): Use defaults (all batch sizes = 2)

### Surya Formula Enrichment Settings

Surya provides enhanced formula recognition with better accuracy for subscripts/superscripts.

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCUMENT_INGESTION_USE_SURYA_FORMULA_ENRICHMENT` | `true` | Use Surya instead of Docling's built-in model |
| `DOCUMENT_INGESTION_SURYA_BATCH_SIZE` | `2` | Batch size (16GB CPU: 2, GPU: 8-16) |
| `DOCUMENT_INGESTION_SURYA_UPSCALE_FACTOR` | `1.5` | Pre-inference upscale (improves subscripts) |
| `DOCUMENT_INGESTION_SURYA_EXPANSION_FACTOR_HORIZONTAL` | `0.15` | Bounding box horizontal expansion |
| `DOCUMENT_INGESTION_SURYA_EXPANSION_FACTOR_VERTICAL` | `0.15` | Bounding box vertical expansion |

### PDF Rendering Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCUMENT_INGESTION_PDF_BACKEND` | `dlparse_v2` | PDF parsing backend (`dlparse_v2` faster, `dlparse_v1` supports OCR) |
| `DOCUMENT_INGESTION_PDF_IMAGES_SCALE` | `2.0` | Page rendering scale (16GB: 2.0, High Quality: 4.0) |

### Resource Profiles

The default settings use the **Balanced 16GB** profile, optimized for systems with 16GB RAM. For higher-memory systems or GPU acceleration, use the High Quality profile. For 8GB systems, use the Low Memory profile which disables Surya formula enrichment.

#### Profile Summary

| Profile | RAM | `embedding_batch_size` | `surya_batch_size` | `pdf_images_scale` | `surya_upscale_factor` | `subprocess_memory_limit_gb` |
|---------|-----|------------------------|--------------------|--------------------|------------------------|------------------------------|
| **Low Memory** | 8GB | 5 | - (Surya disabled) | 2.0 | - | `6` |
| **Balanced (Default)** | 16GB | 5 | 2 | 2.0 | 1.5 | `None` (disabled) |
| **High Quality** | 16+ GB / GPU | 25 | 4 | 4.0 | 1.0 | `None` (disabled) |

#### Memory Impact by Setting

| Setting | Default | Memory Impact | Notes |
|---------|---------|---------------|-------|
| `max_parallel_files` | 1 | **HIGH** | Each file loads full ML pipeline |
| `subprocess_memory_limit_gb` | None | **SAFETY** | Kills subprocess if RSS exceeds limit (Windows has no OOM killer) |
| `embedding_batch_size` | 5 | **HIGH** | Batches accumulate in memory |
| `pdf_images_scale` | 2.0 | **HIGH** | Page rendering resolution |
| `layout_batch_size` | 2 | **HIGH** | ML inference batch size |
| `table_batch_size` | 2 | MEDIUM | TableFormer model batching |
| `num_threads` | 2 | MEDIUM | CPU parallel threads |

#### Preset Profiles

##### Balanced 16GB (Default)

The current defaults are optimized for 16GB RAM systems. No configuration needed.

```bash
# These are the defaults - no need to set explicitly:
# DOCUMENT_INGESTION_EMBEDDING_BATCH_SIZE=5
# DOCUMENT_INGESTION_LAYOUT_BATCH_SIZE=2
# DOCUMENT_INGESTION_TABLE_BATCH_SIZE=2
# DOCUMENT_INGESTION_NUM_THREADS=2
# DOCUMENT_INGESTION_PDF_IMAGES_SCALE=2.0
# DOCUMENT_INGESTION_SURYA_BATCH_SIZE=2
```

##### High Quality (16+ GB RAM / GPU)

Best for: Systems with 16+ GB RAM or GPU acceleration. Better formula recognition.

```bash
# Copy from .env.high-quality.example or set these:
DOCUMENT_INGESTION_PDF_IMAGES_SCALE=4.0
DOCUMENT_INGESTION_SURYA_UPSCALE_FACTOR=1.0
DOCUMENT_INGESTION_SURYA_BATCH_SIZE=4
DOCUMENT_INGESTION_EMBEDDING_BATCH_SIZE=25
DOCUMENT_INGESTION_LAYOUT_BATCH_SIZE=4
DOCUMENT_INGESTION_TABLE_BATCH_SIZE=4
DOCUMENT_INGESTION_ACCELERATOR_DEVICE=auto  # or mps for Apple Silicon
```

##### Minimal (Extreme - Last Resort)

For severely memory-constrained systems. Disables table extraction to save ~1GB.

```bash
DOCUMENT_INGESTION_MAX_PARALLEL_FILES=1
DOCUMENT_INGESTION_EMBEDDING_BATCH_SIZE=5
DOCUMENT_INGESTION_LAYOUT_BATCH_SIZE=1
DOCUMENT_INGESTION_DO_TABLE_STRUCTURE=false
DOCUMENT_INGESTION_ACCELERATOR_DEVICE=cpu
```

#### Docker Memory Allocation

If running in Docker Desktop, ensure adequate memory is allocated:
- **Conservative profile**: 6GB minimum
- **Moderate profile**: 10GB minimum
- **Default settings**: 16GB+ recommended

Docker Desktop → Settings → Resources → Memory

## Usage

### Running Locally

```bash
cd packages/document_ingestion_worker
poetry run python -m document_ingestion_worker
```

### Running with Docker

```bash
# Start Qdrant first
docker compose up -d qdrant

# Run the worker (CPU)
docker compose run --rm document-ingestion-worker

# Run the worker (GPU) - requires NVIDIA Docker runtime
docker compose -f docker-compose.yml -f docker-compose.gpu.yml run --rm document-ingestion-worker
```

### Running with GPU Acceleration

```bash
cd packages/document_ingestion_worker

# Run with GPU (auto-detect CUDA)
DOCUMENT_INGESTION_ACCELERATOR_DEVICE=cuda \
DOCUMENT_INGESTION_LAYOUT_BATCH_SIZE=64 \
poetry run python -m document_ingestion_worker

# Full GPU configuration example
DOCUMENT_INGESTION_ACCELERATOR_DEVICE=cuda \
DOCUMENT_INGESTION_LAYOUT_BATCH_SIZE=64 \
DOCUMENT_INGESTION_TABLE_STRUCTURE_MODE=accurate \
DOCUMENT_INGESTION_MODE=override \
poetry run python -m document_ingestion_worker
```

The pipeline will log the detected accelerator device:
```
INFO - Accelerator device: 'cuda:0'
```

### Resume from Checkpoint

```bash
# Resume from parsed documents (skip PDF parsing)
DOCUMENT_INGESTION_START_FROM=parsed poetry run python -m document_ingestion_worker

# Resume from ready chunks (skip parsing and chunking)
DOCUMENT_INGESTION_START_FROM=chunked poetry run python -m document_ingestion_worker
```

### Pipeline Modes

#### Override Mode (Default)

Clears collection before processing. Use for full reindex.

```bash
DOCUMENT_INGESTION_MODE=override
```

#### Append Mode

Adds new documents to existing collection. Running twice creates duplicates.

```bash
DOCUMENT_INGESTION_MODE=append
```

### Start From Options

| Value | Description | Use Case |
|-------|-------------|----------|
| `beginning` | Full pipeline | Fresh processing |
| `parsed` | Skip PDF parsing | Re-chunk with different settings |
| `chunked` | Skip parsing + chunking | Re-embed with different model |

### OCR Support

Only **Tesseract CLI** is supported. Other OCR engines (EasyOCR, RapidOCR, OcrMac) have been removed to simplify dependencies and reduce Docker build times.

**Important:** For digital PDFs (non-scanned), OCR is disabled by default because:
- Text is already embedded as vectors in digital PDFs
- Tables are extracted by the TableFormer ML model, not OCR
- Formulas are extracted by the formula enrichment model, not OCR

**Enable OCR only for scanned PDFs:**
```bash
DOCUMENT_INGESTION_DO_OCR=true
DOCUMENT_INGESTION_FORCE_FULL_PAGE_OCR=true  # For fully scanned docs
```

#### Installing Tesseract

```bash
# Windows
choco install tesseract

# Ubuntu/Debian
apt-get install tesseract-ocr tesseract-ocr-eng

# macOS
brew install tesseract
```

## API Reference

### Programmatic Usage

```python
import asyncio
from document_ingestion_worker import ParallelDocumentIngestionPipeline
from document_ingestion_worker.config import DocumentIngestionSettings

async def main():
    # For digital PDFs (default - best accuracy for tables/formulas)
    config = DocumentIngestionSettings(
        data_dir="./data",
        qdrant_url="http://localhost:6333",
        # do_ocr=False,  # Default - digital PDFs don't need OCR
        # table_structure_mode="accurate",  # Default - best for complex tables
        # do_formula_enrichment=True,  # Default - extract LaTeX
    )

    # For scanned PDFs
    # config = DocumentIngestionSettings(
    #     data_dir="./data",
    #     qdrant_url="http://localhost:6333",
    #     do_ocr=True,
    #     force_full_page_ocr=True,
    #     ocr_lang=["eng"],
    # )

    pipeline = ParallelDocumentIngestionPipeline(config)

    try:
        results = await pipeline.run()
        print(f"Processed {results['total_documents']} documents")
        print(f"Generated {results['total_chunks_processed']} chunks")
        print(f"Indexed {results['total_vectors_upserted']} vectors")
    finally:
        await pipeline.close()

if __name__ == "__main__":
    asyncio.run(main())
```

### Output Statistics

The pipeline returns detailed statistics:

```python
{
    "batch_id": "abc123",
    "total_documents": 10,
    "successful_documents": 10,
    "failed_documents": 0,
    "total_chunks_processed": 150,
    "total_vectors_upserted": 150,
    "document_results": [...],
    "failed_files": [],
    "total_processing_time_seconds": 45.2
}
```

## Testing

Run tests from the repository root directory:

```bash
# Unit tests
pytest tests/document_ingestion_worker/unit/ -v

# Integration tests (requires Qdrant)
docker compose up -d qdrant
pytest tests/document_ingestion_worker/integration/ -v -m integration
```

### Development

#### Dependencies

- `vector_store` - Qdrant connector and FastEmbed embeddings
- `langgraph` - Pipeline orchestration
- `docling` - PDF/DOCX parsing and conversion

**Note**: Document parsing logic (PDF parser, DOCX parser, hybrid chunker with contextualization) lives in the `document_parsing/` sub-module within this package.

## Docker

Three variants are available:

| Variant | Image Size | Requirements |
|---------|-----------|--------------|
| CPU | ~3.5 GB | None (default) |
| GPU | ~14 GB | NVIDIA Docker runtime |
| Low-Memory | ~3.5 GB | 8-12 GB RAM systems (compose override) |

### CPU Version (Default)

```bash
# Build
docker compose build document-ingestion-worker

# Run
docker compose run --rm document-ingestion-worker
```

### GPU Version

Uses docker compose override file:

```bash
# Build GPU image
docker compose -f docker-compose.yml -f docker-compose.gpu.yml build document-ingestion-worker

# Run with GPU
docker compose -f docker-compose.yml -f docker-compose.gpu.yml run --rm document-ingestion-worker
```

**Tip:** Create an alias for GPU commands:
```bash
alias dc-gpu='docker compose -f docker-compose.yml -f docker-compose.gpu.yml'
dc-gpu build document-ingestion-worker
dc-gpu run --rm document-ingestion-worker
```

### Low-Memory Version (8-12 GB RAM)

Uses a docker-compose override file to reduce container memory limits and batch sizes:

```bash
# Run with low-memory settings
docker compose -f docker-compose.yml -f docker-compose.low-memory.yml run --rm document-ingestion-worker
```

**Tip:** Create an alias for low-memory commands:
```bash
alias dc-low='docker compose -f docker-compose.yml -f docker-compose.low-memory.yml'
dc-low run --rm document-ingestion-worker
```

> **Note:** GPU and low-memory overrides are mutually exclusive — do not combine them.

### Docker Build Architecture

The Dockerfile uses a multi-stage build with separate CPU and GPU builder stages. Two named volumes persist ML models across container runs: `huggingface_cache` (BGE-M3 embeddings, ~2.3 GB, shared) and `datalab_cache` (Surya OCR, ~1.4 GB, document-worker only).

```
builder-base (common setup)
    ├── builder-cpu (pip export + CPU torch)
    └── builder-gpu (poetry install + CUDA torch)
         ↓
    builder (selected via VARIANT arg)
         ↓
    runtime (final slim image)
```

#### Why pip export for CPU builds?

PyTorch has a complex dependency structure on PyPI:
- The default `torch` package on PyPI includes NVIDIA CUDA dependencies (~1.5GB)
- CPU-only wheels are available at `https://download.pytorch.org/whl/cpu`
- Poetry's dependency resolution uses PyPI metadata and doesn't support index-specific resolution

The CPU build uses a **pip export workaround**:

```dockerfile
# Export poetry dependencies to requirements.txt
RUN poetry export -f requirements.txt --without-hashes -o /tmp/requirements-full.txt && \
    # Filter out nvidia/triton packages (CUDA dependencies not needed for CPU)
    grep -v -E '^(nvidia-|triton)' /tmp/requirements-full.txt > /tmp/requirements.txt

# Install using pip with CPU torch index taking priority
RUN pip install --no-cache-dir \
    -r /tmp/requirements.txt \
    --index-url https://download.pytorch.org/whl/cpu \
    --extra-index-url https://pypi.org/simple
```

This approach:
1. Exports all Poetry dependencies to `requirements.txt`
2. Filters out `nvidia-*` and `triton` packages (CUDA dependencies)
3. Installs with pip using the CPU torch wheel index as primary source
4. Falls back to PyPI for non-torch packages

#### GPU Build

The GPU build is simpler - it pre-installs CUDA PyTorch before Poetry:

```dockerfile
# Pre-install CUDA torch
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128

# Poetry sees torch already installed, skips reinstalling
RUN poetry install --only main
```

#### Image Size Breakdown

| Component | CPU | GPU |
|-----------|-----|-----|
| Base Python | ~150 MB | ~150 MB |
| PyTorch | ~180 MB | ~2 GB |
| NVIDIA packages | - | ~800 MB |
| Docling + deps | ~1.5 GB | ~1.5 GB |
| Tesseract + libs | ~200 MB | ~200 MB |
| **Total** | **~3 GB** | **~4.5 GB** |

## Integration with MCP Server

Once documents are indexed, query them via the MCP server:

```text
# MCP server provides these tools:
- methodology_documents_search(query, filter, limit, offset)
- methodology_documents_get_index_status()
```

See `hedera_guardian_mcp_server/README.md` for details.

## Troubleshooting

### Out of Memory (OOM) with Large PDFs

**Issue**: Process crashes or system freezes when processing large PDFs

**Root Cause**: Document parsing (especially with Docling's ML models) can use significant memory per document. On Windows, there is no OOM killer, so runaway processes can freeze the system.

**Solutions**:
1. **Set memory limit (recommended for Windows)**:
   ```bash
   DOCUMENT_INGESTION_SUBPROCESS_MEMORY_LIMIT_GB=12  # On a 16GB system
   ```
   This kills the subprocess if RSS memory exceeds the limit.

2. **Reduce parallel processing**:
   ```bash
   DOCUMENT_INGESTION_MAX_PARALLEL_FILES=1
   ```

3. **Reduce batch sizes**:
   ```bash
   DOCUMENT_INGESTION_EMBEDDING_BATCH_SIZE=5
   DOCUMENT_INGESTION_LAYOUT_BATCH_SIZE=2
   DOCUMENT_INGESTION_TABLE_BATCH_SIZE=2
   ```

4. **Use Low Memory profile** (for 8GB systems):
   ```bash
   DOCUMENT_INGESTION_SUBPROCESS_MEMORY_LIMIT_GB=6
   DOCUMENT_INGESTION_EMBEDDING_BATCH_SIZE=5
   DOCUMENT_INGESTION_USE_SURYA_FORMULA_ENRICHMENT=false
   DOCUMENT_INGESTION_LAYOUT_BATCH_SIZE=1
   ```

5. **Process large PDFs individually** rather than batching multiple documents

### Slow First Run (Model Download)

**Issue**: First run takes significantly longer than subsequent runs

**Explanation**: This is expected behavior. The first run downloads ML models (Docling layout model ~500MB, TableFormer ~300MB, embedding model ~2.3 GB, optional Surya formula model ~1.4 GB) from their respective sources. Models are cached locally for future runs.

**Solutions**:
1. Be patient on first run (one-time download, may take 5-10 minutes depending on network speed)
2. In Docker, named volumes (`huggingface_cache`, `datalab_cache`) persist model caches across container runs — models only download once
3. Verify volumes exist: `docker volume ls | grep hedera-guardian-ai-toolkit`
4. Ensure stable internet connection for initial download

### GPU/CUDA Issues

#### GPU Not Detected / CUDA Not Available

**Issue**: Pipeline runs on CPU despite setting `DOCUMENT_INGESTION_ACCELERATOR_DEVICE=cuda`

**Diagnosis**:
```python
import torch
print(f"CUDA available: {torch.cuda.is_available()}")  # Should be True
print(f"CUDA version: {torch.version.cuda}")           # Should show version (e.g., 12.8)
print(f"GPU: {torch.cuda.get_device_name(0)}")         # Should show GPU name
```

**Solutions**:
1. **If `torch.cuda.is_available()` returns `False`**:
   - You have CPU-only PyTorch installed
   - Reinstall with CUDA support:
     ```bash
     pip install --force-reinstall torch torchvision --index-url https://download.pytorch.org/whl/cu128
     ```

2. **Check NVIDIA driver**:
   ```bash
   nvidia-smi  # Should show GPU info and driver version
   ```

3. **Verify CUDA toolkit** matches PyTorch requirements (usually 12.4 or 12.8)

4. **In Docker**: Ensure NVIDIA Container Toolkit is installed and `docker compose` uses GPU override file

#### GPU Out of Memory

**Issue**: `RuntimeError: CUDA out of memory`

**Solutions**:
1. **Reduce batch sizes** (most effective):
   ```bash
   DOCUMENT_INGESTION_LAYOUT_BATCH_SIZE=16  # Default 2 for CPU, 32-64 for GPU
   DOCUMENT_INGESTION_TABLE_BATCH_SIZE=2
   DOCUMENT_INGESTION_OCR_BATCH_SIZE=8
   DOCUMENT_INGESTION_SURYA_BATCH_SIZE=8
   ```

2. **Process fewer documents in parallel**:
   ```bash
   DOCUMENT_INGESTION_MAX_PARALLEL_FILES=1
   ```

3. **For very large PDFs**, fall back to CPU:
   ```bash
   DOCUMENT_INGESTION_ACCELERATOR_DEVICE=cpu
   ```

4. **Check GPU memory usage**:
   ```bash
   nvidia-smi  # Monitor memory usage during processing
   ```

### Tables Not Extracted Correctly

**Issue**: Tables are missing or have incorrect structure

**Solutions**:
1. Ensure `DOCUMENT_INGESTION_TABLE_STRUCTURE_MODE=accurate` (default)
2. Enable cell matching: `DOCUMENT_INGESTION_DO_CELL_MATCHING=true` (default)
3. For very complex tables, try disabling cell matching if cells are misaligned
4. Increase batch size if using GPU: `DOCUMENT_INGESTION_TABLE_BATCH_SIZE=4-8`

### Formulas Not Extracted

**Issue**: Mathematical formulas are not converted to LaTeX

**Solutions**:
1. Ensure `DOCUMENT_INGESTION_DO_FORMULA_ENRICHMENT=true` (default)
2. For better accuracy, use Surya: `DOCUMENT_INGESTION_USE_SURYA_FORMULA_ENRICHMENT=true` (default)
3. Check if PDF has formulas as images (may need higher `PDF_IMAGES_SCALE=4.0`)
4. Verify Surya models downloaded correctly

### OCR Not Working (Scanned PDFs Only)

**Issue**: Text not extracted from scanned PDFs

**Note**: Digital PDFs (with embedded text) do NOT need OCR. Only enable for scanned documents.

**Solutions**:
1. **Verify Tesseract is installed**:
   ```bash
   tesseract --version  # Should show version
   ```

2. **Enable OCR explicitly**:
   ```bash
   DOCUMENT_INGESTION_DO_OCR=true
   DOCUMENT_INGESTION_FORCE_FULL_PAGE_OCR=true
   ```

3. **Check `TESSDATA_PREFIX`** environment variable (should point to Tesseract data directory)

4. **Set custom Tesseract path** if needed:
   ```bash
   DOCUMENT_INGESTION_TESSERACT_CMD=/usr/local/bin/tesseract
   ```

### Pipeline Stuck or Slow

**Issue**: Pipeline appears frozen or processes very slowly

**Solutions**:
1. **Enable debug logging**:
   ```bash
   DOCUMENT_INGESTION_LOG_LEVEL=DEBUG
   ```

2. **Check staged files** for partial results:
   ```text
   data/staged/documents/<doc_name>/parsed/
   data/staged/documents/<doc_name>/chunks_prepared/
   ```

3. **Resume from checkpoint** to skip expensive operations:
   ```bash
   DOCUMENT_INGESTION_START_FROM=parsed   # Skip PDF parsing
   DOCUMENT_INGESTION_START_FROM=chunked  # Skip parsing + chunking
   ```

4. **Check for very large files** (>100 pages) - these take longer

5. **Monitor system resources**: CPU, memory, disk I/O

### Connection Refused to Qdrant

**Issue**: `ConnectionError: Connection refused to http://localhost:6333`

**Solutions**:
1. **Ensure Qdrant is running**:
   ```bash
   docker compose -f ../../docker-compose.yml up -d qdrant
   ```

2. **Check Qdrant status**:
   ```bash
   curl http://localhost:6333/
   # Should return: {"title":"qdrant - vector search engine","version":"..."}
   ```

3. **Verify URL** in configuration:
   ```bash
   DOCUMENT_INGESTION_QDRANT_URL=http://localhost:6333
   ```

4. **Check firewall/network settings**

5. **In Docker**: Ensure service name is correct (`qdrant` not `localhost`)

## Contributing

For development guidelines and contribution instructions, see [CONTRIBUTING.md](../../docs/CONTRIBUTING.md).

## License

MIT License - see [LICENSE](../../LICENSE) for details.

**Note:** This package uses AGPL-3.0 licensed dependencies (Docling). Network service deployments require source code availability.
