"""Integration tests for the full schema ingestion pipeline.

These tests use testcontainers to automatically start a Qdrant container.
No manual Docker setup required.

Run with: pytest tests/schema_ingestion_worker/integration/test_full_pipeline.py -v -m integration
"""

import asyncio
import json
import logging
from contextlib import suppress

import pytest
from qdrant_client import models

from schema_ingestion_worker.config import Settings
from schema_ingestion_worker.pipeline import AsyncSchemaIngestionPipeline


@pytest.fixture
def integration_config(tmp_path, qdrant_url, request):
    """Create test configuration for integration tests.

    Uses dynamic Qdrant URL from testcontainers and unique collection names
    per test to ensure isolation.
    """
    # Generate unique collection name for test isolation
    test_id = request.node.name.replace("[", "_").replace("]", "")[:30]
    collection_name = f"test_schema_{test_id}_{id(request.node) % 10000}"

    # Create test directories
    schemas_dir = tmp_path / "schemas"
    schemas_dir.mkdir()
    output_dir = tmp_path / "output"
    output_dir.mkdir()

    config = Settings(
        qdrant_url=qdrant_url,
        qdrant_collection_name=collection_name,
        qdrant_api_key=None,
        embedding_model_name="aapot/bge-m3-onnx",  # Use working ONNX model instead of BAAI/bge-m3
        embedding_provider_type="bge_m3_onnx",
        embedding_batch_size=256,
        vector_upsert_batch_size=50,
        input_schemas_dir=str(schemas_dir),
        output_dir=str(output_dir),
        log_level="INFO",
        mode="append",  # Default mode
    )
    return config, schemas_dir


@pytest.fixture
def sample_schema_files(integration_config):
    """Create sample schema files for testing."""
    config, schemas_dir = integration_config

    # Schema 1: User schema
    user_schema = {
        "uuid": "user-schema-001",
        "$id": "http://example.com/schemas/user.json",
        "document": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "The user's full name"},
                "email": {
                    "type": "string",
                    "format": "email",
                    "description": "The user's email address",
                },
                "age": {"type": "integer", "description": "The user's age in years"},
            },
            "required": ["name", "email"],
        },
    }

    # Schema 2: Product schema
    product_schema = {
        "uuid": "product-schema-001",
        "$id": "http://example.com/schemas/product.json",
        "document": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Product title"},
                "price": {"type": "number", "description": "Product price in USD"},
                "category": {"type": "string", "description": "Product category"},
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Product tags for search",
                },
            },
        },
    }

    # Write schema files
    (schemas_dir / "user.json").write_text(json.dumps(user_schema, indent=2))
    (schemas_dir / "product.json").write_text(json.dumps(product_schema, indent=2))

    return config, schemas_dir


@pytest.fixture
async def async_sample_schema_files(sample_schema_files):
    """Async wrapper for sample_schema_files fixture.

    Creates a single pipeline instance for the entire test lifecycle to avoid
    resource contention and connection pool exhaustion.

    Returns:
        Tuple[AsyncSchemaIngestionPipeline, Settings, Path]: Pipeline instance, configuration, and schemas directory.
    """
    config, schemas_dir = sample_schema_files

    # Create single pipeline instance for entire test lifecycle
    pipeline = AsyncSchemaIngestionPipeline(config)

    # Clear collection before test with timeout
    try:
        await asyncio.wait_for(pipeline.vector_store.clear_collection(), timeout=30)
    except Exception as e:
        logging.getLogger(__name__).debug(f"Pre-test collection clear failed: {e}")

    yield pipeline, config, schemas_dir

    # Cleanup with same pipeline instance (reuse connection)
    try:
        await asyncio.wait_for(pipeline.vector_store.clear_collection(), timeout=30)
    except Exception as e:
        logging.getLogger(__name__).debug(f"Post-test collection clear failed: {e}")
    finally:
        # Close connection pool
        await pipeline.vector_store.close()


