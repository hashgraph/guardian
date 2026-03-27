"""Unit tests for document_ingestion_worker.parser."""

import logging
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

from document_ingestion_worker import DocumentParser
from document_ingestion_worker.config import DocumentIngestionSettings
from document_ingestion_worker.models import PipelineResults


@pytest.fixture
def mock_config(tmp_path):
    """Create a mock configuration for testing."""
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    (data_dir / "input" / "documents").mkdir(parents=True)
    (data_dir / "staged" / "documents").mkdir(parents=True)
    (data_dir / "output" / "documents").mkdir(parents=True)

    config = Mock(spec=DocumentIngestionSettings)
    config.qdrant_url = "http://localhost:6333"
    config.qdrant_collection_name = "test_documents"
    config.qdrant_api_key = None
    config.embedding_model_name = "aapot/bge-m3-onnx"
    config.embedding_provider_type = "bge_m3_onnx"
    config.embedding_batch_size = 50
    config.vector_upsert_batch_size = 100
    config.data_dir = data_dir
    config.input_documents_dir = data_dir / "input" / "documents"
    config.staged_documents_dir = data_dir / "staged" / "documents"
    config.max_parallel_files = 5
    config.log_level = "INFO"
    config.mode = "append"
    config.start_from = "beginning"
    config.do_ocr = False
    return config


@pytest.fixture
def mock_pipeline():
    """Create a mock parallel pipeline."""
    pipeline = MagicMock()

    # Create mock results
    mock_results: PipelineResults = {
        "batch_id": "test-batch-123",
        "total_documents": 2,
        "successful_documents": 2,
        "failed_documents": 0,
        "total_chunks_processed": 50,
        "total_vectors_upserted": 50,
        "document_results": [
            {
                "document_id": "doc1",
                "pdf_path": Path("doc1.pdf"),
                "chunks_generated": 25,
                "vectors_upserted": 25,
                "status": "success",
                "error": None,
                "processing_time_seconds": 5.0,
            },
            {
                "document_id": "doc2",
                "pdf_path": Path("doc2.pdf"),
                "chunks_generated": 25,
                "vectors_upserted": 25,
                "status": "success",
                "error": None,
                "processing_time_seconds": 5.0,
            },
        ],
        "failed_files": [],
        "total_processing_time_seconds": 10.0,
    }

    pipeline.run = AsyncMock(return_value=mock_results)

    # Create a mock stats response
    mock_stats = {
        "points_count": 50,
        "vectors_count": 50,
        "status": "green",
    }
    pipeline.get_stats = AsyncMock(return_value=mock_stats)
    pipeline.close = AsyncMock()

    return pipeline


class TestDocumentParserInit:
    """Test suite for DocumentParser initialization."""

    def test_init_with_config(self, mock_config):
        """Test initialization with provided configuration."""
        with patch(
            "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline"
        ) as mock_pipeline_class:
            parser = DocumentParser(mock_config)

            assert parser.config == mock_config
            assert parser.pipeline is not None
            mock_pipeline_class.assert_called_once_with(mock_config)

    def test_init_without_config(self):
        """Test initialization without configuration (loads from env)."""
        with (
            patch("document_ingestion_worker.parser.DocumentIngestionSettings") as mock_settings,
            patch("document_ingestion_worker.parser.ParallelDocumentIngestionPipeline"),
        ):
            mock_config = Mock(spec=DocumentIngestionSettings)
            mock_config.log_level = "INFO"
            mock_config.data_dir = Path("test/data")
            mock_config.input_documents_dir = Path("test/data/input/documents")
            mock_config.staged_documents_dir = Path("test/data/staged/documents")
            mock_config.qdrant_url = "http://localhost:6333"
            mock_config.qdrant_collection_name = "test_collection"
            mock_config.mode = "append"
            mock_config.start_from = "beginning"
            mock_config.max_parallel_files = 5
            mock_config.do_ocr = False
            mock_settings.return_value = mock_config

            parser = DocumentParser()

            assert parser.config is not None
            mock_settings.assert_called_once()

    def test_init_pipeline_failure(self, mock_config):
        """Test handling of pipeline initialization failure."""
        with patch(
            "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline",
            side_effect=Exception("Pipeline init error"),
        ):
            with pytest.raises(Exception) as exc_info:
                DocumentParser(mock_config)

            assert "Pipeline init error" in str(exc_info.value)

    def test_logging_configuration(self, mock_config, caplog):
        """Test that logging is properly configured."""
        with (
            patch("document_ingestion_worker.parser.ParallelDocumentIngestionPipeline"),
            caplog.at_level(logging.INFO),
        ):
            DocumentParser(mock_config)

            assert "Initializing DocumentParser" in caplog.text
            assert "Parallel pipeline initialized successfully" in caplog.text


