"""Utility classes for schema ingestion pipeline."""

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any, TypeVar

from pydantic import BaseModel, ConfigDict, Field

from .models import SchemaDocument

logger = logging.getLogger(__name__)

T = TypeVar("T")


class PipelineError(Exception):
    """
    Base exception for all pipeline errors.

    Provides structured context about where and why an error occurred,
    making debugging and error handling more robust.

    Attributes:
        message: Human-readable error description
        stage: Pipeline stage where error occurred (e.g., "embedding", "validation")
        batch_id: Batch or document identifier for traceability
        cause: Original exception that triggered this error
    """

    def __init__(
        self,
        message: str,
        stage: str | None = None,
        batch_id: str | int | None = None,
        cause: Exception | None = None,
    ):
        """
        Initialize pipeline error with structured context.

        Args:
            message: Error description
            stage: Pipeline stage where error occurred
            batch_id: Batch or document ID for traceability
            cause: Original exception if this wraps another error
        """
        super().__init__(message)
        self.message = message
        self.stage = stage
        self.batch_id = batch_id
        self.cause = cause

    def __str__(self) -> str:
        """Format error with full context."""
        parts = [self.message]
        if self.stage:
            parts.append(f"stage={self.stage}")
        if self.batch_id is not None:
            parts.append(f"batch_id={self.batch_id}")
        if self.cause:
            parts.append(f"cause={type(self.cause).__name__}: {self.cause}")
        return " | ".join(parts)

    def to_dict(self) -> dict[str, Any]:
        """Convert error to dictionary for serialization."""
        return {
            "error_type": self.__class__.__name__,
            "message": self.message,
            "stage": self.stage,
            "batch_id": self.batch_id,
            "cause": str(self.cause) if self.cause else None,
        }


class CriticalPipelineError(PipelineError):
    """
    Critical error that should stop pipeline processing immediately.

    Used for errors that indicate data corruption, resource exhaustion,
    or other conditions where continuing would be dangerous.

    Inherits all structured context fields from PipelineError:
    - message: Error description
    - stage: Pipeline stage (e.g., "embedding", "validation")
    - batch_id: Batch identifier for traceability
    - cause: Original exception

    Example:
        >>> raise CriticalPipelineError(
        ...     "Embedding count mismatch",
        ...     stage="embedding",
        ...     batch_id=42,
        ... )
    """

    pass


class PipelineValidation:
    """Validation utilities for pipeline operations."""

    # Memory safety threshold: raise error if processing more than 10k properties
    MAX_SAFE_PROPERTY_COUNT = 10_000
    # Warning threshold: warn if approaching limit
    WARNING_PROPERTY_COUNT = 8_000

    @staticmethod
    def validate_property_count(count: int) -> None:
        """
        Validate property count for memory safety.

        Logs a warning at 8,000 properties and raises an error at 10,000+.
        This prevents out-of-memory errors on large datasets.

        Args:
            count: Number of properties to process

        Raises:
            CriticalPipelineError: If property count exceeds MAX_SAFE_PROPERTY_COUNT
        """
        if count > PipelineValidation.MAX_SAFE_PROPERTY_COUNT:
            error_msg = (
                f"Property count ({count}) exceeds safe limit "
                f"({PipelineValidation.MAX_SAFE_PROPERTY_COUNT}). "
                "This will likely cause out-of-memory errors. "
                "Please process schemas in smaller batches."
            )
            logger.critical(error_msg)
            raise CriticalPipelineError(
                message=error_msg,
                stage="parsing",
            )
        if count > PipelineValidation.WARNING_PROPERTY_COUNT:
            logger.warning(
                f"Large property set detected ({count} properties). "
                f"Approaching memory limit (maximum: {PipelineValidation.MAX_SAFE_PROPERTY_COUNT}). "
                "Monitor memory usage carefully."
            )

    @staticmethod
    def validate_empty_batch(batch: list[Any], operation_name: str) -> None:
        """
        Validate that batch is non-empty.

        Args:
            batch: Batch to validate
            operation_name: Name of operation for error message

        Raises:
            ValueError: If batch is empty
        """
        if not batch:
            raise ValueError(f"Empty batch received in {operation_name}")


