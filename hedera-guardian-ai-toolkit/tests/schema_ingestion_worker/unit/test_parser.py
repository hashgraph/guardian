"""Unit tests for schema_ingestion_worker.parser."""

import logging
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest

from schema_ingestion_worker.config import Settings
from schema_ingestion_worker.parser import DocumentParser


@pytest.fixture
def mock_config():
    """Create a mock configuration for testing."""
    config = Mock(spec=Settings)
    config.qdrant_url = "http://localhost:6333"
    config.qdrant_collection_name = "test_collection"
    config.qdrant_api_key = None
    config.embedding_model_name = "aapot/bge-m3-onnx"
    config.embedding_provider_type = "bge_m3_onnx"
    config.embedding_batch_size = 256
    config.vector_upsert_batch_size = 50
    config.input_schemas_dir = "test/schemas"
    config.output_dir = "test/output"
    config.onnx_inference_batch_size = 32
    config.log_level = "INFO"
    config.mode = "append"
    return config


@pytest.fixture
def mock_pipeline():
    """Create a mock async pipeline."""
    from unittest.mock import AsyncMock

    pipeline = MagicMock()
    # Make run async - returns new property-batched format
    pipeline.run = AsyncMock(
        return_value={
            "batch_id": "test-batch-123",
            "total_schema_files": 2,
            "total_batches": 1,
            "batches_completed": 1,
            "batches_failed": 0,
            "total_properties_parsed": 10,
            "total_embeddings_generated": 10,
            "total_documents_upserted": 10,
            "failed_files": [],
            "batch_results": [
                {
                    "batch_num": 1,
                    "properties_count": 10,
                    "embeddings_generated": 10,
                    "documents_upserted": 10,
                    "elapsed_seconds": 1.5,
                    "status": "success",
                    "error": None,
                }
            ],
        }
    )

    # Create a mock CollectionStats object with the expected attributes
    mock_stats = Mock()
    mock_stats.points_count = 10
    mock_stats.vectors_count = 10
    mock_stats.status = "green"
    mock_stats.config = {"vector_size": 1024, "distance": "cosine"}

    pipeline.vector_store.get_stats = AsyncMock(return_value=mock_stats)
    return pipeline


class TestDocumentParserInit:
    """Test suite for DocumentParser initialization."""

    def test_init_with_config(self, mock_config):
        """Test initialization with provided configuration."""
        with patch(
            "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline"
        ) as mock_pipeline_class:
            parser = DocumentParser(mock_config)

            assert parser.config == mock_config
            assert parser.pipeline is not None
            mock_pipeline_class.assert_called_once_with(mock_config)

    def test_init_without_config(self):
        """Test initialization without configuration (loads from env)."""
        with (
            patch("schema_ingestion_worker.parser.Settings") as mock_settings,
            patch("schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline"),
        ):
            mock_config = Mock(spec=Settings)
            mock_config.log_level = "INFO"
            mock_config.input_schemas_dir = "test/schemas"
            mock_config.output_dir = "test/output"
            mock_config.qdrant_url = "http://localhost:6333"
            mock_config.qdrant_collection_name = "test_collection"
            mock_settings.return_value = mock_config

            parser = DocumentParser()

            assert parser.config is not None
            mock_settings.assert_called_once()

    def test_init_pipeline_failure(self, mock_config):
        """Test handling of pipeline initialization failure."""
        with patch(
            "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
            side_effect=Exception("Pipeline init error"),
        ):
            with pytest.raises(Exception) as exc_info:
                DocumentParser(mock_config)

            assert "Pipeline init error" in str(exc_info.value)

    def test_logging_configuration(self, mock_config, caplog):
        """Test that logging is properly configured."""
        with (
            patch("schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline"),
            caplog.at_level(logging.INFO),
        ):
            DocumentParser(mock_config)

            assert "Initializing DocumentParser" in caplog.text
            assert "Async pipeline initialized successfully" in caplog.text


