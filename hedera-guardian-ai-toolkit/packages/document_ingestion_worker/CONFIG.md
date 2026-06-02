# Document Ingestion Pipeline Configuration

This document describes all configuration options for the document ingestion pipeline.

## Environment Variable Prefix

All environment variables use the prefix `DOCUMENT_INGESTION_`.

## Configuration Loading

Configuration is loaded via Pydantic Settings with the following precedence (highest to lowest):
1. Environment variables (`DOCUMENT_INGESTION_*`)
2. `.env` file values
3. Default values in `DocumentIngestionSettings` class

## Resource Profiles

The default settings use the **Balanced 16GB** profile, optimized for systems with 16GB RAM.
For higher-memory systems or GPU acceleration, see [README.md](README.md) for profile recommendations.

| Profile | RAM | `embedding_batch_size` | `surya_batch_size` | `pdf_images_scale` | `surya_upscale_factor` | `subprocess_memory_limit_gb` |
|---------|-----|------------------------|--------------------|--------------------|------------------------|------------------------------|
| **Low Memory** | 8GB | 5 | - (Surya disabled) | 2.0 | - | `6` |
| **Balanced (Default)** | 16GB | 5 | 2 | 2.0 | 1.5 | `None` (disabled) |
| **High Quality** | 16+ GB / GPU | 25 | 4 | 4.0 | 1.0 | `None` (disabled) |

## Configuration Reference

### Qdrant (Vector Database)

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCUMENT_INGESTION_QDRANT_URL` | `http://localhost:6333` | Qdrant server URL |
| `DOCUMENT_INGESTION_QDRANT_COLLECTION_NAME` | `methodology_documents` | Collection name for document chunks |
| `DOCUMENT_INGESTION_QDRANT_API_KEY` | `None` | Optional API key for authentication |

### Embedding Configuration

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `DOCUMENT_INGESTION_EMBEDDING_PROVIDER_TYPE` | `bge_m3_onnx` | - | Embedding provider type (bge_m3_onnx, fastembed) |
| `DOCUMENT_INGESTION_EMBEDDING_MODEL_NAME` | `aapot/bge-m3-onnx` | - | Embedding model (used for chunking tokenizer and embeddings) |
| `DOCUMENT_INGESTION_EMBEDDING_BATCH_SIZE` | `5` | 1-1000 | Batch size for embedding operations. Default 5 for 16GB environments. Increase to 10+ for higher memory systems. |
| `DOCUMENT_INGESTION_EMBEDDING_VECTOR_SIZE` | `1024` | 1-8192 | Dimensionality of embedding vectors. Must match the model output. Default 1024 for BGE-M3. Used to create Qdrant collection without loading the model. |
| `DOCUMENT_INGESTION_VECTOR_UPSERT_BATCH_SIZE` | `20` | 1-1000 | Batch size for vector upsert operations |

### Path Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCUMENT_INGESTION_DATA_DIR` | `data` | Base data directory |

Paths are derived from `data_dir`:
- `input_documents_dir` = `{data_dir}/input/documents`
- `staged_documents_dir` = `{data_dir}/staged/documents`

### Processing Configuration

Each document is processed in a **separate subprocess**, guaranteeing OS-level memory reclaim and crash isolation after every document. This is the only processing mode (no in-process fallback).

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `DOCUMENT_INGESTION_MAX_PARALLEL_FILES` | `1` | 1-50 | Maximum documents to process in parallel (see memory note below) |
| `DOCUMENT_INGESTION_MODE` | `override` | `append`, `override` | `override` (default) = replace all, `append` = incremental |
| `DOCUMENT_INGESTION_START_FROM` | `beginning` | `beginning`, `parsed`, `chunked` | Pipeline start point for resuming |
| `DOCUMENT_INGESTION_SUBPROCESS_TIMEOUT_SECONDS` | `7200` | 60-14400 | Maximum time (seconds) for a subprocess to process one document. Default 2h handles 200+ page documents on CPU. |
| `DOCUMENT_INGESTION_SUBPROCESS_MEMORY_LIMIT_GB` | `None` | 1.0-128.0 | Maximum RSS memory (GB) per subprocess. `None` disables (relies on OS OOM killer). Recommended on Windows which lacks an OOM killer. Requires `psutil`. |

#### Memory Considerations for `MAX_PARALLEL_FILES`

**Thread-Safety Architecture:** Docling's `DocumentConverter` and `HybridChunker` are **not thread-safe**. When processing multiple documents in parallel, each document gets its own isolated parser and chunker instances to prevent internal state corruption.

