"""Parallel document ingestion pipeline orchestrator.

This module provides the ParallelDocumentIngestionPipeline class, the parent
orchestrator that discovers documents, manages collections, spawns per-document
subprocesses, and aggregates results.

Heavy ML dependencies (docling, langgraph, surya) are NOT imported here —
they live in single_document_pipeline.py and are loaded inside subprocesses,
keeping the parent process lightweight (~10MB vs ~600MB+).
"""

import asyncio
import logging
import time
from pathlib import Path
from typing import Any
from uuid import uuid4

from document_ingestion_worker.document_parsing.document_parser_factory import DocumentParserFactory
from vector_store import QdrantConnector
from vector_store.embeddings.types import EmbeddingProviderType

from .config import DocumentIngestionSettings
from .index_definitions import METHODOLOGY_DOCUMENT_INDEXES
from .models import (
    PipelineResults,
    SingleDocumentResult,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Parallel Document Ingestion Pipeline (Orchestrator)
# =============================================================================


class ParallelDocumentIngestionPipeline:
    """
    Orchestrator for parallel document processing via subprocess isolation.

    Handles:
    - Global operations (collection preparation)
    - Document discovery and matching
    - Spawning per-document subprocesses for memory-safe processing
    - Aggregating results

    Each document is processed in a separate subprocess, guaranteeing OS-level
    memory reclaim and crash isolation after every document.
    """

    def __init__(self, config: DocumentIngestionSettings):
        """
        Initialize shared resources and orchestration components.

        No ML models are loaded here. The parent orchestrator only needs a
        lightweight QdrantConnector for collection management. Embedding
        providers, parsers, and chunkers are created inside each subprocess.

        Args:
            config: Pipeline configuration
        """
        self.config = config

        # Initialize vector store connector without embedding provider.
        # The parent orchestrator only needs QdrantConnector for collection
        # management (ensure_collection_exists, clear_collection). Embedding
        # providers are created inside each subprocess for memory isolation.
        self.vector_store = QdrantConnector(
            url=config.qdrant_url,
            collection_name=config.qdrant_collection_name,
            api_key=config.qdrant_api_key,
        )

    async def run(self) -> PipelineResults:
        """
        Execute the full parallel pipeline.

        Returns:
            PipelineResults with aggregated statistics
        """
        batch_id = str(uuid4())
        start_time = time.monotonic()

        logger.info(f"Starting parallel pipeline (Batch ID: {batch_id})")
        logger.info(f"Mode: {self.config.mode}, Start from: {self.config.start_from}")

        # Phase 1: Discovery
        documents = await self._discover_documents()

        if not documents:
            logger.warning("No documents found to process")
            return self._create_empty_results(batch_id, start_time)

        logger.info(f"Discovered {len(documents)} documents to process")

        # Phase 2: Global Collection Preparation (ONCE before parallel processing)
        # Ensure collection exists BEFORE spawning parallel workers to avoid race condition
        # where multiple workers try to create the collection simultaneously (409 Conflict)
        if self.config.embedding_provider_type == EmbeddingProviderType.BGE_M3_ONNX:
            await self.vector_store.ensure_hybrid_collection_exists(
                dense_vector_size=self.config.embedding_vector_size
            )
        else:
            await self.vector_store.ensure_collection_exists(
                vector_size=self.config.embedding_vector_size
            )
        logger.info(f"Collection '{self.config.qdrant_collection_name}' ready")

        # Create payload indexes for metadata filtering.
        # Indexes are created immediately after collection setup so that the
        # HNSW graph builds filter-aware edges from the start.
        await self.vector_store.ensure_payload_indexes(METHODOLOGY_DOCUMENT_INDEXES)

        if self.config.mode == "override":
            logger.warning(
                f"OVERRIDE MODE: Clearing collection '{self.config.qdrant_collection_name}'"
            )
            await self.vector_store.clear_collection()
            logger.info("Collection cleared successfully")

        # Phase 3: Parallel Document Processing
        results = await self._process_documents_parallel(documents)

        # Phase 4: Aggregate Results
        pipeline_results = self._aggregate_results(batch_id, results, start_time)

        # Log summary
        self._log_summary(pipeline_results)

        return pipeline_results

    async def _discover_documents(self) -> list[tuple[Path, Path]]:
        """
        Discover documents based on start_from configuration.

        Discovers both PDF and DOCX files based on configured supported_formats.

        Returns:
            List of (document_path, staged_path) tuples
        """
        input_dir = self.config.input_documents_dir
        staged_dir = self.config.staged_documents_dir

        # Ensure input directory exists
        exists = await asyncio.to_thread(input_dir.exists)
        if not exists:
            logger.warning(f"Input directory does not exist: {input_dir}")
            # Create it for future use
            await asyncio.to_thread(input_dir.mkdir, parents=True, exist_ok=True)
            return []

        # Get all supported documents from input directory
        document_files = []
        for pattern in self.config.get_supported_glob_patterns():
            files = await asyncio.to_thread(lambda p=pattern: list(input_dir.glob(p)))
            document_files.extend(files)

        # Log counts by format
        format_counts = {}
        for f in document_files:
            ext = f.suffix.lower()
            format_counts[ext] = format_counts.get(ext, 0) + 1
        if format_counts:
            logger.info(f"Found documents: {format_counts}")

        # Warn about unsupported files
        all_files = await asyncio.to_thread(lambda: list(input_dir.iterdir()))
        unsupported = [
            f for f in all_files if f.is_file() and not DocumentParserFactory.is_supported(f)
        ]
        for f in unsupported:
            logger.warning(f"Skipping unsupported file type: {f.name}")

        if not document_files:
            logger.warning(f"No supported documents found in {input_dir}")
            return []

        if self.config.start_from == "beginning":
            # Full pipeline - process all documents
            return [(doc, staged_dir / doc.stem) for doc in document_files]
        # Resume mode - match input documents to staged files
        return await self._discover_for_resume(document_files, staged_dir)

    async def _discover_for_resume(
        self, pdf_files: list[Path], staged_dir: Path
    ) -> list[tuple[Path, Path]]:
        """
        Discover documents when resuming from parsed/chunked.

        Args:
            pdf_files: List of PDF files from input directory
            staged_dir: Staged documents directory

        Returns:
            List of (pdf_path, staged_path) tuples for documents with staged files
        """
        matched_documents = []
        missing_documents = []

        for pdf in pdf_files:
            doc_stem = pdf.stem
            staged_path = staged_dir / doc_stem

            # Check for required files based on start_from
            if self.config.start_from == "parsed":
                required_file = staged_path / "parsed" / f"{doc_stem}.json"
                exists = await asyncio.to_thread(required_file.exists)
            else:  # chunked - look for chunks_prepared in staged directory
                chunks_prepared_dir = (
                    self.config.staged_documents_dir / doc_stem / "chunks_prepared"
                )
                exists = await asyncio.to_thread(chunks_prepared_dir.exists)
                if exists:
                    # Also check that chunks exist
                    chunk_files = await asyncio.to_thread(
                        lambda d=chunks_prepared_dir: list(d.glob("chunk_*.json"))
                    )
                    exists = len(chunk_files) > 0

            if exists:
                matched_documents.append((pdf, staged_path))
                logger.debug(f"Matched {pdf.name} with staged files at {staged_path}")
            else:
                missing_documents.append(pdf)

        if missing_documents:
            logger.warning(
                f"{len(missing_documents)} documents skipped due to missing staged files. "
                f"Run full pipeline first to generate intermediate files."
            )
            for pdf in missing_documents:
                logger.warning(f"  - Missing: {pdf.name}")

        return matched_documents

    async def _process_documents_parallel(
        self, documents: list[tuple[Path, Path]]
    ) -> list[SingleDocumentResult]:
        """
        Process documents in parallel with semaphore limiting.

        Args:
            documents: List of (pdf_path, staged_path) tuples

        Returns:
            List of SingleDocumentResult for each document
        """
        semaphore = asyncio.Semaphore(self.config.max_parallel_files)

        async def process_with_semaphore(pdf_path: Path, staged_path: Path):
            async with semaphore:
                return await self._process_single_document(pdf_path, staged_path)

        logger.info(
            f"Processing {len(documents)} documents in parallel "
            f"(max {self.config.max_parallel_files} concurrent)"
        )

        tasks = [process_with_semaphore(pdf, staged) for pdf, staged in documents]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Convert exceptions to failed results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                pdf_path, _ = documents[i]
                processed_results.append(
                    SingleDocumentResult(
                        document_id=pdf_path.stem,
                        pdf_path=pdf_path,
                        chunks_generated=0,
                        vectors_upserted=0,
                        status="failed",
                        error=str(result),
                        processing_time_seconds=0.0,
                    )
                )
            else:
                processed_results.append(result)

        return processed_results

    async def _process_single_document(
        self, pdf_path: Path, staged_path: Path
    ) -> SingleDocumentResult:
        """Process a single document in an isolated subprocess.

        Each document runs in a separate subprocess, ensuring that memory is
        fully released back to the OS after each document completes. This
        solves Python's memory fragmentation issue that can cause OOM in
        long-running batch processes.

        Args:
            pdf_path: Path to document file in input directory
            staged_path: Path to document's staging folder

        Returns:
            SingleDocumentResult with processing outcome
        """
        from .subprocess_runner import run_document_subprocess  # noqa: PLC0415

        document_id = pdf_path.stem
        source_format = DocumentParserFactory.get_format(pdf_path).value

        logger.info(f"[{document_id}] Starting subprocess isolation mode")

        response = await run_document_subprocess(
            config=self.config,
            document_path=pdf_path,
            staged_path=staged_path,
            source_format=source_format,
        )

        # Log peak memory if available
        peak_mb = response.get("peak_memory_mb", 0)
        if peak_mb > 0:
            logger.info(f"[{document_id}] Peak memory: {peak_mb:.0f} MB ({peak_mb / 1024:.2f} GB)")

        # Convert SubprocessResponse to SingleDocumentResult
        return SingleDocumentResult(
            document_id=response.get("document_id", document_id),
            pdf_path=pdf_path,
            chunks_generated=response.get("chunks_generated", 0),
            vectors_upserted=response.get("vectors_upserted", 0),
            status="success" if response.get("status") == "success" else "failed",
            error=response.get("error_message"),
            processing_time_seconds=response.get("processing_time_seconds", 0.0),
        )

    def _aggregate_results(
        self,
        batch_id: str,
        results: list[SingleDocumentResult],
        start_time: float,
    ) -> PipelineResults:
        """Aggregate results from all document pipelines."""
        successful = [r for r in results if r["status"] == "success"]
        failed = [r for r in results if r["status"] == "failed"]

        return PipelineResults(
            batch_id=batch_id,
            total_documents=len(results),
            successful_documents=len(successful),
            failed_documents=len(failed),
            total_chunks_processed=sum(r["chunks_generated"] for r in results),
            total_vectors_upserted=sum(r["vectors_upserted"] for r in successful),
            document_results=results,
            failed_files=[(r["pdf_path"], r["error"] or "Unknown error") for r in failed],
            total_processing_time_seconds=time.monotonic() - start_time,
        )

    def _create_empty_results(self, batch_id: str, start_time: float) -> PipelineResults:
        """Create empty results when no documents are found."""
        return PipelineResults(
            batch_id=batch_id,
            total_documents=0,
            successful_documents=0,
            failed_documents=0,
            total_chunks_processed=0,
            total_vectors_upserted=0,
            document_results=[],
            failed_files=[],
            total_processing_time_seconds=time.monotonic() - start_time,
        )

    def _log_summary(self, results: PipelineResults) -> None:
        """Log pipeline execution summary."""
        logger.info("=" * 60)
        logger.info(f"Pipeline Execution Summary (Batch: {results['batch_id']})")
        logger.info("=" * 60)
        logger.info(f"Total documents: {results['total_documents']}")
        logger.info(f"Successful: {results['successful_documents']}")
        logger.info(f"Failed: {results['failed_documents']}")
        logger.info(f"Total chunks: {results['total_chunks_processed']}")
        logger.info(f"Total vectors: {results['total_vectors_upserted']}")
        logger.info(f"Total time: {results['total_processing_time_seconds']:.1f}s")

        if results["failed_files"]:
            logger.warning("Failed files:")
            for file_path, error in results["failed_files"]:
                logger.warning(f"  - {file_path}: {error}")

        logger.info("=" * 60)

    async def get_stats(self) -> dict[str, Any]:
        """Get current Qdrant collection statistics."""
        try:
            stats = await self.vector_store.get_stats()
            return {
                "points_count": stats.points_count,
                "vectors_count": stats.vectors_count,
                "status": stats.status,
            }
        except Exception as e:
            logger.warning(f"Could not retrieve Qdrant stats: {e}")
            return {"error": str(e)}

    async def close(self) -> None:
        """Close resources."""
        await self.vector_store.close()
