"""Document parser orchestrator for schema ingestion.

This module provides the DocumentParser class which orchestrates the
schema ingestion pipeline, managing configuration, logging, and execution.
"""

import logging
from typing import Any

from .config import Settings
from .pipeline import AsyncSchemaIngestionPipeline

logger = logging.getLogger(__name__)


class DocumentParser:
    """
    Main orchestrator for document parsing and ingestion.

    This class manages the configuration, initialization, and execution
    of the schema ingestion pipeline. It provides a high-level interface
    for processing JSON schema files and storing them in a vector database.
    """

    def __init__(self, config: Settings | None = None):
        """
        Initialize the DocumentParser with configuration.

        Args:
            config: Settings object with pipeline configuration.
                   If None, loads from environment variables.
        """
        # Load configuration
        if config is None:
            config = Settings()

        self.config = config

        # Configure logging
        self._configure_logging()

        logger.info("Initializing DocumentParser")
        logger.info(f"Input directory: {config.input_schemas_dir}")
        logger.info(f"Output directory: {config.output_dir}")
        logger.info(f"Qdrant URL: {config.qdrant_url}")
        logger.info(f"Collection name: {config.qdrant_collection_name}")

        # Initialize the async pipeline
        try:
            self.pipeline = AsyncSchemaIngestionPipeline(config)
            logger.info("Async pipeline initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize pipeline: {e}", exc_info=True)
            raise

    def _configure_logging(self) -> None:
        """Configure logging based on settings."""
        # Get the root logger
        root_logger = logging.getLogger()

        # Set level from config
        log_level = getattr(logging, self.config.log_level.upper(), logging.INFO)
        root_logger.setLevel(log_level)

        # Only configure handlers if none exist
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
        Process all documents through the property-batched ingestion pipeline.

        This method orchestrates the entire ingestion workflow with property-level batching:
        1. Discovers and validates all schema files
        2. Parses ALL schemas ONCE to extract properties (resolves $ref dependencies)
        3. Splits properties into batches (default: embedding_batch_size per batch)
        4. Processes each batch: embed → upsert
        5. Each batch commits independently to Qdrant
        6. Returns aggregated statistics

        Property-level batching prevents timeout issues and eliminates duplicates.

        Returns:
            Dictionary containing execution statistics:
            - batch_id: Unique identifier for this execution
            - total_files: Number of schema files discovered
            - total_batches: Number of batches processed
            - batches_completed: Successfully completed batches
            - batches_failed: Failed batches
            - parsed_count: Total properties parsed
            - embedded_count: Total embeddings generated
            - processed_count: Total vectors stored in Qdrant
            - failed_count: Number of failed files
            - failed_files: List of (file_path, error_message) tuples
        """
        logger.info("=" * 60)
        logger.info("Starting document processing")
        logger.info("=" * 60)

        try:
            logger.info(
                f"PROPERTY-BATCHED MODE: Processing properties in batches of "
                f"{self.config.embedding_batch_size} properties"
            )

            # Use property-batched processing (always)
            final_state = await self.pipeline.run()

            # Extract statistics from batched results
            stats = self._extract_statistics_batched(final_state)

            logger.info("=" * 60)
            logger.info("Document processing completed successfully")
            logger.info("=" * 60)

            return stats

        except Exception as e:
            logger.error(f"Document processing failed: {e}", exc_info=True)
            return {
                "error": str(e),
                "batch_id": None,
                "total_files": 0,
                "parsed_count": 0,
                "embedded_count": 0,
                "processed_count": 0,
                "failed_count": 0,
                "failed_files": [],
                "total_batches": 0,
                "batches_completed": 0,
                "batches_failed": 0,
            }

    def _extract_statistics_batched(self, final_state: dict[str, Any]) -> dict[str, Any]:
        """
        Extract statistics from batched pipeline execution.

        Args:
            final_state: The aggregated results from batched execution

        Returns:
            Dictionary with execution statistics compatible with print_summary
        """
        return {
            "batch_id": final_state.get("batch_id"),
            "total_files": final_state.get("total_schema_files", 0),
            "parsed_count": final_state.get("total_properties_parsed", 0),
            "embedded_count": final_state.get("total_embeddings_generated", 0),
            "processed_count": final_state.get("total_documents_upserted", 0),
            "failed_count": len(final_state.get("failed_files", [])),
            "failed_files": final_state.get("failed_files", []),
            # Additional batching info
            "total_batches": final_state.get("total_batches", 0),
            "batches_completed": final_state.get("batches_completed", 0),
            "batches_failed": final_state.get("batches_failed", 0),
        }

    async def close(self) -> None:
        """Close pipeline resources and release memory."""
        await self.pipeline.close()

    async def get_pipeline_stats(self) -> dict[str, Any]:
        """
        Get statistics from the vector store.

        Returns:
            Dictionary containing vector store statistics
        """
        try:
            stats = await self.pipeline.vector_store.get_stats()
            return {
                "count": stats.points_count,
                "dimension": stats.config.get("vector_size") if stats.config else 0,
                "status": stats.status,
            }
        except Exception as e:
            logger.error(f"Failed to get pipeline stats: {e}")
            return {"error": str(e)}
