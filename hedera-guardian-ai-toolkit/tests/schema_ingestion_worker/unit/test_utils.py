"""Unit tests for schema_ingestion_worker utility classes."""

from pathlib import Path

import pytest

from schema_ingestion_worker.models import SchemaDocument
from schema_ingestion_worker.utils import (
    AsyncBatchProcessor,
    CriticalPipelineError,
    PipelineNodeExecutor,
    PipelineResultBuilder,
    PipelineValidation,
    SchemaMetadataBuilder,
)


class TestSchemaMetadataBuilder:
    """Test suite for SchemaMetadataBuilder utility class."""

    def test_extract_path_root(self):
        """Test extracting path root from full path."""
        assert SchemaMetadataBuilder.extract_path_root("vcs_project.field") == "vcs_project"
        assert SchemaMetadataBuilder.extract_path_root("schema.nested.field") == "schema"
        assert SchemaMetadataBuilder.extract_path_root("simple") == "simple"
        assert SchemaMetadataBuilder.extract_path_root("") == ""

    def test_parse_source_path(self):
        """Test parsing source string to extract file path."""
        source = "file:C:\\path\\to\\file.json | JSON Pointer: /properties/field"
        result = SchemaMetadataBuilder.parse_source_path(source)

        assert isinstance(result, Path)
        assert str(result) == "C:\\path\\to\\file.json"

    def test_parse_source_path_unix_style(self):
        """Test parsing Unix-style source paths."""
        source = "file:/home/user/schema.json | JSON Pointer: /properties/name"
        result = SchemaMetadataBuilder.parse_source_path(source)

        assert isinstance(result, Path)
        assert str(result) == "/home/user/schema.json" or str(result) == "\\home\\user\\schema.json"

    def test_build_metadata(self):
        """Test building complete metadata dictionary."""
        doc = SchemaDocument(
            embedding_input="Test property description",
            content={
                "name": "test_property",
                "full_path": "schema.test_property",
                "type": ["string"],
                "description": "A test property",
                "ancestors": ["schema"],
            },
            source="file:/path/to/schema.json | JSON Pointer: /properties/test_property",
        )

        def mock_extractor(path: Path) -> str:
            return "TEST_METHODOLOGY"

        metadata = SchemaMetadataBuilder.build_metadata(doc, mock_extractor)

        assert metadata["name"] == "test_property"
        assert metadata["full_path"] == "schema.test_property"
        assert metadata["type"] == ["string"]
        assert metadata["description"] == "A test property"
        assert metadata["ancestors"] == ["schema"]
        assert metadata["path_root"] == "schema"
        assert metadata["methodology"] == "TEST_METHODOLOGY"
        assert "source" in metadata


