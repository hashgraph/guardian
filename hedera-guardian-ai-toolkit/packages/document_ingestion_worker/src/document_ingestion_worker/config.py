"""Configuration for document ingestion pipeline."""

import logging
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class DocumentIngestionSettings(BaseSettings):
    """Settings for document ingestion pipeline."""

    model_config = SettingsConfigDict(
        env_prefix="DOCUMENT_INGESTION_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        env_ignore_empty=True,
    )

    # Qdrant Configuration
    qdrant_url: str = Field(
        default="http://localhost:6333",
        description="Qdrant server URL",
    )
    qdrant_collection_name: str = Field(
        default="methodology_documents",
        description="Qdrant collection name for document chunks",
    )
    qdrant_api_key: str | None = Field(
        default=None,
        description="Qdrant API key for authentication (optional)",
    )

    # Embedding Configuration
    embedding_provider_type: str = Field(
        default="bge_m3_onnx",
        description="Type of embedding provider to use (bge_m3_onnx, fastembed)",
    )
    embedding_model_name: str = Field(
        default="aapot/bge-m3-onnx",
        description="Embedding model name (used for both chunking tokenizer and embeddings)",
    )
    embedding_batch_size: int = Field(
        default=5,
        ge=1,
        le=1000,
        description="Batch size for embedding operations. Default 5 for 16GB environments. "
        "Increase to 10+ for higher memory systems.",
    )
    embedding_vector_size: int = Field(
        default=1024,
        ge=1,
        le=8192,
        description="Dimensionality of embedding vectors. Must match the model output. "
        "Default 1024 for BGE-M3. Used to create Qdrant collection without loading the model.",
    )

    # Vector Store Configuration
    vector_upsert_batch_size: int = Field(
        default=20,
        ge=1,
        le=1000,
        description="Batch size for vector upsert operations (low memory default)",
    )

    # Ingestion Mode Configuration
    mode: Literal["append", "override"] = Field(
        default="override",
        description="Data handling strategy: 'override' (default) to replace all data on each run, 'append' for incremental ingestion",
    )

    # Path Configuration
    data_dir: Path = Field(
        default=Path("data"),
        description="Base data directory. All paths are derived as subdirectories: "
        "input/documents, staged/documents, output/documents",
    )

    @property
    def input_documents_dir(self) -> Path:
        """Directory for input PDF documents."""
        return self.data_dir / "input" / "documents"

    @property
    def staged_documents_dir(self) -> Path:
        """Directory for staged intermediate files (per-document subfolders)."""
        return self.data_dir / "staged" / "documents"

    # Processing Configuration
    max_parallel_files: int = Field(
        default=1,
        ge=1,
        le=50,
        description="Maximum number of PDF files to process in parallel (sequential default for low memory)",
    )

    # ====================
    # Subprocess Isolation (always enabled — each document runs in a separate process)
    # ====================
    subprocess_timeout_seconds: int = Field(
        default=7200,  # 2 hours - large methodology documents (100-200+ pages) need this
        ge=60,
        le=14400,  # Max 4 hours for extreme cases
        description="Maximum time (seconds) for subprocess to process a single document. "
        "Default handles 200+ page documents on CPU. Reduce to 1800 for smaller batches.",
    )
    subprocess_memory_limit_gb: float | None = Field(
        default=None,
        ge=1.0,
        le=128.0,
        description="Maximum RSS memory (GB) for a subprocess before it is killed. "
        "None disables the limit (relies on OS OOM killer). "
        "Recommended: set to ~80%% of available RAM on Windows (no OOM killer). "
        "Enforced via psutil (bundled dependency).",
    )

    # ===================
    # PDF Parser Options
    # ===================
    pdf_backend: Literal["dlparse_v1", "dlparse_v2"] = Field(
        default="dlparse_v2",
        description=(
            "PDF parsing backend: 'dlparse_v2' (default, faster C++ parser, "
            "~10x speedup, no OCR) or 'dlparse_v1' (slower, supports OCR)"
        ),
    )
    pdf_images_scale: float = Field(
        default=2.0,
        ge=0.5,
        le=4.0,
        description="Docling page rendering scale. Default 2.0 for 16GB environments. "
        "Set to 4.0 for High Quality profile (16+ GB, better formula recognition).",
    )
    do_ocr: bool = Field(
        default=False,
        description="Enable OCR for PDF processing. "
        "Set to True only for scanned PDFs. Digital PDFs don't need OCR - "
        "text is already embedded. Tables and formulas are extracted by ML models, not OCR.",
    )
    # Note: Only Tesseract CLI is supported. EasyOCR, RapidOCR, OcrMac removed to reduce dependencies.
    ocr_lang: list[str] = Field(
        default=["eng"],
        description="OCR language(s) for Tesseract. Use ISO 639-3 codes: ['eng', 'deu', 'fra']",
    )
    tesseract_cmd: str | None = Field(
        default=None,
        description="Path to Tesseract executable. "
        "If not specified, uses system PATH. "
        "Example: 'C:/Program Files/Tesseract-OCR/tesseract.exe'",
    )
    force_full_page_ocr: bool = Field(
        default=False,
        description="Force OCR on full page even if text is detected. "
        "Only applies when do_ocr=True.",
    )
    do_table_structure: bool = Field(
        default=True,
        description="Enable table structure extraction from PDFs using TableFormer model",
    )
    table_structure_mode: Literal["fast", "accurate"] = Field(
        default="accurate",
        description="Table structure mode: 'accurate' for complex tables with merged cells, "
        "'fast' for simple tables. Recommend 'accurate' for mission-critical data.",
    )
    do_cell_matching: bool = Field(
        default=True,
        description="Enable cell matching for table extraction (requires do_table_structure=True). "
        "Maps predicted structure to PDF cell content for better accuracy.",
    )
    do_formula_enrichment: bool = Field(
        default=True,
        description="Enable formula/equation enrichment in PDFs. Extracts equations as LaTeX.",
    )
    use_surya_formula_enrichment: bool = Field(
        default=True,
        description="Use Surya's RecognitionPredictor for formula enrichment instead of Docling's "
        "built-in model. Requires surya-ocr package. When enabled, do_formula_enrichment "
        "is automatically disabled to avoid duplicate processing.",
    )
    surya_batch_size: int = Field(
        default=2,
        ge=1,
        le=64,
        description="Batch size for Surya formula processing. Default 2 for 16GB CPU (compensates for upscaling). "
        "Increase to 8-16 for GPU or higher memory. Only used when use_surya_formula_enrichment=True.",
    )
    surya_upscale_factor: float = Field(
        default=1.5,
        ge=1.0,
        le=4.0,
        description="Upscale factor for formula images before Surya inference. "
        "Default 1.5 improves subscript/superscript recognition. For High Quality profile "
        "with pdf_images_scale=4.0, set to 1.0 (not needed at high resolution). "
        "Only used when use_surya_formula_enrichment=True.",
    )
    surya_expansion_factor_horizontal: float = Field(
        default=0.15,
        ge=0.0,
        le=1.0,
        description="Horizontal expansion factor for formula bounding boxes. Expands by this "
        "proportion on each side (e.g., 0.2 = 20% left + 20% right). Helps capture "
        "symbols at formula edges. Only used when use_surya_formula_enrichment=True.",
    )
    surya_expansion_factor_vertical: float = Field(
        default=0.15,
        ge=0.0,
        le=1.0,
        description="Vertical expansion factor for formula bounding boxes. Expands by this "
        "proportion on top and bottom (e.g., 0.2 = 20% top + 20% bottom). Helps capture "
        "symbols at formula edges. Only used when use_surya_formula_enrichment=True.",
    )

    # ===================
    # Accelerator Options
    # ===================
    accelerator_device: Literal["auto", "cuda", "mps", "cpu"] = Field(
        default="auto",
        description="Hardware device for ML models: 'auto' (detect best), 'cuda' (NVIDIA GPU), "
        "'mps' (Apple Silicon), 'cpu' (CPU only)",
    )
    num_threads: int = Field(
        default=2,
        ge=1,
        le=32,
        description="Number of CPU threads for processing (used alongside GPU for non-GPU ops)",
    )

    # ===================
    # Batch Processing Options
    # ===================
    ocr_batch_size: int | None = Field(
        default=2,
        ge=1,
        le=256,
        description="Batch size for OCR operations. Default 2 for 16GB CPU. "
        "Set to 8-32 for GPU. Set to None for auto-detect.",
    )
    layout_batch_size: int | None = Field(
        default=2,
        ge=1,
        le=256,
        description="Batch size for layout analysis. Default 2 for 16GB CPU. "
        "Set to 8-32 for GPU. Set to None for auto-detect.",
    )
    layout_model: Literal["heron", "heron-101", "egret-m", "egret-l", "egret-x"] = Field(
        default="heron-101",
        description="Layout analysis model: 'heron' (77.6% mAP, 42.9M params), "
        "'heron-101' (default, best accuracy, 78% mAP, 76.7M params), 'egret-x/l/m' (DFINE models)",
    )
    table_batch_size: int = Field(
        default=2,
        ge=1,
        le=64,
        description="Batch size for table structure extraction. Default 2 for 16GB CPU. "
        "Increase to 4+ for higher memory systems.",
    )

    # ====================
    # PDF Postprocessing Options
    # ====================
    apply_hierarchy_postprocessing: bool = Field(
        default=True,
        description="Apply hierarchy postprocessing using PDF TOC/bookmarks. "
        "Corrects heading levels in parsed document. Requires docling-hierarchical-pdf.",
    )
    fix_orphaned_list_items: bool = Field(
        default=False,
        description="Fix list items misclassified as section_headers due to page boundaries. "
        "Detects and corrects orphaned list items that span pages.",
    )
    merge_split_tables: bool = Field(
        default=True,
        description="Detect and merge tables split across page boundaries. "
        "Handles Type 1 splits where both parts are recognized as TABLE objects.",
    )
    save_intermediate_parsing_results: bool = Field(
        default=True,
        description="Save parsing results at each processing stage for debugging. "
        "Creates files: _01_docling_raw.json, _02_after_hierarchy.json, _03_after_orphan_fix.json",
    )

    # ====================
    # Chunker Options
    # ====================
    isolate_table_chunks: bool = Field(
        default=True,
        description="Keep each table as a separate chunk, preventing HybridChunker "
        "from merging multiple tables that share the same heading.",
    )
    chunk_max_tokens: int = Field(
        default=5000,
        ge=64,
        le=8192,
        description="Maximum tokens per chunk",
    )
    chunk_overlap_tokens: int = Field(
        default=0,
        ge=0,
        le=512,
        description="Number of overlapping tokens between chunks",
    )
    enable_subscript_handling: bool = Field(
        default=False,
        description="Enable custom subscript/superscript handling for chemical formulas (CO2->CO₂). "
        "Uses custom ScriptAwareSerializerProvider. Set to True for documents with chemical formulas.",
    )

    # Logging Configuration
    log_level: str = Field(
        default="INFO",
        description="Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)",
    )
    # Pipeline Start Point Configuration
    start_from: Literal["beginning", "parsed", "chunked"] = Field(
        default="beginning",
        description="Pipeline start point: 'beginning' for full pipeline, "
        "'parsed' to skip PDF parsing (load from staged_documents_dir/<doc>/parsed), "
        "'chunked' to skip parsing and chunking (load from staged_documents_dir/<doc>/chunks)",
    )

    # Document Format Configuration
    supported_formats: list[str] = Field(
        default=["pdf", "docx"],
        description="List of supported document formats to process. "
        "Valid values: 'pdf', 'docx'. Files with other extensions will be skipped.",
    )

    def get_log_level(self) -> int:
        """Convert string log level to logging constant."""
        return getattr(logging, self.log_level.upper(), logging.INFO)

    def get_effective_batch_sizes(self) -> tuple[int, int, int]:
        """Get effective batch sizes based on device and overrides.

        Returns:
            Tuple of (ocr_batch_size, layout_batch_size, table_batch_size)
        """
        is_gpu = self.accelerator_device in ("cuda", "mps") or (self.accelerator_device == "auto")
        default_batch = 32 if is_gpu else 4

        return (
            self.ocr_batch_size or default_batch,
            self.layout_batch_size or default_batch,
            self.table_batch_size,
        )

    def get_supported_glob_patterns(self) -> list[str]:
        """Get glob patterns for supported document formats.

        Returns:
            List of glob patterns like ['*.pdf', '*.docx']
        """
        return [f"*.{fmt.lower()}" for fmt in self.supported_formats]

    def get_layout_model_spec(self):
        """Get the Docling layout model spec for the configured layout model.

        Returns:
            The appropriate DOCLING_LAYOUT_* constant from docling.datamodel.layout_model_specs

        Raises:
            ImportError: If docling.datamodel.layout_model_specs is not available
        """
        from docling.datamodel.layout_model_specs import (  # noqa: PLC0415
            DOCLING_LAYOUT_EGRET_LARGE,
            DOCLING_LAYOUT_EGRET_MEDIUM,
            DOCLING_LAYOUT_EGRET_XLARGE,
            DOCLING_LAYOUT_HERON,
            DOCLING_LAYOUT_HERON_101,
        )

        model_map = {
            "heron": DOCLING_LAYOUT_HERON,
            "heron-101": DOCLING_LAYOUT_HERON_101,
            "egret-x": DOCLING_LAYOUT_EGRET_XLARGE,
            "egret-l": DOCLING_LAYOUT_EGRET_LARGE,
            "egret-m": DOCLING_LAYOUT_EGRET_MEDIUM,
        }

        return model_map[self.layout_model]
