"""Document parser orchestrator for document ingestion.

This module provides the DocumentParser class which orchestrates the
document ingestion pipeline, managing configuration, logging, and execution.
"""

import logging
from typing import Any

from .config import DocumentIngestionSettings
from .models import PipelineResults
from .parallel_pipeline import ParallelDocumentIngestionPipeline

logger = logging.getLogger(__name__)


class DocumentParser:
    """
    Main orchestrator for document parsing and ingestion.

    This class manages the configuration, initialization, and execution
    of the parallel document ingestion pipeline. It provides a high-level
    interface for processing PDF documents and storing them in a vector database.
    """

    def __init__(self, config: DocumentIngestionSettings | None = None):
        """
        Initialize the DocumentParser with configuration.

        Args:
            config: Settings object with pipeline configuration.
                   If None, loads from environment variables.
        """
        if config is None:
            config = DocumentIngestionSettings()

        self.config = config
        self._configure_logging()

        logger.info("Initializing DocumentParser")
        logger.info(f"Data directory: {config.data_dir}")
        logger.info(f"Input directory: {config.input_documents_dir}")
        logger.info(f"Staged directory: {config.staged_documents_dir}")
        logger.info(f"Qdrant URL: {config.qdrant_url}")
        logger.info(f"Collection name: {config.qdrant_collection_name}")
        logger.info(f"Mode: {config.mode}")
        logger.info(f"Start from: {config.start_from}")
        logger.info(f"Max parallel files: {config.max_parallel_files}")
        logger.info(f"OCR enabled: {config.do_ocr}")

        try:
            self.pipeline = ParallelDocumentIngestionPipeline(config)
            logger.info("Parallel pipeline initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize pipeline: {e}", exc_info=True)
            raise

    def _configure_logging(self) -> None:
        """Configure logging based on settings."""
        root_logger = logging.getLogger()
        log_level = getattr(logging, self.config.log_level.upper(), logging.INFO)
        root_logger.setLevel(log_level)

        if not root_logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
            handler.setFormatter(formatter)
            root_logger.addHandler(handler)

        logger.info(f"Logging configured with level: {self.config.log_level}")

    async def process_documents(self) -> dict[str, Any]:
        """
        Process all documents through the parallel ingestion pipeline.

        Each document is processed independently in parallel (up to max_parallel_files
        concurrent documents). Results are aggregated at the end.

        Returns:
            Dictionary containing execution statistics
        """
        logger.info("=" * 60)
        logger.info("Starting parallel document processing")
        logger.info("=" * 60)

        try:
            results = await self.pipeline.run()
            stats = self._extract_statistics(results)

            logger.info("=" * 60)
            logger.info("Document processing completed")
            logger.info("=" * 60)

            return stats

        except Exception as e:
            logger.error(f"Document processing failed: {e}", exc_info=True)
            return {
                "error": str(e),
                "batch_id": None,
                "total_documents": 0,
                "successful_documents": 0,
                "failed_documents": 0,
                "total_chunks": 0,
                "total_vectors": 0,
                "failed_files": [],
                "processing_time_seconds": 0.0,
            }

    def _extract_statistics(self, results: PipelineResults) -> dict[str, Any]:
        """Extract statistics from pipeline results."""
        return {
            "batch_id": results["batch_id"],
            "total_documents": results["total_documents"],
            "successful_documents": results["successful_documents"],
            "failed_documents": results["failed_documents"],
            "total_chunks": results["total_chunks_processed"],
            "total_vectors": results["total_vectors_upserted"],
            "failed_files": results["failed_files"],
            "processing_time_seconds": results["total_processing_time_seconds"],
            "document_results": results["document_results"],
        }

    async def get_pipeline_stats(self) -> dict[str, Any]:
        """Get statistics from the vector store."""
        return await self.pipeline.get_stats()

    async def close(self) -> None:
        """Close pipeline resources."""
        await self.pipeline.close()