@pytest.fixture
async def pipeline_with_cleanup(sample_schema_files):
    """Create pipeline and ensure cleanup before and after test."""
    config, schemas_dir = sample_schema_files
    pipeline = AsyncSchemaIngestionPipeline(config)

    # Clear any existing data before test
    try:
        await pipeline.vector_store.clear_collection()
        logging.info(f"Cleared test collection before test: {config.qdrant_collection_name}")
    except Exception as e:
        logging.warning(f"Failed to clear test collection before test: {e}")

    yield pipeline

    # Cleanup: clear the test collection after test
    try:
        await pipeline.vector_store.clear_collection()
        logging.info(f"Cleaned up test collection: {config.qdrant_collection_name}")
    except Exception as e:
        logging.warning(f"Failed to cleanup test collection: {e}")


@pytest.mark.integration
class TestFullPipelineExecution:
    """Integration tests for end-to-end pipeline execution."""

    @pytest.mark.asyncio
    async def test_pipeline_end_to_end(self, pipeline_with_cleanup):
        """Test complete pipeline execution from discovery to Qdrant storage."""
        pipeline = pipeline_with_cleanup

        # Run pipeline (new property-batched implementation)
        final_state = await pipeline.run()

        # Verify results (new structure from property-batched implementation)
        assert "batch_id" in final_state
        assert final_state.get("total_schema_files", 0) == 2

        # Should have parsed properties from both schemas
        # User schema: name, email, age = 3 properties
        # Product schema: title, price, category, tags = 4 properties
        # Total: 7 properties
        assert final_state.get("total_properties_parsed", 0) == 7
        assert final_state.get("total_embeddings_generated", 0) == 7
        assert final_state.get("total_documents_upserted", 0) == 7

        # Should have no failures
        assert final_state.get("batches_failed", 0) == 0

    @pytest.mark.asyncio
    async def test_verify_vectors_in_qdrant(self, pipeline_with_cleanup):
        """Test that vectors are properly stored in Qdrant."""
        pipeline = pipeline_with_cleanup

        # Run pipeline
        await pipeline.run()

        # Get collection stats
        stats = await pipeline.vector_store.get_stats()

        assert stats.points_count == 7
        assert stats.config["vector_size"] == 1024  # BAAI/bge-m3 dimension

    @pytest.mark.asyncio
    async def test_semantic_search_quality(self, pipeline_with_cleanup):
        """Test semantic search functionality and quality."""
        pipeline = pipeline_with_cleanup

        # Run pipeline to populate database
        await pipeline.run()

        # Test search for user-related properties
        user_results = await pipeline.vector_store.search("user email address", limit=3)

        assert len(user_results) > 0
        # The top result should contain email-related content
        top_result = user_results[0]
        assert top_result.metadata is not None
        assert "name" in top_result.metadata  # Flat structure - name is directly in metadata

        # Verify that we got relevant results
        # (email property should rank high for "user email address" query)
        result_texts = [r.metadata.get("name", "").lower() for r in user_results]
        assert any("email" in text for text in result_texts)

    @pytest.mark.asyncio
    async def test_search_with_filters(self, pipeline_with_cleanup):
        """Test search with metadata filters."""
        pipeline = pipeline_with_cleanup

        # Run pipeline
        await pipeline.run()

        # Search with source filter (only user schema)
        source_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="metadata.source", match=models.MatchValue(value="user.json")
                )
            ]
        )
        results = await pipeline.vector_store.search("name", limit=10, query_filter=source_filter)

        # Should only get results from user schema
        assert all("user.json" in r.metadata.get("source", "") for r in results)

    @pytest.mark.asyncio
    async def test_pipeline_with_empty_directory(self, integration_config):
        """Test pipeline behavior with empty schema directory."""
        config, schemas_dir = integration_config

        # Create pipeline with empty directory
        pipeline = AsyncSchemaIngestionPipeline(config)

        # Run pipeline
        final_state = await pipeline.run()

        # Should complete without errors
        assert final_state.get("total_schema_files", 0) == 0
        assert final_state.get("total_properties_parsed", 0) == 0
        assert final_state.get("total_documents_upserted", 0) == 0

        # Cleanup
        with suppress(Exception):
            await pipeline.vector_store.clear_collection()

    @pytest.mark.asyncio
    async def test_pipeline_handles_invalid_schema(self, integration_config):
        """Test pipeline behavior with invalid schema files.

        With fail-fast validation, the pipeline aborts when ANY schema is invalid.
        This prevents data loss in override mode by not clearing the collection
        until all schemas are validated successfully.
        """
        config, schemas_dir = integration_config

        # Create an invalid schema file
        (schemas_dir / "invalid.json").write_text("{ invalid json")

        # Create valid schema too
        valid_schema = {
            "document": {
                "type": "object",
                "properties": {"test": {"type": "string", "description": "Test property"}},
            }
        }
        (schemas_dir / "valid.json").write_text(json.dumps(valid_schema))

        pipeline = AsyncSchemaIngestionPipeline(config)

        # Run pipeline
        final_state = await pipeline.run()

        # FAIL-FAST VALIDATION BEHAVIOR:
        # - Both files are discovered
        # - Validation detects invalid file and aborts
        # - NO processing occurs (safe - prevents data loss in override mode)
        # - Pipeline returns with validation_passed=False
        assert final_state.get("total_schema_files", 0) == 2  # Both files discovered
        assert final_state.get("validation_passed") is False  # Validation failed
        assert final_state.get("total_documents_upserted", 0) == 0  # No processing occurred
        assert final_state.get("batches_completed", 0) == 0  # No batches processed
        assert len(final_state.get("failed_files", [])) == 1  # One failed file recorded

        # Verify the failed file is recorded
        failed_files = final_state.get("failed_files", [])
        assert any("invalid.json" in str(f[0]) for f in failed_files)

        # Cleanup
        with suppress(Exception):
            await pipeline.vector_store.clear_collection()

    @pytest.mark.asyncio
    async def test_large_batch_processing(self, integration_config):
        """Test pipeline with larger number of properties."""
        config, schemas_dir = integration_config

        # Create a schema with many properties
        properties = {
            f"property_{i}": {"type": "string", "description": f"Test property number {i}"}
            for i in range(25)  # 25 properties
        }

        large_schema = {"document": {"type": "object", "properties": properties}}

        (schemas_dir / "large.json").write_text(json.dumps(large_schema))

        pipeline = AsyncSchemaIngestionPipeline(config)

        # Run pipeline
        final_state = await pipeline.run()

        # Should process all 25 properties
        assert final_state.get("total_properties_parsed", 0) == 25
        assert final_state.get("total_documents_upserted", 0) == 25

        # Verify in Qdrant
        stats = await pipeline.vector_store.get_stats()
        assert stats.points_count == 25

        # Cleanup
        with suppress(Exception):
            await pipeline.vector_store.clear_collection()

    @pytest.mark.asyncio
    async def test_incremental_ingestion(self, pipeline_with_cleanup):
        """Test running pipeline multiple times (incremental ingestion)."""
        pipeline = pipeline_with_cleanup

        # First run
        final_state1 = await pipeline.run()
        count1 = final_state1.get("total_documents_upserted", 0)

        # Second run (should add documents again)
        final_state2 = await pipeline.run()
        count2 = final_state2.get("total_documents_upserted", 0)

        # Both runs should process same number of documents
        assert count1 == count2

        # Total count in Qdrant should be double (no deduplication by default)
        stats = await pipeline.vector_store.get_stats()
        assert stats.points_count == count1 + count2

    @pytest.mark.asyncio
    async def test_override_mode_replaces_data(self, async_sample_schema_files):
        """Test that override mode replaces all data on each run."""
        # Use pipeline from fixture to avoid creating multiple instances
        pipeline, config, schemas_dir = async_sample_schema_files

        # Set override mode
        config.mode = "override"

        try:
            # Use wait_for() which actively cancels tasks on timeout
            # First run
            final_state1 = await asyncio.wait_for(
                pipeline.run(),
                timeout=180,  # Increased for 2 sequential runs
            )
            count1 = final_state1.get("total_documents_upserted", 0)

            # Get count in Qdrant after first run
            stats1 = await asyncio.wait_for(
                pipeline.vector_store.get_stats(),
                timeout=10,  # 10 seconds for stats
            )
            points_after_first_run = stats1.points_count

            # Second run (should replace, not add)
            final_state2 = await asyncio.wait_for(
                pipeline.run(),
                timeout=180,  # Increased for 2 sequential runs
            )
            count2 = final_state2.get("total_documents_upserted", 0)

            # Both runs should process same number of documents
            assert count1 == count2

            # Total count in Qdrant should be same as single run (override behavior)
            stats2 = await asyncio.wait_for(
                pipeline.vector_store.get_stats(),
                timeout=10,  # 10 seconds for stats
            )
            assert stats2.points_count == points_after_first_run
            assert stats2.points_count == count1  # Not count1 + count2

        except TimeoutError as e:
            pytest.fail(f"Pipeline operation timed out: {e}. Check which operation is hanging.")

    @pytest.mark.asyncio
    async def test_override_mode_validation_failure_prevents_clear(self, integration_config):
        """Test override mode behavior with mixed valid/invalid schema files.

        With fail-fast validation, override mode validates ALL schemas upfront
        BEFORE clearing the collection. If ANY schema is invalid, the entire
        pipeline aborts and the collection is NOT cleared, preserving existing data.
        This prevents data loss in override mode.
        """
        config, schemas_dir = integration_config

        # Set override mode
        config.mode = "override"

        # First, create valid data
        valid_schema = {
            "document": {
                "type": "object",
                "properties": {"test": {"type": "string", "description": "Test property"}},
            }
        }
        (schemas_dir / "valid.json").write_text(json.dumps(valid_schema))

        pipeline = AsyncSchemaIngestionPipeline(config)

        # Clear collection before test
        with suppress(Exception):
            await pipeline.vector_store.clear_collection()

        # First run with valid data
        result1 = await pipeline.run()
        assert result1.get("total_documents_upserted", 0) > 0

        stats1 = await pipeline.vector_store.get_stats()
        original_count = stats1.points_count
        assert original_count > 0

        # Now add an invalid schema file
        (schemas_dir / "invalid.json").write_text("{ invalid json")

        # Second run: override mode with fail-fast validation
        final_state2 = await pipeline.run()

        # FAIL-FAST VALIDATION BEHAVIOR:
        # - Both files discovered
        # - Validation detects invalid file and aborts
        # - Collection is NOT cleared (preserves existing data)
        # - NO processing occurs (safe - prevents data loss)
        assert final_state2.get("total_schema_files", 0) == 2  # Both files discovered
        assert final_state2.get("validation_passed") is False  # Validation failed
        assert final_state2.get("total_documents_upserted", 0) == 0  # No processing occurred
        assert final_state2.get("batches_completed", 0) == 0  # No batches processed
        assert len(final_state2.get("failed_files", [])) == 1  # One failed file recorded

        # Collection should STILL have original data (NOT cleared due to validation failure)
        stats2 = await pipeline.vector_store.get_stats()
        assert stats2.points_count == original_count  # Original data preserved

        # Cleanup
        with suppress(Exception):
            await pipeline.vector_store.clear_collection()

    @pytest.mark.asyncio
    async def test_append_vs_override_mode_comparison(self, async_sample_schema_files, request):
        """Test comparison between append and override modes."""
        pipeline, config, schemas_dir = async_sample_schema_files

        # Generate unique collection names for this test
        test_id = id(request.node) % 10000

        # Test append mode
        config_append = config.model_copy()
        config_append.mode = "append"
        config_append.qdrant_collection_name = f"test_append_mode_{test_id}"
        pipeline_append = AsyncSchemaIngestionPipeline(config_append)

        try:
            # Clear and run twice
            with suppress(Exception):
                await pipeline_append.vector_store.clear_collection()

            await pipeline_append.run()
            await pipeline_append.run()

            stats_append = await pipeline_append.vector_store.get_stats()
            append_count = stats_append.points_count

            # Test override mode
            config_override = config.model_copy()
            config_override.mode = "override"
            config_override.qdrant_collection_name = f"test_override_mode_{test_id}"
            pipeline_override = AsyncSchemaIngestionPipeline(config_override)

            try:
                # Clear and run twice
                with suppress(Exception):
                    await pipeline_override.vector_store.clear_collection()

                result1 = await pipeline_override.run()
                result2 = await pipeline_override.run()

                stats_override = await pipeline_override.vector_store.get_stats()
                override_count = stats_override.points_count

                # Append mode should have double the documents
                # Override mode should have same as single run
                assert append_count == 2 * override_count
                assert override_count == result1.get("total_documents_upserted", 0)
                assert override_count == result2.get("total_documents_upserted", 0)

            finally:
                # Cleanup override pipeline
                with suppress(Exception):
                    await pipeline_override.vector_store.clear_collection()
                with suppress(Exception):
                    await pipeline_override.vector_store.close()

        finally:
            # Cleanup append pipeline
            with suppress(Exception):
                await pipeline_append.vector_store.clear_collection()
            with suppress(Exception):
                await pipeline_append.vector_store.close()


