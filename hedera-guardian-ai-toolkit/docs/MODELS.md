# ML/AI Models Inventory

> **Audience:** Developers, operators, contributors

This document catalogs every ML model and inference engine used in `hedera-guardian-ai-toolkit`. It describes what each model does, which packages use it, how to configure it, and its resource footprint.

---

## Overview

The toolkit uses **12 models/engines** across **4 packages**, organized into **6 categories**:

| Category | Models | Primary Package(s) |
|----------|--------|---------------------|
| Embedding | BGE-M3 ONNX, FastEmbed | vector_store (all packages) |
| Layout Analysis | Heron, Heron-101, Egret M/L/X | document_ingestion_worker |
| Table Extraction | TableFormer (accurate/fast) | document_ingestion_worker |
| Formula Recognition | Surya RecognitionPredictor, Docling built-in | document_ingestion_worker |
| OCR | Tesseract CLI | document_ingestion_worker |
| Chunking/Tokenization | BAAI/bge-m3 tokenizer (HybridChunker) | document_ingestion_worker |

### Quick Reference Matrix

| Model | vector_store | schema_ingestion | document_ingestion | mcp_server |
|-------|:---:|:---:|:---:|:---:|
| BGE-M3 ONNX | x | x | x | x |
| FastEmbed (alt.) | x | x | x | x |
| Heron / Heron-101 | | | x | |
| Egret M/L/X | | | x | |
| TableFormer | | | x | |
| Surya RecognitionPredictor | | | x | |
| Docling formula model | | | x | |
| Tesseract CLI | | | x | |
| BAAI/bge-m3 tokenizer | | | x | |

---

## 1. Embedding Models

### BGE-M3 ONNX (Primary)

| Property | Value |
|----------|-------|
| Model ID | `aapot/bge-m3-onnx` |
| Tokenizer | `BAAI/bge-m3` (HuggingFace AutoTokenizer) |
| Type | Multi-vector: dense (1024-dim) + sparse (token weights) |
| Runtime | ONNX Runtime |
| Search | Hybrid search — dense vectors for semantic similarity, sparse vectors for keyword matching |

BGE-M3 ONNX is the default and only production embedding model. It powers semantic search across all four packages.

**Configuration by package:**

| Env Var | Default | Package(s) |
|---------|---------|------------|
| `SCHEMA_INGESTION_EMBEDDING_PROVIDER_TYPE` | `bge_m3_onnx` | schema_ingestion_worker |
| `SCHEMA_INGESTION_EMBEDDING_MODEL_NAME` | `aapot/bge-m3-onnx` | schema_ingestion_worker |
| `SCHEMA_INGESTION_EMBEDDING_BATCH_SIZE` | `256` (1..1000) | schema_ingestion_worker |
| `SCHEMA_INGESTION_ONNX_INFERENCE_BATCH_SIZE` | `32` (1..500) | schema_ingestion_worker |
| `DOCUMENT_INGESTION_EMBEDDING_PROVIDER_TYPE` | `bge_m3_onnx` | document_ingestion_worker |
| `DOCUMENT_INGESTION_EMBEDDING_MODEL_NAME` | `aapot/bge-m3-onnx` | document_ingestion_worker |
| `DOCUMENT_INGESTION_EMBEDDING_BATCH_SIZE` | `5` (1..1000) | document_ingestion_worker |
| `DOCUMENT_INGESTION_EMBEDDING_VECTOR_SIZE` | `1024` (1..8192) | document_ingestion_worker |
| `EMBEDDING_PROVIDER` | `bge_m3_onnx` | mcp_server |
| `EMBEDDING_MODEL` | `aapot/bge-m3-onnx` | mcp_server |

**GPU acceleration:** In Docker GPU builds (`VARIANT=gpu`), ONNX Runtime auto-detects `CUDAExecutionProvider` and uses GPU for embedding inference. No configuration needed — detection is automatic based on installed runtime. See [DOCKER.md](DOCKER.md) for GPU build commands. Outside Docker, install `onnxruntime-gpu` and ensure a compatible CUDA 12+ runtime is available for `CUDAExecutionProvider` to be detected.