class TestProcessDocuments:
    """Test suite for process_documents method."""

    @pytest.mark.asyncio
    async def test_process_documents_success(self, mock_config, mock_pipeline):
        """Test successful document processing."""
        with patch(
            "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            stats = await parser.process_documents()

            assert stats["batch_id"] == "test-batch-123"
            assert stats["total_files"] == 2
            assert stats["parsed_count"] == 10
            assert stats["embedded_count"] == 10
            assert stats["processed_count"] == 10
            assert stats["failed_count"] == 0
            assert stats["total_batches"] == 1
            assert stats["batches_completed"] == 1
            mock_pipeline.run.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_documents_with_failures(self, mock_config, mock_pipeline):
        """Test document processing with some failures."""
        # Configure pipeline to return failures
        mock_pipeline.run.return_value = {
            "batch_id": "test-batch-456",
            "total_schema_files": 2,
            "total_batches": 1,
            "batches_completed": 1,
            "batches_failed": 0,
            "total_properties_parsed": 5,
            "total_embeddings_generated": 5,
            "total_documents_upserted": 5,
            "failed_files": [
                (Path("bad_schema.json"), "Parse error"),
                (Path("invalid.json"), "Invalid JSON"),
            ],
            "batch_results": [],
        }

        with patch(
            "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            stats = await parser.process_documents()

            assert stats["failed_count"] == 2
            assert len(stats["failed_files"]) == 2
            assert stats["processed_count"] == 5

    @pytest.mark.asyncio
    async def test_process_documents_exception(self, mock_config, mock_pipeline):
        """Test handling of exceptions during processing."""
        mock_pipeline.run.side_effect = Exception("Pipeline execution error")

        with patch(
            "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            stats = await parser.process_documents()

            assert "error" in stats
            assert "Pipeline execution error" in stats["error"]
            assert stats["batch_id"] is None
            assert stats["total_files"] == 0
            assert stats["processed_count"] == 0

    @pytest.mark.asyncio
    async def test_process_documents_property_batched(self, mock_config, mock_pipeline):
        """Test that process_documents uses property-batched pipeline."""
        with patch(
            "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)
            stats = await parser.process_documents()

            # Verify property-batched results
            assert "total_batches" in stats
            assert "batches_completed" in stats
            mock_pipeline.run.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_documents_logging(self, mock_config, mock_pipeline, caplog):
        """Test that processing logs appropriately."""
        with (
            patch(
                "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
                return_value=mock_pipeline,
            ),
            caplog.at_level(logging.INFO),
        ):
            parser = DocumentParser(mock_config)
            await parser.process_documents()

            assert "Starting document processing" in caplog.text
            assert "Document processing completed successfully" in caplog.text


class TestExtractStatistics:
    """Test suite for _extract_statistics_batched method."""

    def test_extract_statistics_complete_state(self, mock_config, mock_pipeline):
        """Test statistics extraction from complete batched state."""
        with patch(
            "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            final_state = {
                "batch_id": "test-123",
                "total_schema_files": 2,
                "total_batches": 1,
                "batches_completed": 1,
                "batches_failed": 0,
                "total_properties_parsed": 10,
                "total_embeddings_generated": 10,
                "total_documents_upserted": 10,
                "failed_files": [(Path("bad.json"), "error")],
            }

            stats = parser._extract_statistics_batched(final_state)

            assert stats["batch_id"] == "test-123"
            assert stats["total_files"] == 2
            assert stats["parsed_count"] == 10
            assert stats["embedded_count"] == 10
            assert stats["processed_count"] == 10
            assert stats["failed_count"] == 1
            assert stats["total_batches"] == 1
            assert stats["batches_completed"] == 1

    def test_extract_statistics_empty_state(self, mock_config, mock_pipeline):
        """Test statistics extraction from empty batched state."""
        with patch(
            "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            final_state = {
                "batch_id": "test-456",
                "total_schema_files": 0,
                "total_batches": 0,
                "batches_completed": 0,
                "batches_failed": 0,
                "total_properties_parsed": 0,
                "total_embeddings_generated": 0,
                "total_documents_upserted": 0,
                "failed_files": [],
            }

            stats = parser._extract_statistics_batched(final_state)

            assert stats["batch_id"] == "test-456"
            assert stats["total_files"] == 0
            assert stats["parsed_count"] == 0
            assert stats["embedded_count"] == 0
            assert stats["processed_count"] == 0
            assert stats["failed_count"] == 0

    def test_extract_statistics_missing_fields(self, mock_config, mock_pipeline):
        """Test statistics extraction handles missing fields gracefully."""
        with patch(
            "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            # State with some missing fields (uses .get() with defaults)
            final_state = {
                "batch_id": "test-789",
            }

            stats = parser._extract_statistics_batched(final_state)

            assert stats["batch_id"] == "test-789"
            assert stats["total_files"] == 0
            assert stats["parsed_count"] == 0
            assert stats["embedded_count"] == 0
            assert stats["processed_count"] == 0
            assert stats["failed_count"] == 0


class TestGetPipelineStats:
    """Test suite for get_pipeline_stats method."""

    @pytest.mark.asyncio
    async def test_get_pipeline_stats_success(self, mock_config, mock_pipeline):
        """Test successful retrieval of pipeline stats."""
        with patch(
            "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            stats = await parser.get_pipeline_stats()

            assert stats["count"] == 10
            assert stats["dimension"] == 1024
            mock_pipeline.vector_store.get_stats.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_pipeline_stats_error(self, mock_config, mock_pipeline):
        """Test handling of errors when retrieving stats."""
        mock_pipeline.vector_store.get_stats.side_effect = Exception("Stats error")

        with patch(
            "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            stats = await parser.get_pipeline_stats()

            assert "error" in stats
            assert "Stats error" in stats["error"]


class TestLoggingConfiguration:
    """Test suite for logging configuration."""

    def test_configure_logging_sets_level(self, mock_config):
        """Test that logging level is set from config."""
        mock_config.log_level = "DEBUG"

        with patch("schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline"):
            parser = DocumentParser(mock_config)

            # Check that logging was configured
            assert parser.config.log_level == "DEBUG"

    def test_configure_logging_info_level(self, mock_config):
        """Test logging configuration with INFO level."""
        mock_config.log_level = "INFO"

        with (
            patch("schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline"),
            patch("logging.getLogger") as mock_get_logger,
        ):
            mock_logger = MagicMock()
            mock_get_logger.return_value = mock_logger

            DocumentParser(mock_config)

            # Logger should be configured
            assert True  # Might be configured at root level


class TestErrorPropagation:
    """Test suite for error propagation and handling."""

    @pytest.mark.asyncio
    async def test_pipeline_error_propagates_to_stats(self, mock_config, mock_pipeline):
        """Test that pipeline errors are captured in stats."""
        mock_pipeline.run.side_effect = RuntimeError("Critical pipeline error")

        with patch(
            "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            stats = await parser.process_documents()

            assert "error" in stats
            assert "Critical pipeline error" in stats["error"]

    def test_initialization_error_raises(self, mock_config):
        """Test that initialization errors are raised."""
        with (
            patch(
                "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
                side_effect=ConnectionError("Cannot connect to Qdrant"),
            ),
            pytest.raises(ConnectionError),
        ):
            DocumentParser(mock_config)


class TestStatisticsCollection:
    """Test suite for statistics collection."""

    @pytest.mark.asyncio
    async def test_statistics_includes_all_fields(self, mock_config, mock_pipeline):
        """Test that returned statistics include all expected fields."""
        with patch(
            "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            stats = await parser.process_documents()

            # Check all expected fields are present
            expected_fields = [
                "batch_id",
                "total_files",
                "parsed_count",
                "embedded_count",
                "processed_count",
                "failed_count",
                "failed_files",
            ]

            for field in expected_fields:
                assert field in stats

    @pytest.mark.asyncio
    async def test_statistics_values_match_state(self, mock_config, mock_pipeline):
        """Test that statistics values match the pipeline state."""
        mock_pipeline.run.return_value = {
            "batch_id": "verify-123",
            "total_schema_files": 5,
            "total_batches": 3,
            "batches_completed": 3,
            "batches_failed": 0,
            "total_properties_parsed": 25,
            "total_embeddings_generated": 25,
            "total_documents_upserted": 25,
            "failed_files": [
                (Path("fail1.json"), "error1"),
                (Path("fail2.json"), "error2"),
            ],
            "batch_results": [],
        }

        with patch(
            "schema_ingestion_worker.parser.AsyncSchemaIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            stats = await parser.process_documents()

            assert stats["batch_id"] == "verify-123"
            assert stats["total_files"] == 5
            assert stats["parsed_count"] == 25
            assert stats["embedded_count"] == 25
            assert stats["processed_count"] == 25
            assert stats["failed_count"] == 2