**Memory Impact:** Each parallel document requires:
- PDF Parser (DocumentConverter): ~500MB - 2GB depending on enabled features
- DOCX Parser: ~100MB - 500MB
- DoclingChunker (HybridChunker): ~200MB - 500MB

**Recommended Settings:**
| System RAM | Recommended `MAX_PARALLEL_FILES` |
|------------|----------------------------------|
| 8 GB       | 1-2                              |
| 16 GB      | 2-3                              |
| 32 GB      | 3-5                              |
| 64+ GB     | 5-10                             |

**Note:** With GPU acceleration (`DOCUMENT_INGESTION_ACCELERATOR_DEVICE=cuda`), GPU VRAM becomes the limiting factor. Each concurrent parser may load ML models to GPU.

**Memory Monitoring:** When `psutil` is installed, the parent process monitors each subprocess's RSS memory
and logs peak usage on completion. Set `SUBPROCESS_MEMORY_LIMIT_GB` to automatically kill subprocesses
that exceed the threshold — especially important on Windows which lacks an OS-level OOM killer.

### PDF Backend Options

| Variable | Default | Options | Description |
|----------|---------|---------|-------------|
| `DOCUMENT_INGESTION_PDF_BACKEND` | `dlparse_v2` | `dlparse_v1`, `dlparse_v2` | PDF parsing backend. `dlparse_v2` is faster (~10x), no OCR support. `dlparse_v1` supports OCR for scanned documents. |
| `DOCUMENT_INGESTION_PDF_IMAGES_SCALE` | `2.0` | 0.5-4.0 | Docling page rendering scale. Default 2.0 for 16GB. Set to 4.0 for High Quality profile (16+ GB, better formula recognition). |

### PDF Parser Options (Docling)