**Source:** `packages/vector_store/src/vector_store/embeddings/bge_m3_onnx.py`

### FastEmbed (Alternative)

| Property | Value |
|----------|-------|
| Library | `fastembed ^0.7.3` (via `qdrant-client[fastembed]`) |
| Type | Dense-only embeddings |
| Switching | Set `*_EMBEDDING_PROVIDER` / `*_EMBEDDING_PROVIDER_TYPE` to `fastembed` |

FastEmbed provides a simpler dense-only alternative. When selected, hybrid search (dense + sparse) is unavailable.

**Source:** `packages/vector_store/src/vector_store/embeddings/fastembed.py`

---

## 2. Document Layout Analysis

Layout analysis detects document structure (headings, paragraphs, tables, figures, formulas) from PDF page images. Two model families are available:

| Model | Architecture | mAP | Params | Notes |
|-------|-------------|------|--------|-------|
| `heron` | DS-DETR | 77.6% | 42.9M | Balanced performance |
| `heron-101` | DS-DETR | 78.0% | 76.7M | Best accuracy (default) |
| `egret-m` | DFINE | — | — | Medium |
| `egret-l` | DFINE | — | — | Large |
| `egret-x` | DFINE | — | — | Extra-large |

**Configuration:**

| Env Var | Default | Range |
|---------|---------|-------|
| `DOCUMENT_INGESTION_LAYOUT_MODEL` | `heron-101` | `heron`, `heron-101`, `egret-m`, `egret-l`, `egret-x` |
| `DOCUMENT_INGESTION_LAYOUT_BATCH_SIZE` | `2` (1..256) | CPU: 2, GPU: 32 |

**Source:** `packages/document_ingestion_worker/src/document_ingestion_worker/config.py`, `packages/document_ingestion_worker/src/document_ingestion_worker/document_parsing/pdf_to_docling_parser.py`

---

## 3. Table Structure Extraction

TableFormer extracts table structure (rows, columns, merged cells) from detected table regions.

| Property | Value |
|----------|-------|
| Model | TableFormer |
| Modes | `accurate` (default) — handles merged cells; `fast` — simpler tables |
| Cell Matching | Enabled by default — maps predicted structure to PDF cell content |

**Configuration:**

| Env Var | Default | Range |
|---------|---------|-------|
| `DOCUMENT_INGESTION_DO_TABLE_STRUCTURE` | `true` | `true`, `false` |
| `DOCUMENT_INGESTION_TABLE_STRUCTURE_MODE` | `accurate` | `accurate`, `fast` |
| `DOCUMENT_INGESTION_DO_CELL_MATCHING` | `true` | `true`, `false` |
| `DOCUMENT_INGESTION_TABLE_BATCH_SIZE` | `2` (1..64) | CPU: 2, GPU: 4 |

**Source:** `packages/document_ingestion_worker/src/document_ingestion_worker/config.py`

---

## 4. Formula Recognition

### Surya RecognitionPredictor (Primary, Optional)

| Property | Value |
|----------|-------|
| Package | `surya-ocr ^0.17` (optional extra) |
| Components | `FoundationPredictor` + `RecognitionPredictor` with `block_without_boxes` task |
| Output | LaTeX wrapped in `$...$` delimiters |
| GPU | Supported (CUDA); OOM recovery with automatic batch halving |

Surya provides higher-quality formula recognition than Docling's built-in model, especially for complex equations with subscripts and superscripts. It is an optional dependency installed via `poetry install --extras surya`.

**Configuration:**

| Env Var | Default | Range |
|---------|---------|-------|
| `DOCUMENT_INGESTION_USE_SURYA_FORMULA_ENRICHMENT` | `true` | `true`, `false` |
| `DOCUMENT_INGESTION_SURYA_BATCH_SIZE` | `2` (1..64) | CPU: 2, GPU: 16 |
| `DOCUMENT_INGESTION_SURYA_UPSCALE_FACTOR` | `1.5` (1.0..4.0) | CPU: 1.5, GPU: 1.0 |
| `DOCUMENT_INGESTION_SURYA_EXPANSION_FACTOR_HORIZONTAL` | `0.15` (0.0..1.0) | |
| `DOCUMENT_INGESTION_SURYA_EXPANSION_FACTOR_VERTICAL` | `0.15` (0.0..1.0) | |