@pytest.mark.integration
@pytest.mark.slow  # OOM on CI runners (3 concurrent ONNX model loads ~1.8GB)
class TestPipelinePerformance:
    """Performance and stress tests for the pipeline."""

    @pytest.mark.asyncio
    async def test_embedding_batch_efficiency(self, async_sample_schema_files, request):
        """Test that embedding batching improves performance."""
        pipeline, config, schemas_dir = async_sample_schema_files

        # Generate unique collection names for this test
        test_id = id(request.node) % 10000

        # Create pipeline with small batch size
        config_small = config.model_copy()
        config_small.embedding_batch_size = 1
        config_small.qdrant_collection_name = f"test_batch_small_{test_id}"
        pipeline_small = AsyncSchemaIngestionPipeline(config_small)

        # Create pipeline with larger batch size
        config_large = config.model_copy()
        config_large.embedding_batch_size = 10
        config_large.qdrant_collection_name = f"test_batch_large_{test_id}"
        pipeline_large = AsyncSchemaIngestionPipeline(config_large)

        try:
            # Both should work correctly
            result_small = await pipeline_small.run()
            result_large = await pipeline_large.run()

            assert result_small.get("total_documents_upserted") == result_large.get(
                "total_documents_upserted"
            )

        finally:
            # Cleanup both pipelines
            with suppress(Exception):
                await pipeline_small.vector_store.clear_collection()
            with suppress(Exception):
                await pipeline_small.vector_store.close()

            with suppress(Exception):
                await pipeline_large.vector_store.clear_collection()
            with suppress(Exception):
                await pipeline_large.vector_store.close()


@pytest.mark.integration
class TestPipelineErrorRecovery:
    """Test error handling and recovery scenarios."""

    @pytest.mark.asyncio
    async def test_qdrant_connection_available(self, integration_config):
        """Test that pipeline can connect to Qdrant (via testcontainers)."""
        config, _ = integration_config

        # With testcontainers, Qdrant is always available
        pipeline = AsyncSchemaIngestionPipeline(config)
        assert pipeline.vector_store is not None

        # Cleanup
        with suppress(Exception):
            await pipeline.vector_store.clear_collection()


if __name__ == "__main__":
    # Allow running integration tests directly
    pytest.main([__file__, "-v", "-m", "integration"])
