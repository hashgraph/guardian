"""Data models for the document ingestion pipeline."""

from pathlib import Path
from typing import Any, Literal, TypedDict

# Error types used for programmatic handling in SubprocessResponse
ErrorType = Literal["OOM", "Timeout", "Exception", "Crash", "IPC", "Security", "MemoryError"]

# =============================================================================
# Per-Document State Models (for parallel processing)
# =============================================================================


class SingleDocumentState(TypedDict, total=False):
    """
    LangGraph state object for processing a SINGLE document.

    Used by SingleDocumentPipeline to track the processing state of one document
    through the full pipeline (parse → chunk → embed → upsert).

    Attributes:
        document_id: Unique identifier (document stem without extension)
        pdf_path: Path to original document in input_documents_dir (named for backward
            compatibility, can be PDF or DOCX)
        staged_path: Path to document's staging folder in staged_documents_dir
        source_format: Document format ("pdf" or "docx") derived from file extension
        parsed_document: Tuple of (pdf_path, DoclingDocument) after parsing
        raw_chunks: Raw chunks with full metadata before embedding prep
        formula_ref_map: Mapping from formula self_ref to (number, latex) for bbox detection
        valid_declarations: Set of valid formula numbers for reference validation
        chunked_documents: Chunks prepared for embedding
        embedded_documents: Chunks with embeddings added
        processed_count: Number of vectors successfully upserted
        error: Error message if processing failed, None otherwise
        start_from: Pipeline start point for this document
    """

    document_id: str
    pdf_path: Path
    staged_path: Path
    source_format: str  # "pdf" or "docx"
    parsed_document: (
        tuple[Path, Any] | None
    )  # tuple[Path, DoclingDocument] - Any avoids importing docling in parent
    raw_chunks: list[dict[str, Any]]
    formula_ref_map: dict[str, tuple[str, str]]  # self_ref -> (formula_num, latex)
    valid_declarations: set[str]  # Valid formula numbers for reference validation
    chunked_documents: list[dict[str, Any]]
    embedded_documents: list[dict[str, Any]]
    processed_count: int
    error: str | None
    start_from: Literal["beginning", "parsed", "chunked"]


class SingleDocumentResult(TypedDict):
    """
    Result from processing a single document through the pipeline.

    Returned by SingleDocumentPipeline.run() and collected by the orchestrator.
    """

    document_id: str
    pdf_path: Path
    chunks_generated: int
    vectors_upserted: int
    status: Literal["success", "failed", "skipped"]
    error: str | None
    processing_time_seconds: float


class PipelineResults(TypedDict):
    """
    Aggregated results from all document pipelines.

    Returned by ParallelDocumentIngestionPipeline.run() after processing
    all documents in parallel.
    """

    batch_id: str
    total_documents: int
    successful_documents: int
    failed_documents: int
    total_chunks_processed: int
    total_vectors_upserted: int
    document_results: list[SingleDocumentResult]
    failed_files: list[tuple[Path, str]]
    total_processing_time_seconds: float


def create_single_document_state(
    pdf_path: Path,
    staged_path: Path,
    start_from: Literal["beginning", "parsed", "chunked"] = "beginning",
    source_format: str | None = None,
) -> SingleDocumentState:
    """
    Create initial state for a single document pipeline.

    Args:
        pdf_path: Path to the document file in input_documents_dir (can be PDF or DOCX)
        staged_path: Path to document's staging folder in staged_documents_dir
        start_from: Pipeline start point for this document
        source_format: Document format ("pdf" or "docx"). If None, derived from extension.

    Returns:
        A new SingleDocumentState with empty collections
    """
    # Derive source_format from extension if not provided
    if source_format is None:
        source_format = pdf_path.suffix.lower().lstrip(".")

    return SingleDocumentState(
        document_id=pdf_path.stem,
        pdf_path=pdf_path,
        staged_path=staged_path,
        source_format=source_format,
        parsed_document=None,
        raw_chunks=[],
        chunked_documents=[],
        embedded_documents=[],
        processed_count=0,
        error=None,
        start_from=start_from,
    )


# =============================================================================
# Subprocess IPC Protocol Models
# =============================================================================


class SubprocessRequest(TypedDict):
    """
    Request payload sent from the orchestrator to a subprocess worker.

    This TypedDict defines the JSON-serializable protocol for requesting
    document processing in an isolated subprocess. The orchestrator writes
    this data to a JSON file, and the subprocess receives the file path as
    a command-line argument. The subprocess performs the full document pipeline
    (parse, chunk, embed, upsert) in isolation to protect the main process
    from OOM crashes.

    Attributes:
        document_id: Unique identifier for the document (typically the file stem)
        document_path: Absolute path to the original document file (PDF or DOCX)
        staged_path: Absolute path to the document's staging directory for
            intermediate files (parsed/, chunks_raw/, etc.)
        source_format: Document format - either "pdf" or "docx"
        start_from: Pipeline start point - "beginning" for full processing,
            "parsed" to skip parsing, "chunked" to skip parsing and chunking
        config_json: JSON-serialized DocumentIngestionSettings from
            settings.model_dump_json(), containing all configuration for
            embedding, chunking, Qdrant connection, etc.
    """

    document_id: str
    document_path: str  # Absolute path
    staged_path: str  # Absolute path
    source_format: str  # "pdf" or "docx"
    start_from: str  # "beginning", "parsed", "chunked"
    config_json: str  # DocumentIngestionSettings.model_dump_json()


class _SubprocessResponseRequired(TypedDict):
    """Required fields for SubprocessResponse — always present."""

    status: Literal["success", "failed", "timeout"]
    document_id: str
    chunks_generated: int
    vectors_upserted: int


class SubprocessResponse(_SubprocessResponseRequired, total=False):
    """
    Response payload returned from a subprocess worker to the orchestrator.

    This TypedDict defines the JSON-serializable protocol for subprocess
    results. The subprocess writes this data to a response JSON file
    (atomic temp + replace) upon completion (success or failure).

    Required fields (status, document_id, chunks_generated, vectors_upserted)
    are always present. Optional fields may be absent in error scenarios where
    some metrics are not available.

    Attributes:
        status: Processing outcome - "success" if document was fully processed,
            "failed" if an error occurred, "timeout" if processing exceeded
            the allowed time limit
        document_id: Unique identifier echoed back from the request
        chunks_generated: Number of chunks created from the document
        vectors_upserted: Number of vectors successfully stored in Qdrant
        processing_time_seconds: Total wall-clock time for processing
        peak_memory_mb: Peak RSS memory usage of the subprocess in MB
            (0 if psutil is not available or monitoring failed)
        error_message: Human-readable error description (None on success)
        error_type: Categorized error type for programmatic handling:
            - "OOM": Out of memory error detected
            - "Timeout": Processing exceeded time limit
            - "Exception": Python exception during processing
            - "Crash": Subprocess terminated unexpectedly
            - "IPC": IPC protocol error
            - "Security": Security violation (e.g., path traversal)
            - "MemoryError": Python MemoryError during processing
    """

    processing_time_seconds: float
    peak_memory_mb: float  # Peak RSS memory usage of the subprocess in MB
    error_message: str | None
    error_type: ErrorType | None