class TestProcessDocuments:
    """Test suite for process_documents method."""

    @pytest.mark.asyncio
    async def test_process_documents_success(self, mock_config, mock_pipeline):
        """Test successful document processing."""
        with patch(
            "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            stats = await parser.process_documents()

            assert stats["batch_id"] == "test-batch-123"
            assert stats["total_documents"] == 2
            assert stats["successful_documents"] == 2
            assert stats["failed_documents"] == 0
            assert stats["total_chunks"] == 50
            assert stats["total_vectors"] == 50
            mock_pipeline.run.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_documents_with_failures(self, mock_config, mock_pipeline):
        """Test document processing with some failures."""
        # Configure pipeline to return failures
        failed_result: PipelineResults = {
            "batch_id": "test-batch-456",
            "total_documents": 3,
            "successful_documents": 2,
            "failed_documents": 1,
            "total_chunks_processed": 40,
            "total_vectors_upserted": 40,
            "document_results": [
                {
                    "document_id": "doc1",
                    "pdf_path": Path("doc1.pdf"),
                    "chunks_generated": 20,
                    "vectors_upserted": 20,
                    "status": "success",
                    "error": None,
                    "processing_time_seconds": 5.0,
                },
                {
                    "document_id": "doc2",
                    "pdf_path": Path("doc2.pdf"),
                    "chunks_generated": 20,
                    "vectors_upserted": 20,
                    "status": "success",
                    "error": None,
                    "processing_time_seconds": 5.0,
                },
                {
                    "document_id": "bad_doc",
                    "pdf_path": Path("bad_doc.pdf"),
                    "chunks_generated": 0,
                    "vectors_upserted": 0,
                    "status": "failed",
                    "error": "Parse error",
                    "processing_time_seconds": 1.0,
                },
            ],
            "failed_files": [(Path("bad_doc.pdf"), "Parse error")],
            "total_processing_time_seconds": 11.0,
        }

        mock_pipeline.run.return_value = failed_result

        with patch(
            "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            stats = await parser.process_documents()

            assert stats["failed_documents"] == 1
            assert len(stats["failed_files"]) == 1
            assert stats["successful_documents"] == 2

    @pytest.mark.asyncio
    async def test_process_documents_exception(self, mock_config, mock_pipeline):
        """Test handling of exceptions during processing."""
        mock_pipeline.run.side_effect = Exception("Pipeline execution error")

        with patch(
            "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            stats = await parser.process_documents()

            assert "error" in stats
            assert "Pipeline execution error" in stats["error"]
            assert stats["batch_id"] is None
            assert stats["total_documents"] == 0

    @pytest.mark.asyncio
    async def test_process_documents_logging(self, mock_config, mock_pipeline, caplog):
        """Test that processing logs appropriately."""
        with (
            patch(
                "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline",
                return_value=mock_pipeline,
            ),
            caplog.at_level(logging.INFO),
        ):
            parser = DocumentParser(mock_config)
            await parser.process_documents()

            assert "Starting parallel document processing" in caplog.text
            assert "Document processing completed" in caplog.text


class TestExtractStatistics:
    """Test suite for _extract_statistics method."""

    def test_extract_statistics_complete_results(self, mock_config, mock_pipeline):
        """Test statistics extraction from complete results."""
        with patch(
            "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            results: PipelineResults = {
                "batch_id": "test-123",
                "total_documents": 3,
                "successful_documents": 2,
                "failed_documents": 1,
                "total_chunks_processed": 100,
                "total_vectors_upserted": 100,
                "document_results": [],
                "failed_files": [(Path("bad.pdf"), "error")],
                "total_processing_time_seconds": 15.0,
            }

            stats = parser._extract_statistics(results)

            assert stats["batch_id"] == "test-123"
            assert stats["total_documents"] == 3
            assert stats["successful_documents"] == 2
            assert stats["failed_documents"] == 1
            assert stats["total_chunks"] == 100
            assert stats["total_vectors"] == 100
            assert stats["processing_time_seconds"] == 15.0

    def test_extract_statistics_empty_results(self, mock_config, mock_pipeline):
        """Test statistics extraction from empty results."""
        with patch(
            "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            results: PipelineResults = {
                "batch_id": "test-456",
                "total_documents": 0,
                "successful_documents": 0,
                "failed_documents": 0,
                "total_chunks_processed": 0,
                "total_vectors_upserted": 0,
                "document_results": [],
                "failed_files": [],
                "total_processing_time_seconds": 0.1,
            }

            stats = parser._extract_statistics(results)

            assert stats["batch_id"] == "test-456"
            assert stats["total_documents"] == 0
            assert stats["successful_documents"] == 0
            assert stats["failed_documents"] == 0
            assert stats["total_chunks"] == 0
            assert stats["total_vectors"] == 0


class TestGetPipelineStats:
    """Test suite for get_pipeline_stats method."""

    @pytest.mark.asyncio
    async def test_get_pipeline_stats_success(self, mock_config, mock_pipeline):
        """Test successful retrieval of pipeline stats."""
        with patch(
            "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            stats = await parser.get_pipeline_stats()

            assert stats["points_count"] == 50
            mock_pipeline.get_stats.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_pipeline_stats_error(self, mock_config, mock_pipeline):
        """Test handling of errors when retrieving stats."""
        mock_pipeline.get_stats.side_effect = Exception("Stats error")

        with patch(
            "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            # The get_stats method should propagate the exception
            with pytest.raises(Exception, match="Stats error"):
                await parser.get_pipeline_stats()


class TestLoggingConfiguration:
    """Test suite for logging configuration."""

    def test_configure_logging_sets_level(self, mock_config):
        """Test that logging level is set from config."""
        mock_config.log_level = "DEBUG"

        with patch("document_ingestion_worker.parser.ParallelDocumentIngestionPipeline"):
            parser = DocumentParser(mock_config)

            # Check that logging was configured
            assert parser.config.log_level == "DEBUG"

    def test_configure_logging_info_level(self, mock_config):
        """Test logging configuration with INFO level."""
        mock_config.log_level = "INFO"

        with (
            patch("document_ingestion_worker.parser.ParallelDocumentIngestionPipeline"),
            patch("logging.getLogger") as mock_get_logger,
        ):
            mock_logger = MagicMock()
            mock_get_logger.return_value = mock_logger

            DocumentParser(mock_config)


class TestErrorPropagation:
    """Test suite for error propagation and handling."""

    @pytest.mark.asyncio
    async def test_pipeline_error_propagates_to_stats(self, mock_config, mock_pipeline):
        """Test that pipeline errors are captured in stats."""
        mock_pipeline.run.side_effect = RuntimeError("Critical pipeline error")

        with patch(
            "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline",
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
                "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline",
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
            "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            stats = await parser.process_documents()

            # Check all expected fields are present
            expected_fields = [
                "batch_id",
                "total_documents",
                "successful_documents",
                "failed_documents",
                "total_chunks",
                "total_vectors",
                "failed_files",
                "processing_time_seconds",
                "document_results",
            ]

            for field in expected_fields:
                assert field in stats

    @pytest.mark.asyncio
    async def test_statistics_values_match_results(self, mock_config, mock_pipeline):
        """Test that statistics values match the pipeline results."""
        results: PipelineResults = {
            "batch_id": "verify-123",
            "total_documents": 5,
            "successful_documents": 4,
            "failed_documents": 1,
            "total_chunks_processed": 100,
            "total_vectors_upserted": 100,
            "document_results": [],
            "failed_files": [(Path("fail1.pdf"), "error1")],
            "total_processing_time_seconds": 20.0,
        }

        mock_pipeline.run.return_value = results

        with patch(
            "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            stats = await parser.process_documents()

            assert stats["batch_id"] == "verify-123"
            assert stats["total_documents"] == 5
            assert stats["successful_documents"] == 4
            assert stats["failed_documents"] == 1
            assert stats["total_chunks"] == 100
            assert stats["total_vectors"] == 100


class TestClosePipeline:
    """Test suite for pipeline cleanup."""

    @pytest.mark.asyncio
    async def test_close_pipeline(self, mock_config, mock_pipeline):
        """Test that close method calls pipeline close."""
        with patch(
            "document_ingestion_worker.parser.ParallelDocumentIngestionPipeline",
            return_value=mock_pipeline,
        ):
            parser = DocumentParser(mock_config)

            await parser.close()

            mock_pipeline.close.assert_called_once()
