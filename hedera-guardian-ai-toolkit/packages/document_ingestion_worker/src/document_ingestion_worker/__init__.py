"""Document ingestion worker package.

This package provides a parallel LangGraph-based pipeline for processing PDF
and DOCX documents and storing them in a Qdrant vector database.
"""

from .config import DocumentIngestionSettings
from .models import (
    PipelineResults,
    SingleDocumentResult,
)
from .parallel_pipeline import ParallelDocumentIngestionPipeline
from .parser import DocumentParser

# SingleDocumentPipeline is NOT re-exported here — it lives in
# single_document_pipeline.py and is imported directly by subprocess_worker.py.
# Eagerly importing it would load all heavy ML deps (docling, langgraph, surya)
# into the parent process, negating the memory savings of subprocess isolation.

# Alias for backward compatibility
DocumentIngestionPipeline = ParallelDocumentIngestionPipeline

__all__ = [
    # Main entry points
    "DocumentParser",
    "DocumentIngestionSettings",
    # Parallel pipeline
    "ParallelDocumentIngestionPipeline",
    "DocumentIngestionPipeline",
    # Models
    "SingleDocumentResult",
    "PipelineResults",
]
