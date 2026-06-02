"""Unit tests for refactored schema_ingestion_worker.pipeline."""

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import numpy as np
import pytest

from schema_ingestion_worker.config import Settings
from schema_ingestion_worker.index_definitions import SCHEMA_PROPERTY_INDEXES
from schema_ingestion_worker.models import SchemaDocument, create_initial_state
from schema_ingestion_worker.pipeline import AsyncSchemaIngestionPipeline


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
    config.embedding_timeout = 300
    config.upsert_timeout = 60
    config.input_schemas_dir = "test/schemas"
    config.output_dir = "test/output"
    config.onnx_inference_batch_size = 32
    config.log_level = "INFO"
    config.mode = "append"
    return config


@pytest.fixture
def mock_embedding_provider():
    """Create a mock async embedding provider."""
    provider = MagicMock()
    provider.get_dimension.return_value = 1024

    async def mock_embed_batch(texts):
        return [np.random.rand(1024).astype(np.float32).tolist() for _ in texts]

    provider.embed_batch = AsyncMock(side_effect=mock_embed_batch)
    return provider


@pytest.fixture
def mock_vector_store():
    """Create a mock async vector store."""
    store = MagicMock()
    store.add_pre_embedded_documents = AsyncMock(return_value=[f"id-{i}" for i in range(10)])
    store.get_stats = AsyncMock(
        return_value=type(
            "Stats", (), {"points_count": 10, "vectors_count": 10, "status": "green"}
        )()
    )
    store.ensure_collection_exists = AsyncMock()
    store.ensure_payload_indexes = AsyncMock()
    store.clear_collection = AsyncMock()
    store.close = AsyncMock()
    return store


@pytest.fixture
def pipeline(mock_config, mock_embedding_provider, mock_vector_store):
    """Create a pipeline instance with mocked dependencies."""
    with (
        patch(
            "schema_ingestion_worker.pipeline.create_embedding_provider",
            return_value=mock_embedding_provider,
        ),
        patch(
            "schema_ingestion_worker.pipeline.QdrantConnector",
            return_value=mock_vector_store,
        ),
    ):
        return AsyncSchemaIngestionPipeline(mock_config)


class TestPipelineInit:
    """Test pipeline initialization."""

    @pytest.mark.asyncio
    async def test_init_with_config(self, mock_config):
        """Test pipeline initialization with configuration."""
        with (
            patch("schema_ingestion_worker.pipeline.create_embedding_provider") as mock_emb,
            patch("schema_ingestion_worker.pipeline.QdrantConnector") as mock_vs,
        ):
            pipeline = AsyncSchemaIngestionPipeline(mock_config)

            assert pipeline.config == mock_config
            assert pipeline.embedding_provider is not None
            assert pipeline.vector_store is not None
            mock_emb.assert_called_once()
            mock_vs.assert_called_once()


class TestValidateAllSchemaFiles:
    """Test _validate_all_schema_files private method."""

    @pytest.mark.asyncio
    async def test_validation_success(self, pipeline, tmp_path):
        """Test successful validation of all schema files."""
        schema_dir = tmp_path / "schemas"
        schema_dir.mkdir()
        (schema_dir / "schema1.json").write_text('{"type": "object"}')
        (schema_dir / "schema2.json").write_text('{"type": "object"}')

        schema_files = list(schema_dir.rglob("*.json"))

        with patch(
            "schema_ingestion_worker.pipeline.load_schema_file",
            return_value={"type": "object"},
        ):
            passed, failed, preloaded = await pipeline._validate_all_schema_files(schema_files)

        assert passed is True
        assert failed == []
        assert len(preloaded) == 2

    @pytest.mark.asyncio
    async def test_validation_partial_failure(self, pipeline, tmp_path):
        """Test validation with some files failing."""
        schema_dir = tmp_path / "schemas"
        schema_dir.mkdir()
        good_file = schema_dir / "good.json"
        bad_file = schema_dir / "bad.json"
        good_file.write_text('{"type": "object"}')
        bad_file.write_text('{"type": "object"}')

        schema_files = [good_file, bad_file]

        def mock_load(path):
            if "bad" in str(path):
                return None
            return {"type": "object"}

        with patch("schema_ingestion_worker.pipeline.load_schema_file", side_effect=mock_load):
            passed, failed, preloaded = await pipeline._validate_all_schema_files(schema_files)

        assert passed is False
        assert len(failed) == 1
        assert failed[0][0] == bad_file
        assert preloaded == {}