**Source:** `packages/document_ingestion_worker/src/document_ingestion_worker/document_parsing/surya_enrichment_model.py`, `packages/document_ingestion_worker/src/document_ingestion_worker/document_parsing/surya_formula_pipeline.py`

### Docling Built-in Formula (Fallback)

When Surya is disabled (`DOCUMENT_INGESTION_USE_SURYA_FORMULA_ENRICHMENT=false`) or not installed, Docling's built-in formula enrichment model is used instead. It is controlled by:

| Env Var | Default |
|---------|---------|
| `DOCUMENT_INGESTION_DO_FORMULA_ENRICHMENT` | `true` |

When Surya is enabled, the `SuryaFormulaPipelineOptions` class automatically sets `do_formula_enrichment=false` at the pipeline level to avoid duplicate processing. The user-facing `DOCUMENT_INGESTION_DO_FORMULA_ENRICHMENT` setting only takes effect when Surya is disabled.

---

## 5. OCR

| Property | Value |
|----------|-------|
| Engine | Tesseract CLI |
| Default State | **Disabled** (`do_ocr=false`) |
| Use Case | Scanned PDFs only — digital PDFs have embedded text |

**Configuration:**

| Env Var | Default | Notes |
|---------|---------|-------|
| `DOCUMENT_INGESTION_DO_OCR` | `false` | Enable only for scanned documents |
| `DOCUMENT_INGESTION_OCR_LANG` | `["eng"]` | ISO 639-3 language codes |
| `DOCUMENT_INGESTION_TESSERACT_CMD` | `None` (system PATH) | Path to Tesseract executable |
| `DOCUMENT_INGESTION_FORCE_FULL_PAGE_OCR` | `false` | Force OCR even if text detected |
| `DOCUMENT_INGESTION_OCR_BATCH_SIZE` | `2` (1..256) | CPU: 2, GPU: 32 |

**Source:** `packages/document_ingestion_worker/src/document_ingestion_worker/config.py`

---

## 6. PDF Parsing Backends

| Backend | Default | Speed | OCR Support | Notes |
|---------|---------|-------|-------------|-------|
| `dlparse_v2` | Yes | ~10x faster (C++ parser) | No | Recommended for digital PDFs |
| `dlparse_v1` | No | Slower | Yes | Required for scanned documents |

**Configuration:**

| Env Var | Default | Range |
|---------|---------|-------|
| `DOCUMENT_INGESTION_PDF_BACKEND` | `dlparse_v2` | `dlparse_v1`, `dlparse_v2` |
| `DOCUMENT_INGESTION_PDF_IMAGES_SCALE` | `2.0` (0.5..4.0) | CPU: 2.0, GPU/HQ: 4.0 |

---

## 7. Chunking and Tokenization

| Property | Value |
|----------|-------|
| Chunker | Docling `HybridChunker` |
| Tokenizer | `BAAI/bge-m3` via HuggingFace `AutoTokenizer` |
| Strategy | Hierarchical, structure-aware splitting |

The chunker uses the same BGE-M3 tokenizer as the embedding model to ensure token counts align with model limits.

**Configuration:**

| Env Var | Default | Range |
|---------|---------|-------|
| `DOCUMENT_INGESTION_CHUNK_MAX_TOKENS` | `5000` (64..8192) | |
| `DOCUMENT_INGESTION_CHUNK_OVERLAP_TOKENS` | `0` (0..512) | |
| `DOCUMENT_INGESTION_ISOLATE_TABLE_CHUNKS` | `true` | `true`, `false` |
| `DOCUMENT_INGESTION_ENABLE_SUBSCRIPT_HANDLING` | `false` | `true`, `false` |

**Source:** `packages/document_ingestion_worker/src/document_ingestion_worker/document_parsing/docling_chunker.py`

---

## 8. Resource Requirements