class TestAsyncBatchProcessor:
    """Test suite for AsyncBatchProcessor utility class."""

    @pytest.mark.asyncio
    async def test_process_batches_success(self):
        """Test successful batch processing."""
        items = list(range(10))
        batch_size = 3

        async def process_fn(batch, batch_num, total_batches):
            # Simulate processing and return results
            return [item * 2 for item in batch]

        results, failures = await AsyncBatchProcessor.process_batches(
            items=items,
            batch_size=batch_size,
            process_fn=process_fn,
            operation_name="test",
        )

        assert len(results) == 10
        assert results == [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
        assert len(failures) == 0

    @pytest.mark.asyncio
    async def test_process_batches_with_failures(self):
        """Test batch processing with some failures."""
        items = list(range(10))
        batch_size = 3

        async def process_fn(batch, batch_num, total_batches):
            # Fail on batch 2
            if batch_num == 2:
                raise ValueError(f"Batch {batch_num} failed")
            return [item * 2 for item in batch]

        results, failures = await AsyncBatchProcessor.process_batches(
            items=items,
            batch_size=batch_size,
            process_fn=process_fn,
            operation_name="test",
        )

        # Should have results from batches 1, 3, 4 (batches 0-2, 6-9)
        assert len(results) == 7  # 3 + 3 + 1 items from successful batches
        assert len(failures) == 1
        assert failures[0][0] == 2  # Batch number 2 failed
        assert "failed" in failures[0][1]

    @pytest.mark.asyncio
    async def test_process_batches_empty_list(self):
        """Test processing empty list."""
        items = []
        batch_size = 3

        async def process_fn(batch, batch_num, total_batches):
            return batch

        results, failures = await AsyncBatchProcessor.process_batches(
            items=items,
            batch_size=batch_size,
            process_fn=process_fn,
            operation_name="test",
        )

        assert len(results) == 0
        assert len(failures) == 0

    @pytest.mark.asyncio
    async def test_process_batches_single_batch(self):
        """Test processing list that fits in single batch."""
        items = [1, 2, 3]
        batch_size = 10

        async def process_fn(batch, batch_num, total_batches):
            assert batch_num == 1
            assert total_batches == 1
            return [item * 3 for item in batch]

        results, failures = await AsyncBatchProcessor.process_batches(
            items=items,
            batch_size=batch_size,
            process_fn=process_fn,
            operation_name="test",
        )

        assert results == [3, 6, 9]
        assert len(failures) == 0

    @pytest.mark.asyncio
    async def test_process_batches_zero_batch_size(self):
        """Test that zero batch_size raises ValueError."""
        items = [1, 2, 3]
        batch_size = 0

        async def process_fn(batch, batch_num, total_batches):
            return batch

        with pytest.raises(ValueError, match="Invalid batch_size=0"):
            await AsyncBatchProcessor.process_batches(
                items=items,
                batch_size=batch_size,
                process_fn=process_fn,
                operation_name="test_operation",
            )

    @pytest.mark.asyncio
    async def test_process_batches_negative_batch_size(self):
        """Test that negative batch_size raises ValueError."""
        items = [1, 2, 3]
        batch_size = -5

        async def process_fn(batch, batch_num, total_batches):
            return batch

        with pytest.raises(ValueError, match="Invalid batch_size=-5"):
            await AsyncBatchProcessor.process_batches(
                items=items,
                batch_size=batch_size,
                process_fn=process_fn,
                operation_name="test_operation",
            )

    @pytest.mark.asyncio
    async def test_process_batches_non_integer_batch_size(self):
        """Test that non-integer batch_size raises ValueError."""
        items = [1, 2, 3]
        batch_size = 2.5

        async def process_fn(batch, batch_num, total_batches):
            return batch

        with pytest.raises(ValueError, match="Invalid batch_size=2.5"):
            await AsyncBatchProcessor.process_batches(
                items=items,
                batch_size=batch_size,
                process_fn=process_fn,
                operation_name="test_operation",
            )


class TestPipelineResultBuilder:
    """Test suite for PipelineResultBuilder utility class."""

    def test_initialization(self):
        """Test result builder initialization."""
        builder = PipelineResultBuilder(batch_id="test-batch-id")
        result = builder.get_result()

        assert result["batch_id"] == "test-batch-id"
        assert result["total_schema_files"] == 0
        assert result["total_batches"] == 0
        assert result["batches_completed"] == 0
        assert result["batches_failed"] == 0
        assert result["total_properties_parsed"] == 0
        assert result["total_embeddings_generated"] == 0
        assert result["total_documents_upserted"] == 0
        assert result["failed_files"] == []
        assert result["validation_passed"] is False
        assert result["embedding_failures"] == []
        assert result["upsert_failures"] == []

    def test_set_schema_file_count(self):
        """Test setting schema file count."""
        builder = PipelineResultBuilder(batch_id="test-id")
        builder.set_schema_file_count(10)

        assert builder.get_result()["total_schema_files"] == 10

    def test_mark_validation(self):
        """Test marking validation status."""
        builder = PipelineResultBuilder(batch_id="test-id")
        failed_files = [(Path("test.json"), "error")]

        builder.mark_validation(False, failed_files)
        result = builder.get_result()

        assert result["validation_passed"] is False
        assert result["failed_files"] == failed_files

    def test_mark_validation_success(self):
        """Test marking successful validation."""
        builder = PipelineResultBuilder(batch_id="test-id")
        builder.mark_validation(True, [])

        assert builder.get_result()["validation_passed"] is True
        assert builder.get_result()["failed_files"] == []

    def test_set_properties_parsed(self):
        """Test setting properties parsed count."""
        builder = PipelineResultBuilder(batch_id="test-id")
        builder.set_properties_parsed(100)

        assert builder.get_result()["total_properties_parsed"] == 100

    def test_set_batch_count(self):
        """Test setting total batch count."""
        builder = PipelineResultBuilder(batch_id="test-id")
        builder.set_batch_count(5)

        assert builder.get_result()["total_batches"] == 5

    def test_add_error(self):
        """Test adding error to failed files."""
        builder = PipelineResultBuilder(batch_id="test-id")
        builder.add_error(Path("schema.json"), "Parse error")

        failed_files = builder.get_result()["failed_files"]
        assert len(failed_files) == 1
        assert failed_files[0][0] == Path("schema.json")
        assert failed_files[0][1] == "Parse error"

    def test_add_batch_result_success(self):
        """Test adding successful batch result."""
        builder = PipelineResultBuilder(batch_id="test-id")
        builder.add_batch_result(embedded_count=10, upserted_count=10, has_error=False)

        result = builder.get_result()
        assert result["total_embeddings_generated"] == 10
        assert result["total_documents_upserted"] == 10
        assert result["batches_completed"] == 1
        assert result["batches_failed"] == 0

    def test_add_batch_result_failure(self):
        """Test adding failed batch result."""
        builder = PipelineResultBuilder(batch_id="test-id")
        builder.add_batch_result(embedded_count=5, upserted_count=0, has_error=True)

        result = builder.get_result()
        assert result["total_embeddings_generated"] == 5
        assert result["total_documents_upserted"] == 0
        assert result["batches_completed"] == 0
        assert result["batches_failed"] == 1

    def test_add_batch_result_with_failures(self):
        """Test adding batch result with failure tracking."""
        builder = PipelineResultBuilder(batch_id="test-id")
        embedding_failures = [(1, "embedding error")]
        upsert_failures = [(2, "upsert error")]

        builder.add_batch_result(
            embedded_count=8,
            upserted_count=5,
            has_error=False,
            embedding_failures=embedding_failures,
            upsert_failures=upsert_failures,
        )

        result = builder.get_result()
        assert result["embedding_failures"] == embedding_failures
        assert result["upsert_failures"] == upsert_failures

    def test_multiple_batch_results(self):
        """Test accumulating multiple batch results."""
        builder = PipelineResultBuilder(batch_id="test-id")

        # Add first batch (success)
        builder.add_batch_result(embedded_count=10, upserted_count=10, has_error=False)

        # Add second batch (partial failure)
        builder.add_batch_result(embedded_count=8, upserted_count=5, has_error=True)

        # Add third batch (success)
        builder.add_batch_result(embedded_count=10, upserted_count=10, has_error=False)

        result = builder.get_result()
        assert result["total_embeddings_generated"] == 28
        assert result["total_documents_upserted"] == 25
        assert result["batches_completed"] == 2
        assert result["batches_failed"] == 1

    def test_get_result_returns_copy(self):
        """Test that get_result returns consistent validated data."""
        builder = PipelineResultBuilder(batch_id="test-id")
        builder.set_schema_file_count(5)

        result1 = builder.get_result()
        result2 = builder.get_result()

        # Results should be equal in content
        assert result1 == result2
        # With Pydantic, model_dump() creates new dict each time (safer than shared reference)
        assert result1 is not result2


class TestPipelineNodeExecutor:
    """Test suite for PipelineNodeExecutor utility class."""

    @pytest.mark.asyncio
    async def test_execute_node_success(self):
        """Test successful node execution."""

        async def process_fn():
            return {"result": "success", "count": 42}

        result = await PipelineNodeExecutor.execute_node(
            node_name="test_node",
            timeout_seconds=10,
            process_fn=process_fn,
        )

        assert result["result"] == "success"
        assert result["count"] == 42

    @pytest.mark.asyncio
    async def test_execute_node_with_validation(self):
        """Test node execution with input validation."""

        async def process_fn():
            return {"result": "success"}

        def validation_fn():
            return True, ""

        result = await PipelineNodeExecutor.execute_node(
            node_name="test_node",
            timeout_seconds=10,
            process_fn=process_fn,
            input_validation_fn=validation_fn,
        )

        assert result["result"] == "success"

    @pytest.mark.asyncio
    async def test_execute_node_validation_failure(self):
        """Test node execution with validation failure."""

        async def process_fn():
            return {"result": "success"}

        def validation_fn():
            return False, "Validation failed"

        result = await PipelineNodeExecutor.execute_node(
            node_name="test_node",
            timeout_seconds=10,
            process_fn=process_fn,
            input_validation_fn=validation_fn,
        )

        # Should return empty dict on validation failure
        assert result == {}

    @pytest.mark.asyncio
    async def test_execute_node_timeout(self):
        """Test node execution timeout handling."""
        import asyncio

        async def process_fn():
            await asyncio.sleep(5)
            return {"result": "success"}

        result = await PipelineNodeExecutor.execute_node(
            node_name="test_node",
            timeout_seconds=0.1,
            process_fn=process_fn,
        )

        assert "error" in result
        assert "timeout" in result["error"].lower()

    @pytest.mark.asyncio
    async def test_execute_node_exception(self):
        """Test node execution exception handling."""

        async def process_fn():
            raise ValueError("Test error")

        result = await PipelineNodeExecutor.execute_node(
            node_name="test_node",
            timeout_seconds=10,
            process_fn=process_fn,
        )

        assert "error" in result
        assert "Test error" in result["error"]


class TestPipelineValidation:
    """Test suite for PipelineValidation utility class."""

    def test_validate_property_count_small(self):
        """Test validation passes for small property counts."""
        # Should not raise any exception
        PipelineValidation.validate_property_count(100)
        PipelineValidation.validate_property_count(5000)

    def test_validate_property_count_large(self):
        """Test validation raises error for property counts exceeding limit."""
        # Should raise CriticalPipelineError for counts > MAX_SAFE_PROPERTY_COUNT
        with pytest.raises(CriticalPipelineError, match="exceeds safe limit"):
            PipelineValidation.validate_property_count(15000)

    def test_validate_property_count_warning_threshold(self):
        """Test validation warns for property counts approaching limit."""
        # Should log warning but not raise exception for counts > WARNING_PROPERTY_COUNT
        PipelineValidation.validate_property_count(9000)  # Above warning threshold, below limit

    def test_validate_empty_batch_valid(self):
        """Test validation passes for non-empty batch."""
        batch = [1, 2, 3]
        # Should not raise any exception
        PipelineValidation.validate_empty_batch(batch, "test_operation")

    def test_validate_empty_batch_invalid(self):
        """Test validation fails for empty batch."""
        batch = []
        with pytest.raises(ValueError, match="Empty batch"):
            PipelineValidation.validate_empty_batch(batch, "test_operation")


class TestPipelineError:
    """Test suite for PipelineError base exception class."""

    def test_basic_instantiation(self):
        """Test PipelineError can be instantiated with just a message."""
        from schema_ingestion_worker.utils import PipelineError

        error = PipelineError("Test error")
        assert str(error) == "Test error"
        assert error.message == "Test error"
        assert error.stage is None
        assert error.batch_id is None
        assert error.cause is None

    def test_full_context_instantiation(self):
        """Test PipelineError with full structured context."""
        from schema_ingestion_worker.utils import PipelineError

        cause = ValueError("Original error")
        error = PipelineError(
            message="Processing failed",
            stage="embedding",
            batch_id=42,
            cause=cause,
        )

        assert error.message == "Processing failed"
        assert error.stage == "embedding"
        assert error.batch_id == 42
        assert error.cause is cause

    def test_str_with_full_context(self):
        """Test string representation with all context fields."""
        from schema_ingestion_worker.utils import PipelineError

        cause = ValueError("Original error")
        error = PipelineError(
            message="Processing failed",
            stage="embedding",
            batch_id=42,
            cause=cause,
        )

        error_str = str(error)
        assert "Processing failed" in error_str
        assert "stage=embedding" in error_str
        assert "batch_id=42" in error_str
        assert "ValueError" in error_str

    def test_to_dict(self):
        """Test dictionary serialization."""
        from schema_ingestion_worker.utils import PipelineError

        cause = ValueError("Original error")
        error = PipelineError(
            message="Processing failed",
            stage="embedding",
            batch_id=42,
            cause=cause,
        )

        error_dict = error.to_dict()
        assert error_dict["error_type"] == "PipelineError"
        assert error_dict["message"] == "Processing failed"
        assert error_dict["stage"] == "embedding"
        assert error_dict["batch_id"] == 42
        assert "Original error" in error_dict["cause"]


class TestCriticalPipelineError:
    """Test suite for CriticalPipelineError exception class."""

    def test_critical_error_basic_instantiation(self):
        """Test CriticalPipelineError can be instantiated with just message."""
        error = CriticalPipelineError(message="Critical failure")
        assert "Critical failure" in str(error)
        assert error.message == "Critical failure"

    def test_critical_error_with_context(self):
        """Test CriticalPipelineError with structured context."""
        error = CriticalPipelineError(
            message="Embedding mismatch",
            stage="embedding",
            batch_id=5,
        )

        assert error.message == "Embedding mismatch"
        assert error.stage == "embedding"
        assert error.batch_id == 5

        error_str = str(error)
        assert "Embedding mismatch" in error_str
        assert "stage=embedding" in error_str
        assert "batch_id=5" in error_str

    def test_critical_error_inheritance(self):
        """Test CriticalPipelineError inherits from PipelineError."""
        from schema_ingestion_worker.utils import PipelineError

        error = CriticalPipelineError(message="Test")
        assert isinstance(error, PipelineError)
        assert isinstance(error, Exception)

    def test_critical_error_can_be_raised(self):
        """Test CriticalPipelineError can be raised and caught."""
        with pytest.raises(CriticalPipelineError):
            raise CriticalPipelineError(message="Test error")

    def test_critical_error_to_dict(self):
        """Test CriticalPipelineError dictionary serialization."""
        error = CriticalPipelineError(
            message="Critical failure",
            stage="validation",
            batch_id="batch-123",
        )

        error_dict = error.to_dict()
        assert error_dict["error_type"] == "CriticalPipelineError"
        assert error_dict["message"] == "Critical failure"
        assert error_dict["stage"] == "validation"
        assert error_dict["batch_id"] == "batch-123"