class TestParseAllSchemas:
    """Test _parse_all_schemas private method."""

    @pytest.mark.asyncio
    async def test_parse_success(self, pipeline, tmp_path):
        """Test successful parsing of schemas."""
        schema_dir = tmp_path / "schemas"
        schema_dir.mkdir()

        mock_parsed_props = [
            {
                "embedding_input": "Property description",
                "content": {"name": "prop1"},
                "source": "schema1.json",
            }
        ]
        mock_stats = {
            "root_schema_count": 1,
            "total_schema_count": 1,
            "referenced_schema_count": 0,
            "cached_refs": 0,
            "avg_properties_per_ref": 0.0,
        }

        with patch(
            "schema_ingestion_worker.pipeline.parse_schemas_from_directory",
            return_value=(mock_parsed_props, mock_stats),
        ):
            docs, stats = await pipeline._parse_all_schemas(schema_dir)

        assert len(docs) == 1
        assert isinstance(docs[0], SchemaDocument)
        assert stats["root_schema_count"] == 1


class TestEnsureCollectionReady:
    """Test _ensure_collection_ready private method."""

    @pytest.mark.asyncio
    async def test_collection_ready_success(self, pipeline, mock_vector_store):
        """Test successful collection preparation."""
        await pipeline._ensure_collection_ready()
        mock_vector_store.ensure_collection_exists.assert_called_once()
        mock_vector_store.ensure_payload_indexes.assert_awaited_once_with(SCHEMA_PROPERTY_INDEXES)

    @pytest.mark.asyncio
    async def test_collection_ready_failure(self, pipeline, mock_vector_store):
        """Test collection preparation failure."""
        mock_vector_store.ensure_collection_exists.side_effect = Exception("Connection error")

        with pytest.raises(Exception, match="Connection error"):
            await pipeline._ensure_collection_ready()


class TestClearCollectionIfOverride:
    """Test _clear_collection_if_override private method."""

    @pytest.mark.asyncio
    async def test_clear_in_override_mode(self, pipeline, mock_vector_store):
        """Test collection clearing in override mode."""
        pipeline.config.mode = "override"
        await pipeline._clear_collection_if_override()
        mock_vector_store.clear_collection.assert_called_once()

    @pytest.mark.asyncio
    async def test_no_clear_in_append_mode(self, pipeline, mock_vector_store):
        """Test no collection clearing in append mode."""
        pipeline.config.mode = "append"
        await pipeline._clear_collection_if_override()
        mock_vector_store.clear_collection.assert_not_called()

    @pytest.mark.asyncio
    async def test_clear_failure(self, pipeline, mock_vector_store):
        """Test collection clearing failure."""
        pipeline.config.mode = "override"
        mock_vector_store.clear_collection.side_effect = Exception("Clear error")

        with pytest.raises(Exception, match="Clear error"):
            await pipeline._clear_collection_if_override()


class TestRunMethod:
    """Test the main run() method."""

    @pytest.mark.asyncio
    async def test_run_with_nonexistent_directory(self, pipeline):
        """Test run with non-existent input directory."""
        pipeline.config.input_schemas_dir = Path("/nonexistent/path")

        result = await pipeline.run()

        assert result["validation_passed"] is False
        assert len(result["failed_files"]) == 1
        assert "does not exist" in result["failed_files"][0][1]

    @pytest.mark.asyncio
    async def test_run_with_empty_directory(self, pipeline, tmp_path):
        """Test run with empty directory."""
        empty_dir = tmp_path / "empty"
        empty_dir.mkdir()
        pipeline.config.input_schemas_dir = empty_dir

        result = await pipeline.run()

        assert result["validation_passed"] is True
        assert result["total_schema_files"] == 0
        assert result["total_properties_parsed"] == 0

    @pytest.mark.asyncio
    async def test_run_validation_failure_prevents_clear(
        self, pipeline, tmp_path, mock_vector_store
    ):
        """Test that validation failure prevents collection clearing in override mode."""
        schema_dir = tmp_path / "schemas"
        schema_dir.mkdir()
        (schema_dir / "bad.json").write_text('{"type": "object"}')

        pipeline.config.input_schemas_dir = schema_dir
        pipeline.config.mode = "override"

        with patch("schema_ingestion_worker.pipeline.load_schema_file", return_value=None):
            result = await pipeline.run()

        assert result["validation_passed"] is False
        mock_vector_store.clear_collection.assert_not_called()

    @pytest.mark.asyncio
    async def test_run_consistent_return_structure(self, pipeline, tmp_path):
        """Test that run() always returns consistent structure."""
        empty_dir = tmp_path / "empty"
        empty_dir.mkdir()
        pipeline.config.input_schemas_dir = empty_dir

        result = await pipeline.run()

        required_keys = [
            "batch_id",
            "total_schema_files",
            "total_batches",
            "batches_completed",
            "batches_failed",
            "total_properties_parsed",
            "total_embeddings_generated",
            "total_documents_upserted",
            "failed_files",
            "validation_passed",
        ]

        for key in required_keys:
            assert key in result, f"Missing required key: {key}"