| Model / Engine | Approx. Download Size | Approx. RAM at Runtime |
|----------------|----------------------|------------------------|
| BGE-M3 ONNX (`aapot/bge-m3-onnx`) | ~2.3 GB | ~1-2 GB |
| Surya (FoundationPredictor + RecognitionPredictor) | ~1.4 GB | ~700 MB - 1 GB (CPU), ~1-2 GB (GPU) |
| Docling layout model (Heron-101) | Bundled with Docling | ~200-500 MB |
| TableFormer | Bundled with Docling | ~100-300 MB |
| BAAI/bge-m3 tokenizer | ~few MB | negligible |
| Tesseract CLI | System package | negligible |

All model loading is **lazy** — models are loaded on first use and can be explicitly released via `cleanup()` methods.

For Docker volume configuration, GPU setup, and memory profiles, see [DOCKER.md](DOCKER.md).

### Memory Profiles Summary

| Profile | Target | Key Settings |
|---------|--------|-------------|
| **Low Memory** (8 GB) | Memory-constrained systems | Batch sizes: 2, `pdf_images_scale=2.0`, Surya disabled, `subprocess_memory_limit_gb=6` |
| **Balanced** (16 GB, Default) | Standard CPU systems | Batch sizes: 2, `pdf_images_scale=2.0`, `surya_batch_size=2`, `surya_upscale_factor=1.5` |
| **High Quality** (16+ GB) | High-accuracy on CPU | `layout_batch_size=4`, `surya_batch_size=4`, `table_batch_size=4`, `pdf_images_scale=4.0`, `surya_upscale_factor=1.0`, `embedding_batch_size=25`, `num_threads=4` |

---

## 9. Additional Configuration

These environment variables control processing behavior but are not model-specific:

| Env Var | Default | Description |
|---------|---------|-------------|
| `DOCUMENT_INGESTION_VECTOR_UPSERT_BATCH_SIZE` | `20` (1..1000) | Batch size for vector upsert operations |
| `DOCUMENT_INGESTION_MAX_PARALLEL_FILES` | `1` (1..50) | Maximum parallel file processing |
| `DOCUMENT_INGESTION_SUBPROCESS_MEMORY_LIMIT_GB` | `None` (1.0..128.0) | Per-subprocess memory limit; `None` disables |
| `DOCUMENT_INGESTION_ACCELERATOR_DEVICE` | `auto` | Hardware device: `auto`, `cuda`, `mps`, `cpu` |
| `DOCUMENT_INGESTION_NUM_THREADS` | `2` (1..32) | CPU threads for processing |

---

## 10. Dependencies Summary

| Package | Model-Related Dependencies |
|---------|---------------------------|
| vector_store | `onnxruntime ^1.20.0`, `transformers ^4.37.0`, `fastembed ^0.7.3`, `huggingface-hub >=0.20.0` |
| schema_ingestion_worker | `vector-store` (path dependency) |
| document_ingestion_worker | `docling ^2.68.0`, `docling-core ^2.58.0`, `docling-hierarchical-pdf ~0.1.0`, `transformers ^4.30.0`, `surya-ocr ^0.17` (optional) |
| hedera_guardian_mcp_server | `vector-store` (path dependency) |

> **Note:** `docling-hierarchical-pdf ~0.1.0` pulls in `scikit-learn >=1.6.0` as a transitive dependency for ML-based header hierarchy inference.

---

## Key Observations

- **No LLMs.** All models are specialized ML models (embedding, layout, table extraction, formula recognition).
- **BGE-M3 ONNX is the single embedding model everywhere.** All four packages use the same `aapot/bge-m3-onnx` model, ensuring consistent vector representations.
- **`document_ingestion_worker` is model-heaviest.** It loads 5+ models for a full PDF processing run (layout, table, formula, embedding, tokenizer).
- **All model loading is lazy.** Models are loaded on first use and released via `cleanup()` methods, enabling subprocess isolation for memory safety.
- **Surya is the only optional dependency.** All other ML models are bundled with their packages. Install Surya with `poetry install --extras surya`.

---

## See Also

- [QUICKSTART.md](QUICKSTART.md) — Quick setup and first search
- [DOCKER.md](DOCKER.md) — Docker model caching, GPU setup, memory profiles
- [CONTRIBUTING.md](CONTRIBUTING.md) — Developer guide
- [Root README](../README.md) — Project overview and package index