class PipelineNodeExecutor:
    """Handles common pipeline node execution patterns with standardized error handling."""

    @staticmethod
    async def execute_node(
        node_name: str,
        timeout_seconds: float,
        process_fn: Callable[[], Awaitable[dict[str, Any]]],
        input_validation_fn: Callable[[], tuple[bool, str]] | None = None,
    ) -> dict[str, Any]:
        """
        Execute a pipeline node with standard timeout, logging, and error handling.

        Args:
            node_name: Name for logging (e.g., "embed_batch")
            timeout_seconds: Operation timeout in seconds
            process_fn: Async function that returns state updates
            input_validation_fn: Optional validation function that returns (is_valid, error_msg)

        Returns:
            State updates dictionary with results or error information
        """
        start_time = time.time()
        logger.debug(f"Node {node_name} starting")

        updates: dict[str, Any] = {}

        # Input validation
        if input_validation_fn:
            is_valid, validation_msg = input_validation_fn()
            if not is_valid:
                logger.warning(f"{node_name}: {validation_msg}")
                return updates

        try:
            async with asyncio.timeout(timeout_seconds):
                updates = await process_fn()

        except TimeoutError:
            error_msg = f"{node_name} timeout after {timeout_seconds} seconds"
            logger.error(error_msg)
            updates["error"] = error_msg

        except CriticalPipelineError:
            raise

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in {node_name} node: {e}", exc_info=True)
            updates["error"] = error_msg

        elapsed = time.time() - start_time
        logger.debug(f"Node {node_name} completed in {elapsed:.2f}s")

        return updates


class SchemaMetadataBuilder:
    """Builds metadata for schema documents."""

    @staticmethod
    def extract_path_root(full_path: str) -> str:
        """
        Extract path root from full_path for prefix filtering.

        Args:
            full_path: Full property path (e.g., "vcs_project.field")

        Returns:
            Root path (e.g., "vcs_project")
        """
        return full_path.partition(".")[0] if full_path else ""

    @staticmethod
    def parse_source_path(source: str) -> Path:
        """
        Parse source string to extract file path.

        Args:
            source: Source string in format "file:path | JSON Pointer: /properties/field"

        Returns:
            Parsed Path object
        """
        source_file_path = source.split(" | ", maxsplit=1)[0]
        clean_path = source_file_path.removeprefix("file:")
        return Path(clean_path)

    @classmethod
    def build_metadata(
        cls, doc: SchemaDocument, methodology_extractor: Callable[[Path], str]
    ) -> dict[str, Any]:
        """
        Build complete metadata dictionary from schema document.

        Args:
            doc: Schema document to extract metadata from
            methodology_extractor: Function to extract methodology from path

        Returns:
            Metadata dictionary with all required fields
        """
        full_path = doc.content.get("full_path", "")
        source_path = cls.parse_source_path(doc.source)
        methodology = methodology_extractor(source_path)

        return {
            "name": doc.content.get("name", ""),
            "full_path": full_path,
            "type": doc.content.get("type", []),
            "description": doc.content.get("description", ""),
            "ancestors": doc.content.get("ancestors", []),
            "source": doc.source,
            "path_root": cls.extract_path_root(full_path),
            "methodology": methodology,
        }