class TestEmbedBatch:
    """Test embed_batch node (still used by pipeline)."""

    @pytest.mark.asyncio
    async def test_embed_batch_success(self, pipeline):
        """Test successful embedding generation."""
        state = create_initial_state()
        state["parsed_documents"] = [
            SchemaDocument(
                embedding_input="Test property",
                content={"name": "test"},
                source="test.json",
            )
        ]

        result = await pipeline.embed_batch(state)

        assert "embedded_documents" in result
        assert len(result["embedded_documents"]) == 1
        assert "embedding" in result["embedded_documents"][0]


class TestUpsertToQdrant:
    """Test upsert_to_qdrant node (still used by pipeline)."""

    @pytest.mark.asyncio
    async def test_upsert_success(self, pipeline, mock_vector_store):
        """Test successful upserting to Qdrant."""
        state = create_initial_state()
        state["embedded_documents"] = [
            {
                "text": "Test",
                "embedding": [0.1] * 1024,
                "metadata": {"name": "test"},
            }
        ]

        result = await pipeline.upsert_to_qdrant(state)

        assert "processed_count" in result
        mock_vector_store.add_pre_embedded_documents.assert_called()


class TestUpdateProgress:
    """Test update_progress node (still used by pipeline)."""

    @pytest.mark.asyncio
    async def test_update_progress(self, pipeline, mock_vector_store):
        """Test progress logging."""
        state = create_initial_state()
        state["batch_id"] = "test-batch"
        state["schema_files"] = [Path("test.json")]
        state["parsed_count"] = 10
        state["embedded_count"] = 10
        state["processed_count"] = 10

        result = await pipeline.update_progress(state)

        assert result == {}
        mock_vector_store.get_stats.assert_called_once()


class TestContextManager:
    """Test async context manager protocol."""

    @pytest.mark.asyncio
    async def test_context_manager_success(
        self, mock_config, mock_embedding_provider, mock_vector_store
    ):
        """Test pipeline can be used as async context manager."""
        with (
            patch(
                "schema_ingestion_worker.pipeline.create_embedding_provider",
                return_value=mock_embedding_provider,
            ),
            patch(
                "schema_ingestion_worker.pipeline.QdrantConnector",
                return_value=mock_vector_store,
            ),
        ):
            async with AsyncSchemaIngestionPipeline(mock_config) as pipeline:
                assert pipeline is not None
                assert pipeline.config == mock_config

            # Should have called close on exit
            mock_vector_store.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_context_manager_with_exception(
        self, mock_config, mock_embedding_provider, mock_vector_store
    ):
        """Test context manager closes resources even on exception."""
        with (
            patch(
                "schema_ingestion_worker.pipeline.create_embedding_provider",
                return_value=mock_embedding_provider,
            ),
            patch(
                "schema_ingestion_worker.pipeline.QdrantConnector",
                return_value=mock_vector_store,
            ),
        ):
            with pytest.raises(ValueError):
                async with AsyncSchemaIngestionPipeline(mock_config):
                    raise ValueError("Test error")

            # Should have called close even though exception occurred
            mock_vector_store.close.assert_called_once()


class TestDiscoverAndValidateSchemas:
    """Test _discover_and_validate_schemas private method."""

    @pytest.mark.asyncio
    async def test_discover_and_validate_success(self, pipeline, tmp_path):
        """Test successful discovery and validation."""
        from schema_ingestion_worker.utils import PipelineResultBuilder

        schema_dir = tmp_path / "schemas"
        schema_dir.mkdir()
        (schema_dir / "schema1.json").write_text('{"type": "object"}')
        (schema_dir / "schema2.json").write_text('{"type": "object"}')

        pipeline.config.input_schemas_dir = schema_dir
        result_builder = PipelineResultBuilder(batch_id="test-id")

        with patch(
            "schema_ingestion_worker.pipeline.load_schema_file",
            return_value={"type": "object"},
        ):
            schema_files, preloaded = await pipeline._discover_and_validate_schemas(result_builder)

        assert schema_files is not None
        assert len(schema_files) == 2
        assert len(preloaded) == 2
        assert result_builder.get_result()["validation_passed"] is True

    @pytest.mark.asyncio
    async def test_discover_nonexistent_directory(self, pipeline):
        """Test discovery with non-existent directory."""
        from schema_ingestion_worker.utils import PipelineResultBuilder

        pipeline.config.input_schemas_dir = Path("/nonexistent/path")
        result_builder = PipelineResultBuilder(batch_id="test-id")

        schema_files, preloaded = await pipeline._discover_and_validate_schemas(result_builder)

        assert schema_files is None
        assert preloaded == {}
        assert len(result_builder.get_result()["failed_files"]) == 1

    @pytest.mark.asyncio
    async def test_discover_empty_directory(self, pipeline, tmp_path):
        """Test discovery with empty directory."""
        from schema_ingestion_worker.utils import PipelineResultBuilder

        empty_dir = tmp_path / "empty"
        empty_dir.mkdir()
        pipeline.config.input_schemas_dir = empty_dir
        result_builder = PipelineResultBuilder(batch_id="test-id")

        schema_files, preloaded = await pipeline._discover_and_validate_schemas(result_builder)

        assert schema_files is None
        assert preloaded == {}
        assert result_builder.get_result()["total_schema_files"] == 0