| Variable | Default | Options | Description |
|----------|---------|---------|-------------|
| `DOCUMENT_INGESTION_DO_OCR` | `false` | bool | Enable OCR for scanned PDFs |
| `DOCUMENT_INGESTION_OCR_LANG` | `["eng"]` | list | Tesseract language codes (ISO 639-3) |
| `DOCUMENT_INGESTION_TESSERACT_CMD` | `None` | path | Path to Tesseract executable |
| `DOCUMENT_INGESTION_FORCE_FULL_PAGE_OCR` | `false` | bool | Force OCR even if text detected |
| `DOCUMENT_INGESTION_DO_TABLE_STRUCTURE` | `true` | bool | Enable table structure extraction |
| `DOCUMENT_INGESTION_TABLE_STRUCTURE_MODE` | `accurate` | `fast`, `accurate` | Table structure mode for complex tables |
| `DOCUMENT_INGESTION_DO_CELL_MATCHING` | `true` | bool | Enable cell matching for tables |
| `DOCUMENT_INGESTION_DO_FORMULA_ENRICHMENT` | `true` | bool | Enable formula/equation enrichment (Docling's built-in model) |

### Surya Formula Enrichment

Surya provides an alternative formula recognition engine with better accuracy for subscripts/superscripts. When enabled, Docling's built-in formula enrichment is automatically disabled.

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `DOCUMENT_INGESTION_USE_SURYA_FORMULA_ENRICHMENT` | `true` | bool | Use Surya instead of Docling's built-in formula model |
| `DOCUMENT_INGESTION_SURYA_BATCH_SIZE` | `2` | 1-64 | Batch size for Surya processing. Default 2 for 16GB CPU. Increase to 8-16 for GPU. |
| `DOCUMENT_INGESTION_SURYA_UPSCALE_FACTOR` | `1.5` | 1.0-4.0 | Pre-inference upscale. Default 1.5 improves subscript recognition. Set to 1.0 for High Quality with pdf_images_scale=4.0. |
| `DOCUMENT_INGESTION_SURYA_EXPANSION_FACTOR_HORIZONTAL` | `0.15` | 0.0-1.0 | Horizontal bounding box expansion (0.15 = 15% each side) |
| `DOCUMENT_INGESTION_SURYA_EXPANSION_FACTOR_VERTICAL` | `0.15` | 0.0-1.0 | Vertical bounding box expansion (0.15 = 15% top/bottom) |

### Layout Model Configuration

| Variable | Default | Options | Description |
|----------|---------|---------|-------------|
| `DOCUMENT_INGESTION_LAYOUT_MODEL` | `heron-101` | `heron`, `heron-101`, `egret-m`, `egret-l`, `egret-x` | Layout analysis model. `heron-101` has best accuracy (78% mAP, 76.7M params). `heron` is faster (77.6% mAP, 42.9M params). |

### Accelerator Options

| Variable | Default | Options | Description |
|----------|---------|---------|-------------|
| `DOCUMENT_INGESTION_ACCELERATOR_DEVICE` | `auto` | `auto`, `cuda`, `mps`, `cpu` | Hardware device for ML models |
| `DOCUMENT_INGESTION_NUM_THREADS` | `2` | 1-32 | CPU threads for parallel processing |

**Device options:**
- `auto` - Automatically detect best available device (CUDA > MPS > CPU)
- `cuda` - Force NVIDIA GPU (requires PyTorch with CUDA)
- `mps` - Apple Silicon GPU (macOS only)
- `cpu` - Force CPU processing

### Batch Processing Options

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `DOCUMENT_INGESTION_OCR_BATCH_SIZE` | `2` | int or `None` (auto-detect), 1-256 | Batch size for OCR. Default 2 for 16GB CPU. Set to 8-32 for GPU. `None` enables auto-detection. |
| `DOCUMENT_INGESTION_LAYOUT_BATCH_SIZE` | `2` | int or `None` (auto-detect), 1-256 | Batch size for layout analysis. Default 2 for 16GB CPU. Set to 8-32 for GPU. `None` enables auto-detection. |
| `DOCUMENT_INGESTION_TABLE_BATCH_SIZE` | `2` | 1-64 | Batch size for table structure. Default 2 for 16GB CPU. Increase to 4+ for higher memory. |

**Batch size recommendations:**
- GPU with 8GB+ VRAM: `layout_batch_size=32-64`, `ocr_batch_size=16-32`
- GPU with 4-8GB VRAM: `layout_batch_size=16-32`, `ocr_batch_size=8-16`
- CPU (16GB RAM): Use defaults (all batch sizes = 2)

### Postprocessing Options

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCUMENT_INGESTION_APPLY_HIERARCHY_POSTPROCESSING` | `true` | Apply hierarchy postprocessing using PDF TOC/bookmarks. Corrects heading levels. |
| `DOCUMENT_INGESTION_FIX_ORPHANED_LIST_ITEMS` | `false` | Fix list items misclassified as section_headers due to page boundaries. |
| `DOCUMENT_INGESTION_MERGE_SPLIT_TABLES` | `true` | Detect and merge tables split across page boundaries. |
| `DOCUMENT_INGESTION_ISOLATE_TABLE_CHUNKS` | `true` | Keep each table as a separate chunk, preventing HybridChunker from merging multiple tables under the same heading. |
| `DOCUMENT_INGESTION_SAVE_INTERMEDIATE_PARSING_RESULTS` | `true` | Save parsing results at each stage for debugging (_01_docling_raw.json, etc.) |

### Chunking Options

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `DOCUMENT_INGESTION_CHUNK_MAX_TOKENS` | `5000` | 64-8192 | Maximum tokens per chunk |
| `DOCUMENT_INGESTION_CHUNK_OVERLAP_TOKENS` | `0` | 0-512 | Overlapping tokens between chunks |

### Content Options

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCUMENT_INGESTION_ENABLE_SUBSCRIPT_HANDLING` | `false` | Enable custom subscript/superscript handling for chemical formulas (CO2→CO₂) |
| `DOCUMENT_INGESTION_SUPPORTED_FORMATS` | `["pdf", "docx"]` | List of supported document formats to process |

### Logging

| Variable | Default | Options | Description |
|----------|---------|---------|-------------|
| `DOCUMENT_INGESTION_LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` | Logging level |

## Docker Configuration

In `docker-compose.yml`, set `DOCUMENT_INGESTION_DATA_DIR=/data` with volume mount `./data:/data`.

Example:
```yaml
document-ingestion-worker:
  volumes:
    - ./data:/data
  environment:
    - DOCUMENT_INGESTION_DATA_DIR=/data
    - DOCUMENT_INGESTION_QDRANT_URL=http://qdrant:6333
    - DOCUMENT_INGESTION_MODE=override
```

> **Model Cache Volumes:** Docker uses named volumes (`huggingface_cache`, `datalab_cache`) to persist ML models across container runs. Without these volumes, models re-download on every run (+5-10 min startup). See [DOCKER.md](../../docs/DOCKER.md#model-caching) for details.

## Local Development (.env)

Example `.env` file for the default Balanced 16GB profile:
```bash
# Paths
DOCUMENT_INGESTION_DATA_DIR=./data

# Qdrant
DOCUMENT_INGESTION_QDRANT_URL=http://localhost:6333
DOCUMENT_INGESTION_QDRANT_COLLECTION_NAME=methodology_documents

# Embedding (defaults match Balanced 16GB profile)
DOCUMENT_INGESTION_EMBEDDING_MODEL_NAME=aapot/bge-m3-onnx
# DOCUMENT_INGESTION_EMBEDDING_BATCH_SIZE=5  # default

# Processing
DOCUMENT_INGESTION_MODE=override
# DOCUMENT_INGESTION_MAX_PARALLEL_FILES=1  # default
# DOCUMENT_INGESTION_SUBPROCESS_MEMORY_LIMIT_GB=  # disabled by default (None)

# PDF Backend
# DOCUMENT_INGESTION_PDF_BACKEND=dlparse_v2  # default
# DOCUMENT_INGESTION_PDF_IMAGES_SCALE=2.0    # default for 16GB

# Surya Formula Enrichment (enabled by default)
# DOCUMENT_INGESTION_USE_SURYA_FORMULA_ENRICHMENT=true  # default
# DOCUMENT_INGESTION_SURYA_BATCH_SIZE=2       # default for 16GB CPU
# DOCUMENT_INGESTION_SURYA_UPSCALE_FACTOR=1.5 # default, improves subscripts

# PDF Parser (only enable OCR for scanned PDFs)
# DOCUMENT_INGESTION_DO_OCR=true
# DOCUMENT_INGESTION_TESSERACT_CMD=C:/Program Files/Tesseract-OCR/tesseract.exe

# Chunking (defaults match current config)
# DOCUMENT_INGESTION_CHUNK_MAX_TOKENS=5000  # default
# DOCUMENT_INGESTION_CHUNK_OVERLAP_TOKENS=0  # default

# Logging
DOCUMENT_INGESTION_LOG_LEVEL=INFO
```

### High Quality Profile (.env)

For systems with 16+ GB RAM or GPU acceleration:
```bash
# Higher resolution for better formula recognition
DOCUMENT_INGESTION_PDF_IMAGES_SCALE=4.0

# Surya settings for high quality
DOCUMENT_INGESTION_SURYA_UPSCALE_FACTOR=1.0  # Not needed at high resolution
DOCUMENT_INGESTION_SURYA_BATCH_SIZE=8        # Increase for GPU

# Larger batches for faster processing
DOCUMENT_INGESTION_EMBEDDING_BATCH_SIZE=10
DOCUMENT_INGESTION_LAYOUT_BATCH_SIZE=8
DOCUMENT_INGESTION_TABLE_BATCH_SIZE=4

# GPU acceleration
DOCUMENT_INGESTION_ACCELERATOR_DEVICE=cuda
```

## Configuration Flow

```
Environment Variables (DOCUMENT_INGESTION_*)
    |
    v
.env file (optional fallback)
    |
    v
DocumentIngestionSettings (Pydantic)
    |
    v
Orchestrator (lightweight, no ML models):
  - QdrantConnector (url, collection_name, api_key — no embedding_provider)
  - Collection created with embedding_vector_size from config
    |
    v
Per-Document Subprocess (isolated per document):
  - EmbeddingProvider (BGE-M3-ONNX or FastEmbed)
  - PdfParser (with PdfPipelineOptions)
  - SuryaFormulaEnricher (if enabled)
  - DoclingChunker (model_id, max_tokens, overlap_tokens)
  - Memory monitored by parent (psutil RSS, optional kill limit)
```

## Related Configuration

### Document Parsing Constants

Hardcoded fallback defaults in `src/document_ingestion_worker/document_parsing/constants.py`:
```python
DEFAULT_EMBEDDING_MODEL = "BAAI/bge-m3"
DEFAULT_MAX_TOKENS = 5000
DEFAULT_OVERLAP_TOKENS = 0
```

> **Note:** These are project-level fallback defaults, not pipeline-level configuration. They are only used when `DoclingChunker` is instantiated without explicit parameters. The document ingestion pipeline always overrides these via `DocumentIngestionSettings` (default: `chunk_max_tokens=5000`, `chunk_overlap_tokens=0`, `embedding_model_name=aapot/bge-m3-onnx`). You should not need to modify these constants.

### vector_store Configuration

The `vector_store` package has its own configuration with prefix `VECTOR_STORE_*`. Document ingestion passes its own settings to `QdrantConnector`, overriding vector_store defaults.