class AsyncBatchProcessor:
    """Generic async batch processor with logging and error handling."""

    @staticmethod
    async def process_batches(
        items: list[T],
        batch_size: int,
        process_fn: Callable[[list[T], int, int], Awaitable[list[Any]]],
        operation_name: str,
    ) -> tuple[list[Any], list[tuple[int, str]]]:
        """
        Process items in batches with consistent logging and error tracking.

        Args:
            items: Items to process
            batch_size: Size of each batch
            process_fn: Async function to process each batch, returns results list
            operation_name: Name for logging (e.g., "embedding")

        Returns:
            Tuple of (successful_results, failed_batches) where failed_batches
            is list of (batch_number, error_message) tuples

        Raises:
            ValueError: If batch_size is not a positive integer
        """
        # Validate batch_size to prevent ZeroDivisionError and invalid range steps
        if not isinstance(batch_size, int) or batch_size <= 0:
            raise ValueError(
                f"Invalid batch_size={batch_size} for operation '{operation_name}'. "
                f"batch_size must be a positive integer."
            )

        total_batches = (len(items) + batch_size - 1) // batch_size
        all_results: list[Any] = []
        failed_batches: list[tuple[int, str]] = []

        for i in range(0, len(items), batch_size):
            batch = items[i : i + batch_size]
            batch_num = (i // batch_size) + 1

            logger.debug(f"{operation_name} batch {batch_num}/{total_batches} ({len(batch)} items)")

            try:
                results = await process_fn(batch, batch_num, total_batches)
                all_results.extend(results)
                logger.debug(f"Batch {batch_num}/{total_batches} completed: {len(results)} items")

            except CriticalPipelineError:
                raise

            except Exception as e:
                error_msg = f"{operation_name} error: {str(e)}"
                logger.error(
                    f"Error in {operation_name} batch {batch_num}/{total_batches}: {e}",
                    exc_info=True,
                )
                failed_batches.append((batch_num, error_msg))
                # Continue with next batch instead of failing entirely

        if failed_batches:
            logger.warning(
                f"{operation_name} completed with {len(failed_batches)} failed batches "
                f"out of {total_batches}"
            )

        return all_results, failed_batches


class PipelineResultBuilder(BaseModel):
    """
    Builds and manages pipeline result with Pydantic validation.

    This model provides type-safe result tracking for pipeline execution,
    ensuring all fields are properly validated and documented.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    batch_id: str = Field(description="Unique batch identifier")
    total_schema_files: int = Field(default=0, ge=0, description="Total schema files discovered")
    total_batches: int = Field(default=0, ge=0, description="Total batches to process")
    batches_completed: int = Field(default=0, ge=0, description="Batches completed successfully")
    batches_failed: int = Field(default=0, ge=0, description="Batches that failed")
    total_properties_parsed: int = Field(
        default=0, ge=0, description="Total properties extracted from schemas"
    )
    total_embeddings_generated: int = Field(
        default=0, ge=0, description="Total embeddings generated"
    )
    total_documents_upserted: int = Field(
        default=0, ge=0, description="Total documents upserted to vector store"
    )
    failed_files: list[tuple[Path | str, str]] = Field(
        default_factory=list, description="List of (file_path, error_message) tuples"
    )
    validation_passed: bool = Field(default=False, description="Whether validation passed")
    embedding_failures: list[tuple[int, str]] = Field(
        default_factory=list, description="List of (batch_num, error) for embedding failures"
    )
    upsert_failures: list[tuple[int, str]] = Field(
        default_factory=list, description="List of (batch_num, error) for upsert failures"
    )

    def set_schema_file_count(self, count: int) -> None:
        """Set total schema files discovered."""
        self.total_schema_files = count

    def mark_validation(self, passed: bool, failed_files: list[tuple[Path, str]]) -> None:
        """Mark validation status."""
        self.validation_passed = passed
        self.failed_files = failed_files

    def set_properties_parsed(self, count: int) -> None:
        """Set total properties parsed."""
        self.total_properties_parsed = count

    def set_batch_count(self, count: int) -> None:
        """Set total batches to process."""
        self.total_batches = count

    def add_error(self, file_or_path: Path | str, error: str) -> None:
        """Add failed file to results."""
        self.failed_files.append((file_or_path, error))

    def add_batch_result(
        self,
        embedded_count: int,
        upserted_count: int,
        has_error: bool,
        embedding_failures: list[tuple[int, str]] | None = None,
        upsert_failures: list[tuple[int, str]] | None = None,
    ) -> None:
        """
        Add batch processing results.

        Args:
            embedded_count: Number of embeddings generated
            upserted_count: Number of documents upserted
            has_error: Whether batch had errors
            embedding_failures: List of (batch_num, error) for embedding failures
            upsert_failures: List of (batch_num, error) for upsert failures
        """
        self.total_embeddings_generated += embedded_count
        self.total_documents_upserted += upserted_count

        if has_error:
            self.batches_failed += 1
        else:
            self.batches_completed += 1

        if embedding_failures:
            self.embedding_failures.extend(embedding_failures)

        if upsert_failures:
            self.upsert_failures.extend(upsert_failures)

    def get_result(self) -> dict[str, Any]:
        """
        Get final result dictionary with validated data.

        Returns:
            Dictionary representation of pipeline results
        """
        return self.model_dump()