class TestParseAndPrepareData:
    """Test _parse_and_prepare_data private method."""

    @pytest.mark.asyncio
    async def test_parse_and_prepare_success(self, pipeline, tmp_path, mock_vector_store):
        """Test successful parsing and preparation."""
        from schema_ingestion_worker.utils import PipelineResultBuilder

        schema_dir = tmp_path / "schemas"
        schema_dir.mkdir()
        pipeline.config.input_schemas_dir = schema_dir

        mock_parsed_props = [
            {
                "embedding_input": "Property description",
                "content": {"name": "prop1"},
                "source": "schema1.json",
            }
        ]
        mock_stats = {
            "root_schema_count": 1,
            "total_schema_count": 1,
            "referenced_schema_count": 0,
            "cached_refs": 0,
            "avg_properties_per_ref": 0.0,
        }

        result_builder = PipelineResultBuilder(batch_id="test-id")

        with patch(
            "schema_ingestion_worker.pipeline.parse_schemas_from_directory",
            return_value=(mock_parsed_props, mock_stats),
        ):
            parsed_docs = await pipeline._parse_and_prepare_data(result_builder)

        assert parsed_docs is not None
        assert len(parsed_docs) == 1
        assert result_builder.get_result()["total_properties_parsed"] == 1

    @pytest.mark.asyncio
    async def test_parse_and_prepare_failure(self, pipeline, tmp_path):
        """Test parsing failure handling."""
        from schema_ingestion_worker.utils import PipelineResultBuilder

        schema_dir = tmp_path / "schemas"
        schema_dir.mkdir()
        pipeline.config.input_schemas_dir = schema_dir
        result_builder = PipelineResultBuilder(batch_id="test-id")

        with patch(
            "schema_ingestion_worker.pipeline.parse_schemas_from_directory",
            side_effect=Exception("Parse error"),
        ):
            parsed_docs = await pipeline._parse_and_prepare_data(result_builder)

        assert parsed_docs is None
        assert len(result_builder.get_result()["failed_files"]) == 1


class TestProcessPropertyBatches:
    """Test _process_property_batches with multi-batch scenarios."""

    @pytest.mark.asyncio
    async def test_partial_failure_accumulates_results(self, pipeline, mock_vector_store):
        """Test that some batches succeed and others fail, with correct accumulation."""
        from schema_ingestion_worker.utils import PipelineResultBuilder

        # Use small batch size to force 3 batches from 5 documents
        pipeline.config.embedding_batch_size = 2

        docs = [
            SchemaDocument(
                embedding_input=f"Property {i}",
                content={"name": f"prop{i}"},
                source=f"schema{i}.json",
            )
            for i in range(5)
        ]
        schema_files = [Path(f"schema{i}.json") for i in range(2)]
        result_builder = PipelineResultBuilder(batch_id="test-partial")

        call_count = 0

        async def mock_run_single(property_batch, batch_id, batch_num):
            nonlocal call_count
            call_count += 1
            if batch_num == 2:
                raise ValueError("Batch 2 failed")
            # Simulate successful batch
            return {
                "embedded_documents": [{"text": "t", "embedding": [0.1], "metadata": {}}]
                * len(property_batch),
                "processed_count": len(property_batch),
            }

        pipeline._run_single_property_batch = AsyncMock(side_effect=mock_run_single)

        await pipeline._process_property_batches(
            docs, "test-batch", schema_files, result_builder, 0.0
        )

        result = result_builder.get_result()
        # 3 batches total (2+2+1), batch 2 fails
        assert result["total_batches"] == 3
        assert result["batches_completed"] == 2
        assert result["batches_failed"] == 1
        # Successful batches: batch 1 (2 docs) + batch 3 (1 doc) = 3
        assert result["total_embeddings_generated"] == 3
        assert result["total_documents_upserted"] == 3

    @pytest.mark.asyncio
    async def test_all_batches_succeed(self, pipeline, mock_vector_store):
        """Test that all batches succeeding produces correct totals."""
        from schema_ingestion_worker.utils import PipelineResultBuilder

        pipeline.config.embedding_batch_size = 2

        docs = [
            SchemaDocument(
                embedding_input=f"Property {i}",
                content={"name": f"prop{i}"},
                source=f"schema{i}.json",
            )
            for i in range(4)
        ]
        schema_files = [Path("schema.json")]
        result_builder = PipelineResultBuilder(batch_id="test-success")

        async def mock_run_single(property_batch, batch_id, batch_num):
            return {
                "embedded_documents": [{"text": "t", "embedding": [0.1], "metadata": {}}]
                * len(property_batch),
                "processed_count": len(property_batch),
            }

        pipeline._run_single_property_batch = AsyncMock(side_effect=mock_run_single)

        await pipeline._process_property_batches(
            docs, "test-batch", schema_files, result_builder, 0.0
        )

        result = result_builder.get_result()
        assert result["total_batches"] == 2
        assert result["batches_completed"] == 2
        assert result["batches_failed"] == 0
        assert result["total_embeddings_generated"] == 4
        assert result["total_documents_upserted"] == 4


