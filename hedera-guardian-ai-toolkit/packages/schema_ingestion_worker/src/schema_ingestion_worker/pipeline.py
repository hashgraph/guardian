"""Async pipeline for schema ingestion workflow with property-level batching."""

import asyncio
import gc
import logging
import time
from pathlib import Path
from typing import Any
from uuid import uuid4

from schema_ingestion_worker.methodology_utils import extract_methodology_from_path
from schema_ingestion_worker.schema_parsing.schema_parser import (
    load_schema_file,
    parse_schemas_from_directory,
)
from vector_store import QdrantConnector, create_embedding_provider

from .config import Settings
from .index_definitions import SCHEMA_PROPERTY_INDEXES
from .models import PipelineState, SchemaDocument, create_initial_state
from .utils import (
    AsyncBatchProcessor,
    CriticalPipelineError,
    PipelineNodeExecutor,
    PipelineResultBuilder,
    PipelineValidation,
    SchemaMetadataBuilder,
)

logger = logging.getLogger(__name__)


class AsyncSchemaIngestionPipeline:
    """
    Async pipeline for ingesting JSON schemas into a vector database.

    The pipeline processes JSON schema files through several stages:
    1. Discovery: Find all schema files in the input directory
    2. Validation: Validate all schemas can be loaded (fail-fast)
    3. Preparation: Clear collection if in override mode
    4. Parsing: Extract properties using SchemaParser (once for all schemas)
    5. Batching: Split properties into batches for efficient processing
    6. Embedding: Generate vector embeddings for property batches
    7. Upserting: Store embeddings in Qdrant vector database
    8. Progress tracking: Log statistics and results

    All operations are async for better performance.
    """

    def __init__(self, config: Settings):
        """
        Initialize the pipeline with configuration.

        Args:
            config: Settings object with pipeline configuration
        """
        self.config = config

        # Initialize embedding provider
        self.embedding_provider = create_embedding_provider(
            provider_type=config.embedding_provider_type,
            model_name=config.embedding_model_name,
            max_inference_batch_size=config.onnx_inference_batch_size,
        )

        # Initialize vector store connector
        self.vector_store = QdrantConnector(
            url=config.qdrant_url,
            collection_name=config.qdrant_collection_name,
            embedding_provider=self.embedding_provider,
            api_key=config.qdrant_api_key,
        )

    @staticmethod
    def _log_memory_usage(stage: str) -> None:
        """Log current memory usage at the given pipeline stage.

        Uses psutil if available, silently skips if not installed.
        """
        try:
            import psutil  # noqa: PLC0415

            process = psutil.Process()
            rss_mb = process.memory_info().rss / 1e6
            available_mb = psutil.virtual_memory().available / 1e6
            logger.debug(
                f"[Memory] {stage}: process={rss_mb:.0f}MB, available={available_mb:.0f}MB"
            )
            if available_mb < 500:
                logger.warning(
                    f"LOW MEMORY at {stage}: only {available_mb:.0f}MB available. "
                    "OOM risk - consider reducing batch sizes."
                )
        except ImportError:
            pass

    async def __aenter__(self):
        """
        Enter async context manager.

        Enables usage as: async with AsyncSchemaIngestionPipeline(config) as pipeline:
        This ensures proper resource cleanup even if errors occur.
        """
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """
        Exit async context manager and cleanup resources.

        Args:
            exc_type: Exception type if an error occurred
            exc_val: Exception value
            exc_tb: Exception traceback

        Returns:
            False to propagate exceptions
        """
        try:
            await self.close()
        except Exception as e:
            logger.warning(f"Error during resource cleanup: {e}", exc_info=True)
            # Don't suppress the original exception
        return False

    async def embed_batch(self, state: PipelineState) -> dict[str, Any]:
        """
        Generate embeddings for parsed documents.

        Uses the configured embedding provider to generate vector embeddings
        in batches for efficiency. Tracks failed batches for visibility.

        Args:
            state: Current pipeline state with parsed_documents

        Returns:
            State update with embedded_documents, embedding_failures populated

        Raises:
            TimeoutError: If embedding exceeds configured timeout
            CriticalPipelineError: For critical failures requiring pipeline abort
        """

        async def _process():
            parsed_docs = state.get("parsed_documents", [])
            logger.info(f"Generating embeddings for {len(parsed_docs)} documents")

            # Use AsyncBatchProcessor for batch processing with failure tracking
            embedded_documents, failed_batches = await AsyncBatchProcessor.process_batches(
                items=parsed_docs,
                batch_size=self.config.embedding_batch_size,
                process_fn=self._process_embedding_batch,
                operation_name="embedding",
            )

            logger.info(
                f"Successfully generated {len(embedded_documents)} embeddings "
                f"({len(failed_batches)} batches failed)"
            )

            return {
                "embedded_documents": embedded_documents,
                "embedding_failures": failed_batches,
            }

        def _validate_input():
            parsed_docs = state.get("parsed_documents", [])
            if not parsed_docs:
                return False, "No parsed documents to embed"
            return True, ""

        return await PipelineNodeExecutor.execute_node(
            node_name="embed_batch",
            timeout_seconds=self.config.embedding_timeout,
            process_fn=_process,
            input_validation_fn=_validate_input,
        )

    async def _process_embedding_batch(
        self, batch: list[SchemaDocument], batch_num: int, _total_batches: int
    ) -> list[dict[str, Any]]:
        """
        Process a single embedding batch.

        Args:
            batch: Batch of schema documents to embed
            batch_num: Current batch number (used for CriticalPipelineError traceability)
            _total_batches: Total number of batches (unused, required by AsyncBatchProcessor interface)

        Returns:
            List of embedded document dictionaries

        Raises:
            ValueError: If batch is empty
            CriticalPipelineError: If embedding count mismatch occurs (data corruption risk)
        """
        # Validate batch is non-empty (defensive check)
        PipelineValidation.validate_empty_batch(batch, "embedding")

        batch_texts = [doc.embedding_input for doc in batch]

        # Generate embeddings for batch
        embeddings = await self.embedding_provider.embed_batch(batch_texts)

        # CRITICAL: Validate embedding count matches input count
        # This is a critical error because mismatch indicates data corruption
        if len(embeddings) != len(batch):
            error_msg = (
                f"Embedding count mismatch - expected {len(batch)}, got {len(embeddings)}. "
                "This indicates a serious issue with the embedding provider. "
                "Processing cannot continue safely."
            )
            critical_error = CriticalPipelineError(
                message=error_msg,
                stage="embedding",
                batch_id=batch_num,
            )
            logger.critical(str(critical_error))
            raise critical_error

        # Create embedded documents using strict zip to catch any mismatches
        embedded_documents: list[dict[str, Any]] = []
        for doc, embedding in zip(batch, embeddings, strict=True):
            metadata = SchemaMetadataBuilder.build_metadata(doc, extract_methodology_from_path)

            embedded_doc = {
                "text": doc.embedding_input,
                "embedding": embedding,
                "metadata": metadata,
            }
            embedded_documents.append(embedded_doc)

        return embedded_documents

    async def upsert_to_qdrant(self, state: PipelineState) -> dict[str, Any]:
        """
        Upsert pre-embedded documents to Qdrant vector database.

        Uses add_pre_embedded_documents() to avoid regenerating embeddings.
        Tracks failed batches for visibility.

        Args:
            state: Current pipeline state with embedded_documents

        Returns:
            State update with processed_count, upsert_failures populated

        Raises:
            TimeoutError: If upsert exceeds configured timeout
        """

        async def _process():
            embedded_docs = state.get("embedded_documents", [])
            logger.info(
                f"Upserting {len(embedded_docs)} pre-embedded documents to Qdrant "
                f"in batches of {self.config.vector_upsert_batch_size}"
            )

            # Use AsyncBatchProcessor for batch processing with failure tracking
            all_ids, failed_batches = await AsyncBatchProcessor.process_batches(
                items=embedded_docs,
                batch_size=self.config.vector_upsert_batch_size,
                process_fn=self._process_upsert_batch,
                operation_name="upsert",
            )

            count = len(all_ids)
            logger.info(
                f"Successfully upserted {count}/{len(embedded_docs)} documents "
                f"({len(failed_batches)} batches failed)"
            )

            return {
                "processed_count": count,
                "upsert_failures": failed_batches,
            }

        def _validate_input():
            embedded_docs = state.get("embedded_documents", [])
            if not embedded_docs:
                return False, "No embedded documents to upsert"
            return True, ""

        return await PipelineNodeExecutor.execute_node(
            node_name="upsert_to_qdrant",
            timeout_seconds=self.config.upsert_timeout,
            process_fn=_process,
            input_validation_fn=_validate_input,
        )

    async def _process_upsert_batch(
        self, batch: list[dict[str, Any]], _batch_num: int, _total_batches: int
    ) -> list[str]:
        """
        Process a single upsert batch.

        Args:
            batch: Batch of embedded documents to upsert
            _batch_num: Current batch number (unused, required by AsyncBatchProcessor interface)
            _total_batches: Total number of batches (unused, required by AsyncBatchProcessor interface)

        Returns:
            List of document IDs

        Raises:
            ValueError: If batch is empty
            Exception: If batch processing fails
        """
        # Validate batch is non-empty (defensive check)
        PipelineValidation.validate_empty_batch(batch, "upsert")

        # Extract data from embedded documents
        documents = [doc["text"] for doc in batch]
        embeddings = [doc["embedding"] for doc in batch]
        metadata = [doc["metadata"] for doc in batch]

        # Upsert to Qdrant and return IDs directly
        return await self.vector_store.add_pre_embedded_documents(
            documents, embeddings, metadata=metadata
        )

    async def update_progress(self, state: PipelineState) -> dict:
        """
        Update and log pipeline progress and statistics.

        Args:
            state: Current pipeline state

        Returns:
            Empty state update (just logging)
        """
        try:
            batch_id = state.get("batch_id", "unknown")
            total_files = len(state.get("schema_files", []))
            # Use count fields if available (property-batched flow), otherwise use len() (old flow)
            parsed_count = state.get("parsed_count", len(state.get("parsed_documents", [])))
            embedded_count = state.get("embedded_count", len(state.get("embedded_documents", [])))
            processed_count = state.get("processed_count", 0)
            failed_count = len(state.get("failed_files", []))

            logger.info("=" * 60)
            logger.info(f"Pipeline Execution Summary (Batch: {batch_id})")
            logger.info("=" * 60)
            logger.info(f"Total schema files discovered: {total_files}")
            logger.info(f"Properties parsed: {parsed_count}")
            logger.info(f"Embeddings generated: {embedded_count}")
            logger.info(f"Documents upserted to Qdrant: {processed_count}")
            logger.info(f"Failed files: {failed_count}")

            if failed_count > 0:
                logger.warning("Failed files:")
                for file_path, error in state.get("failed_files", []):
                    logger.warning(f"  - {file_path}: {error}")

            logger.info("=" * 60)

            # Get vector store statistics
            try:
                stats = await self.vector_store.get_stats()
                logger.info("Qdrant collection stats:")
                logger.info(f"  - Points: {stats.points_count}")
                logger.info(f"  - Vectors: {stats.vectors_count}")
                logger.info(f"  - Status: {stats.status}")
            except Exception as e:
                logger.warning(f"Could not retrieve Qdrant stats: {e}")

        except Exception as e:
            logger.error(f"Error in update_progress node: {e}", exc_info=True)

        return {}

    async def _validate_all_schema_files(
        self, schema_files: list[Path]
    ) -> tuple[bool, list[tuple[Path, str]], dict[str, Any]]:
        """
        Validate all schema files can be loaded before processing (fail-fast).

        This ensures data safety in override mode by preventing collection clearing
        if any schema file is invalid. Returns loaded data to avoid reloading later.

        Args:
            schema_files: List of schema file paths to validate

        Returns:
            Tuple of (validation_passed, failed_files, preloaded_schemas)
            where preloaded_schemas maps file paths to loaded JSON data.
        """
        failed_files: list[tuple[Path, str]] = []
        preloaded_schemas: dict[str, Any] = {}

        logger.info(f"Validating {len(schema_files)} schema files (fail-fast mode)")

        for schema_file in schema_files:
            try:
                # Attempt to load schema file
                data = await asyncio.to_thread(load_schema_file, str(schema_file))
                if not data:
                    logger.error(f"Validation failed: Cannot load {schema_file}")
                    failed_files.append((schema_file, "Failed to load during validation"))
                else:
                    preloaded_schemas[str(schema_file.resolve())] = data
            except Exception as e:
                logger.error(f"Validation failed for {schema_file}: {e}")
                failed_files.append((schema_file, f"Validation error: {str(e)}"))

        if failed_files:
            logger.error(
                f"Schema validation failed for {len(failed_files)} files. "
                "Aborting pipeline to prevent data loss."
            )
            return False, failed_files, {}

        logger.info("All schema files validated successfully")
        return True, [], preloaded_schemas

    async def _parse_all_schemas(
        self,
        input_dir: Path,
        preloaded_schemas: dict[str, Any] | None = None,
    ) -> tuple[list[SchemaDocument], dict[str, Any]]:
        """
        Parse all schemas from directory and convert to SchemaDocument format.

        Args:
            input_dir: Directory containing schema files
            preloaded_schemas: Optional pre-loaded schema data from validation
                phase, keyed by file path. Avoids reloading files from disk.

        Returns:
            Tuple of (parsed_documents, stats)

        Raises:
            Exception: If parsing fails
        """
        schema_dir = str(input_dir)
        parsed_props, stats = await asyncio.to_thread(
            parse_schemas_from_directory,
            schema_dir,
            return_stats=True,
            verbose=False,
            preloaded_schemas=preloaded_schemas,
        )

        # Convert to SchemaDocument format
        parsed_documents: list[SchemaDocument] = []
        for prop_dict in parsed_props:
            doc = SchemaDocument(
                embedding_input=prop_dict["embedding_input"],
                content=prop_dict["content"],
                source=prop_dict["source"],
            )
            parsed_documents.append(doc)

        # MEMORY SAFETY: Validate property count for large datasets
        PipelineValidation.validate_property_count(len(parsed_documents))

        return parsed_documents, stats

    async def _discover_and_validate_schemas(
        self, result_builder: PipelineResultBuilder
    ) -> tuple[list[Path] | None, dict[str, Any]]:
        """
        Discover schema files and validate them (Phases 1-2).

        Combines discovery and validation phases for cleaner run() method.
        Returns preloaded schema data to avoid reloading during parsing.

        Args:
            result_builder: Result builder to update with discovery/validation results

        Returns:
            Tuple of (schema_files, preloaded_schemas). schema_files is None if
            discovery or validation failed.
        """
        input_dir = Path(self.config.input_schemas_dir)

        # Check directory exists
        exists = await asyncio.to_thread(input_dir.exists)
        if not exists:
            logger.error(f"Input directory does not exist: {input_dir}")
            result_builder.add_error(input_dir, "Directory does not exist")
            return None, {}

        # Discover schema files
        schema_files = await asyncio.to_thread(lambda: list(input_dir.rglob("*.json")))
        result_builder.set_schema_file_count(len(schema_files))
        logger.info(f"Discovered {len(schema_files)} schema files")

        if not schema_files:
            logger.warning("No schema files found")
            result_builder.mark_validation(True, [])
            return None, {}

        # Validate all files can be loaded (fail-fast) and retain loaded data
        validation_passed, failed_files, preloaded_schemas = await self._validate_all_schema_files(
            schema_files
        )
        result_builder.mark_validation(validation_passed, failed_files)

        if not validation_passed:
            logger.error("Validation failed. Aborting pipeline.")
            if self.config.mode == "override":
                logger.warning("OVERRIDE MODE: Collection NOT cleared (preserving existing data)")
            return None, {}

        return schema_files, preloaded_schemas

    async def _parse_and_prepare_data(
        self,
        result_builder: PipelineResultBuilder,
        preloaded_schemas: dict[str, Any] | None = None,
    ) -> list[SchemaDocument] | None:
        """
        Parse schemas and clear collection if override mode (Phases 4-5).

        Combines parsing and collection clearing for transactional safety.
        Collection is only cleared AFTER successful validation and parsing.

        Args:
            result_builder: Result builder to update with parsing results
            preloaded_schemas: Optional pre-loaded schema data from validation

        Returns:
            List of parsed schema documents, or None if parsing failed
        """
        logger.info("=" * 70)
        logger.info("Parsing all schemas to extract properties")
        logger.info("=" * 70)
        parse_start_time = time.time()

        try:
            input_dir = Path(self.config.input_schemas_dir)
            parsed_documents, stats = await self._parse_all_schemas(
                input_dir, preloaded_schemas=preloaded_schemas
            )

            parse_elapsed = time.time() - parse_start_time
            logger.info(
                f"Successfully parsed {len(parsed_documents)} unique properties from "
                f"{stats['root_schema_count']} root schemas in {parse_elapsed:.1f}s"
            )
            logger.info(f"Referenced schemas: {stats['referenced_schema_count']}")
            logger.info(f"Cache hits: {stats['cached_refs']}")

            result_builder.set_properties_parsed(len(parsed_documents))

            # Clear collection ONLY after successful validation and parsing
            await self._clear_collection_if_override()

            return parsed_documents

        except Exception as e:
            logger.error(f"Failed to parse schemas: {e}", exc_info=True)
            if self.config.mode == "override":
                logger.warning("OVERRIDE MODE: Collection NOT cleared (preserving existing data)")
            result_builder.add_error(Path(self.config.input_schemas_dir), f"Parse error: {str(e)}")
            return None

    async def _ensure_collection_ready(self) -> None:
        """
        Ensure Qdrant collection exists and is ready for ingestion.

        Creates payload indexes for metadata filtering immediately after
        collection setup so the HNSW graph builds filter-aware edges.

        Raises:
            Exception: If collection operations fail
        """
        try:
            await self.vector_store.ensure_collection_exists()
            await self.vector_store.ensure_payload_indexes(SCHEMA_PROPERTY_INDEXES)
            logger.info("Qdrant collection is ready")
        except Exception as e:
            logger.error(f"Failed to prepare Qdrant collection: {e}", exc_info=True)
            raise

    async def _clear_collection_if_override(self) -> None:
        """
        Clear collection if in override mode with safety checks.

        Verifies Qdrant connectivity before clearing to ensure we can write
        new data. This prevents data loss if Qdrant becomes unavailable after
        clearing but before upserting.

        Raises:
            Exception: If collection clearing or connectivity check fails
        """
        if self.config.mode == "override":
            try:
                logger.warning(
                    f"OVERRIDE MODE: Clearing collection '{self.config.qdrant_collection_name}'"
                )
                logger.warning(
                    "WARNING: This is a point of no return. If subsequent operations fail, "
                    "original data will be lost. Consider backup if data is critical."
                )

                # SAFETY CHECK: Verify Qdrant connectivity before clearing
                # This ensures we can write new data after clearing
                logger.debug("Verifying Qdrant connectivity before clearing...")
                await self.vector_store.get_stats()
                logger.debug("Connectivity verified")

                # Safe to clear now
                await self.vector_store.clear_collection()
                logger.info("Collection cleared successfully")

            except Exception as e:
                logger.error(f"Failed to clear collection: {e}", exc_info=True)
                raise
        else:
            logger.debug(
                f"APPEND MODE: Keeping existing data in collection '{self.config.qdrant_collection_name}'"
            )

    async def run(self) -> dict[str, Any]:
        """
        Execute the property-batched pipeline for schema ingestion.

        This method validates and parses all schema files once, then batches the
        resulting properties for embedding and upserting. This prevents timeout
        issues while ensuring $ref dependencies are resolved correctly.

        Process:
        1. Discover and validate schema files (fail-fast for override mode safety)
        2. Prepare Qdrant collection
        3. Parse schemas and clear collection if override mode
        4. Split properties into batches and process: embed → upsert

        Returns:
            Aggregated results with consistent structure:
            {
                "batch_id": str,
                "total_schema_files": int,
                "total_batches": int,
                "batches_completed": int,
                "batches_failed": int,
                "total_properties_parsed": int,
                "total_embeddings_generated": int,
                "total_documents_upserted": int,
                "failed_files": list[tuple[Path, str]],
                "validation_passed": bool,
                "embedding_failures": list[tuple[int, str]],
                "upsert_failures": list[tuple[int, str]],
            }
        """
        overall_start_time = time.time()
        batch_id = str(uuid4())
        result_builder = PipelineResultBuilder(batch_id=batch_id)

        logger.info("=" * 70)
        logger.info(f"Starting property-batched pipeline (Batch ID: {batch_id})")
        logger.info("=" * 70)
        self._log_memory_usage("pipeline start")

        # Phase 1: Discover and validate schemas (also preloads file data)
        schema_files, preloaded_schemas = await self._discover_and_validate_schemas(result_builder)
        if not schema_files:
            return result_builder.get_result()

        # Phase 2: Prepare Qdrant collection
        try:
            await self._ensure_collection_ready()
        except Exception as e:
            result_builder.add_error(Path("collection"), f"Collection error: {str(e)}")
            return result_builder.get_result()

        # Phase 3: Parse schemas and clear collection if override mode
        parsed_documents = await self._parse_and_prepare_data(
            result_builder, preloaded_schemas=preloaded_schemas
        )
        # Release preloaded data now that parsing is complete
        del preloaded_schemas
        self._log_memory_usage("after parsing")
        if not parsed_documents:
            return result_builder.get_result()

        # Phase 4: Split properties into batches and process
        await self._process_property_batches(
            parsed_documents, batch_id, schema_files, result_builder, overall_start_time
        )

        return result_builder.get_result()

    async def _process_property_batches(
        self,
        parsed_documents: list[SchemaDocument],
        batch_id: str,
        schema_files: list[Path],
        result_builder: PipelineResultBuilder,
        overall_start_time: float,
    ) -> None:
        """
        Split properties into batches and process each through embed → upsert pipeline.

        Args:
            parsed_documents: List of parsed schema documents
            batch_id: Unique batch identifier
            schema_files: List of discovered schema files
            result_builder: Result builder to update
            overall_start_time: Pipeline start time
        """
        property_batch_size = self.config.embedding_batch_size
        total_properties = len(parsed_documents)
        total_batches = (total_properties + property_batch_size - 1) // property_batch_size
        result_builder.set_batch_count(total_batches)

        logger.info("=" * 70)
        logger.info(
            f"Processing {total_properties} properties in {total_batches} batch(es) "
            f"of {property_batch_size}"
        )
        logger.info("=" * 70)

        for batch_num in range(1, total_batches + 1):
            start_idx = (batch_num - 1) * property_batch_size
            end_idx = min(start_idx + property_batch_size, total_properties)
            property_batch = parsed_documents[start_idx:end_idx]
            batch_start_time = time.time()
            logger.info(
                f"Processing batch {batch_num}/{total_batches} ({len(property_batch)} properties)"
            )

            try:
                # Process single property batch
                final_state = await self._run_single_property_batch(
                    property_batch, batch_id, batch_num
                )

                # Update results using result builder
                batch_elapsed = time.time() - batch_start_time
                embedded_count = len(final_state.get("embedded_documents", []))
                processed_count = final_state.get("processed_count", 0)
                has_error = bool(
                    final_state.get("error")
                    or final_state.get("embedding_failures")
                    or final_state.get("upsert_failures")
                )

                result_builder.add_batch_result(
                    embedded_count=embedded_count,
                    upserted_count=processed_count,
                    has_error=has_error,
                    embedding_failures=final_state.get("embedding_failures", []),
                    upsert_failures=final_state.get("upsert_failures", []),
                )

                if has_error:
                    error_detail = final_state.get("error", "")
                    embed_fails = final_state.get("embedding_failures", [])
                    upsert_fails = final_state.get("upsert_failures", [])
                    logger.error(
                        f"Batch {batch_num}/{total_batches} FAILED in {batch_elapsed:.1f}s: "
                        f"error={error_detail}, embedding_failures={len(embed_fails)}, "
                        f"upsert_failures={len(upsert_fails)}"
                    )
                else:
                    logger.info(
                        f"Batch {batch_num}/{total_batches} completed in {batch_elapsed:.1f}s: "
                        f"{embedded_count} embedded, {processed_count} upserted"
                    )
                self._log_memory_usage(f"after batch {batch_num}/{total_batches}")

            except CriticalPipelineError as e:
                batch_elapsed = time.time() - batch_start_time
                result_builder.add_batch_result(0, 0, has_error=True)
                logger.critical(
                    f"Batch {batch_num}/{total_batches} CRITICAL error in {batch_elapsed:.1f}s: {e}. "
                    "Aborting remaining batches.",
                    exc_info=True,
                )
                break

            except Exception as e:
                batch_elapsed = time.time() - batch_start_time
                result_builder.add_batch_result(0, 0, has_error=True)
                logger.error(
                    f"Batch {batch_num}/{total_batches} error in {batch_elapsed:.1f}s: {e}",
                    exc_info=True,
                )

        # Log final summary
        await self._log_final_summary(
            batch_id, schema_files, result_builder.get_result(), overall_start_time
        )

    async def _run_single_property_batch(
        self, property_batch: list[SchemaDocument], batch_id: str, batch_num: int
    ) -> dict[str, Any]:
        """
        Process a single property batch through embed → upsert pipeline.

        Args:
            property_batch: Batch of properties to process
            batch_id: Main batch identifier
            batch_num: Batch number for logging

        Returns:
            Final state after processing
        """
        batch_state = create_initial_state()
        batch_state["batch_id"] = f"{batch_id}-batch{batch_num}"
        batch_state["parsed_documents"] = property_batch

        # Run embed → upsert pipeline
        return await self._run_property_batch(batch_state)

    async def _log_final_summary(
        self,
        batch_id: str,
        schema_files: list[Path],
        result: dict[str, Any],
        overall_start_time: float,
    ) -> None:
        """
        Log final pipeline summary with statistics.

        Args:
            batch_id: Batch identifier
            schema_files: List of schema files
            result: Aggregated results
            overall_start_time: Pipeline start time
        """
        # Create state for update_progress node
        final_state = create_initial_state()
        final_state["batch_id"] = batch_id
        final_state["schema_files"] = schema_files
        final_state["parsed_count"] = result["total_properties_parsed"]
        final_state["embedded_count"] = result["total_embeddings_generated"]
        final_state["processed_count"] = result["total_documents_upserted"]
        final_state["failed_files"] = result["failed_files"]

        # Use update_progress node for consistent logging
        await self.update_progress(final_state)

        # Log batch-specific metrics
        overall_elapsed = time.time() - overall_start_time
        logger.info(f"Total batches: {result['total_batches']}")
        logger.info(f"Completed: {result['batches_completed']}")
        logger.info(f"Failed: {result['batches_failed']}")
        logger.info(f"Total elapsed: {overall_elapsed:.1f}s")

    async def _run_property_batch(self, batch_state: PipelineState) -> dict[str, Any]:
        """
        Execute a single property batch through embed → upsert pipeline.

        This method processes a batch of pre-parsed properties. Parsing has already
        been done once for all schemas, so we only need to embed and upsert.

        Timeout handling is managed by the embed_batch and upsert_to_qdrant nodes,
        which have appropriate timeouts for their operations (300s and 60s respectively).

        Args:
            batch_state: Pipeline state with pre-populated parsed_documents

        Returns:
            Final state after processing this batch
        """
        try:
            state = dict(batch_state)

            if not state.get("parsed_documents"):
                logger.warning("No parsed documents in this property batch")
                return state

            # Embed batch (has internal 300s timeout)
            state = {**state, **await self.embed_batch(state)}

            if not state.get("embedded_documents"):
                logger.warning("No embeddings generated in this property batch")
                return state

            # Upsert to Qdrant (has internal 60s timeout)
            return {**state, **await self.upsert_to_qdrant(state)}

        except CriticalPipelineError:
            raise

        except Exception as e:
            logger.error(f"Property batch execution failed: {e}", exc_info=True)
            # Return new dict to avoid mutating caller's batch_state
            return {**batch_state, "error": str(e)}

    async def close(self) -> None:
        """
        Close resources and release memory.

        Releases embedding provider (~400-600MB for ONNX models), closes vector
        store connection, and runs garbage collection. Logs but doesn't raise
        exceptions to ensure cleanup is best-effort and doesn't mask
        original errors in exception handling contexts.
        """
        try:
            await self.vector_store.close()
        except Exception as e:
            logger.warning(f"Error closing vector store: {e}", exc_info=True)

        # Release embedding provider memory (ONNX session, tokenizer, etc.)
        try:
            if hasattr(self.embedding_provider, "cleanup"):
                self.embedding_provider.cleanup()
                logger.debug("Embedding provider cleaned up")
        except Exception as e:
            logger.warning(f"Error cleaning up embedding provider: {e}", exc_info=True)

        # Force garbage collection to reclaim freed memory
        collected = gc.collect()
        logger.debug(f"Garbage collection reclaimed {collected} objects")

        self._log_memory_usage("after cleanup")


# Backwards compatibility alias
SchemaIngestionPipeline = AsyncSchemaIngestionPipeline