class TestCriticalPipelineErrorPropagation:
    """Test that CriticalPipelineError aborts remaining batches."""

    @pytest.mark.asyncio
    async def test_critical_error_aborts_pipeline(self, pipeline, mock_vector_store):
        """Test that CriticalPipelineError stops processing remaining batches."""
        from schema_ingestion_worker.utils import CriticalPipelineError, PipelineResultBuilder

        pipeline.config.embedding_batch_size = 2

        docs = [
            SchemaDocument(
                embedding_input=f"Property {i}",
                content={"name": f"prop{i}"},
                source=f"schema{i}.json",
            )
            for i in range(6)
        ]
        schema_files = [Path("schema.json")]
        result_builder = PipelineResultBuilder(batch_id="test-critical")

        call_count = 0

        async def mock_run_single(property_batch, batch_id, batch_num):
            nonlocal call_count
            call_count += 1
            if batch_num == 2:
                raise CriticalPipelineError(
                    message="Embedding count mismatch",
                    stage="embedding",
                    batch_id=batch_num,
                )
            return {
                "embedded_documents": [{"text": "t", "embedding": [0.1], "metadata": {}}]
                * len(property_batch),
                "processed_count": len(property_batch),
            }

        pipeline._run_single_property_batch = AsyncMock(side_effect=mock_run_single)

        await pipeline._process_property_batches(
            docs, "test-batch", schema_files, result_builder, 0.0
        )

        result = result_builder.get_result()
        # Should have stopped after batch 2 (3 total batches: 2+2+2)
        assert call_count == 2, "Pipeline should stop after critical error in batch 2"
        assert result["batches_completed"] == 1  # Only batch 1 succeeded
        assert result["batches_failed"] == 1  # Batch 2 failed critically


class TestBatchFailureLogging:
    """Test batch failure logging handles missing 'error' key."""

    @pytest.mark.asyncio
    async def test_failure_without_error_key(self, pipeline, mock_vector_store):
        """Test logging when has_error=True but no 'error' key in final_state."""
        from schema_ingestion_worker.utils import PipelineResultBuilder

        pipeline.config.embedding_batch_size = 3

        docs = [
            SchemaDocument(
                embedding_input=f"Property {i}",
                content={"name": f"prop{i}"},
                source=f"schema{i}.json",
            )
            for i in range(3)
        ]
        schema_files = [Path("schema.json")]
        result_builder = PipelineResultBuilder(batch_id="test-no-error-key")

        async def mock_run_single(property_batch, batch_id, batch_num):
            # Return state with embedding_failures but NO "error" key
            return {
                "embedded_documents": [{"text": "t", "embedding": [0.1], "metadata": {}}],
                "processed_count": 1,
                "embedding_failures": [(1, "embedding error")],
            }

        pipeline._run_single_property_batch = AsyncMock(side_effect=mock_run_single)

        # This should NOT raise KeyError (was the bug before the fix)
        await pipeline._process_property_batches(
            docs, "test-batch", schema_files, result_builder, 0.0
        )

        result = result_builder.get_result()
        assert result["batches_failed"] == 1
        assert len(result["embedding_failures"]) == 1
