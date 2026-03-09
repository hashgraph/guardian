"""Tests to verify parallel processing isolation in document ingestion pipeline.

These tests ensure that when processing multiple documents in parallel,
intermediate files are saved to the correct document-specific directories
and no cross-contamination occurs between parallel document processing tasks.

Note: Parser and chunker instances are now created inside subprocesses
(one per document), so per-instance isolation is guaranteed by OS-level
process isolation.
"""

import asyncio
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from document_ingestion_worker import ParallelDocumentIngestionPipeline
from document_ingestion_worker.config import DocumentIngestionSettings


@pytest.fixture
def mock_config(tmp_path):
    """Create a mock configuration for testing parallel isolation."""
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    (data_dir / "input" / "documents").mkdir(parents=True)
    (data_dir / "staged" / "documents").mkdir(parents=True)
    (data_dir / "output" / "documents").mkdir(parents=True)

    config = Mock(spec=DocumentIngestionSettings)
    config.qdrant_url = "http://localhost:6333"
    config.qdrant_api_key = None
    config.qdrant_collection_name = "methodology_documents"
    config.embedding_model_name = "aapot/bge-m3-onnx"
    config.embedding_provider_type = "bge_m3_onnx"
    config.embedding_batch_size = 50
    config.embedding_vector_size = 1024
    config.vector_upsert_batch_size = 100
    config.data_dir = data_dir
    config.input_documents_dir = data_dir / "input" / "documents"
    config.staged_documents_dir = data_dir / "staged" / "documents"
    config.max_parallel_files = 3
    config.log_level = "INFO"
    config.mode = "append"
    config.do_ocr = False
    config.ocr_lang = ["eng"]
    config.force_full_page_ocr = False
    config.do_table_structure = True
    config.table_structure_mode = "accurate"
    config.do_cell_matching = True
    config.do_formula_enrichment = False
    config.chunk_max_tokens = 5000
    config.chunk_overlap_tokens = 0
    config.start_from = "beginning"
    config.tesseract_cmd = None
    config.accelerator_device = "auto"
    config.num_threads = 4
    config.ocr_batch_size = None
    config.layout_batch_size = None
    config.table_batch_size = 4
    config.get_effective_batch_sizes = Mock(return_value=(32, 32, 4))
    config.supported_formats = ["pdf", "docx"]
    config.get_supported_glob_patterns.return_value = ["*.pdf", "*.docx"]
    config.apply_hierarchy_postprocessing = True
    config.fix_orphaned_list_items = True
    config.save_intermediate_parsing_results = True  # Enable intermediate files
    config.enable_subscript_handling = True
    config.layout_model = "heron"
    config.pdf_backend = "dlparse_v2"
    config.pdf_images_scale = 1.0
    # Surya formula enrichment settings
    config.use_surya_formula_enrichment = False
    config.surya_batch_size = 8
    config.surya_upscale_factor = 2.0
    config.surya_expansion_factor_horizontal = 0.2
    config.surya_expansion_factor_vertical = 0.0
    config.get_layout_model_spec = Mock(
        side_effect=ImportError("Mock: layout_model_specs not available")
    )
    return config


class TestIntermediateFileIsolation:
    """Test that intermediate files are saved to correct directories."""

    @pytest.mark.asyncio
    async def test_parallel_documents_use_separate_staged_paths(self, mock_config):
        """Test that parallel documents each get their own staged directory."""
        input_dir = mock_config.input_documents_dir
        staged_dir = mock_config.staged_documents_dir

        # Create 3 test PDF files
        (input_dir / "doc1.pdf").write_bytes(b"%PDF-1.4 doc1")
        (input_dir / "doc2.pdf").write_bytes(b"%PDF-1.4 doc2")
        (input_dir / "doc3.pdf").write_bytes(b"%PDF-1.4 doc3")

        with patch("document_ingestion_worker.parallel_pipeline.QdrantConnector"):
            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            documents = await pipeline._discover_documents()

        assert len(documents) == 3

        # Verify each document has a unique staged path
        staged_paths = [doc[1] for doc in documents]
        assert len(set(staged_paths)) == 3, "Each document should have unique staged path"

        # Verify staged paths are named correctly
        staged_names = {path.name for path in staged_paths}
        assert staged_names == {"doc1", "doc2", "doc3"}

        # Verify staged paths are under staged_documents_dir
        for path in staged_paths:
            assert path.parent == staged_dir


class TestConcurrentSubprocessLimiting:
    """Test that semaphore in _process_documents_parallel() limits concurrency."""

    @pytest.mark.asyncio
    async def test_semaphore_limits_concurrent_subprocesses(self, mock_config):
        """Test that max_parallel_files semaphore limits concurrency correctly.

        Creates 5 documents but limits max_parallel_files to 2. Verifies that
        at no point are more than 2 subprocesses running concurrently.
        """
        mock_config.max_parallel_files = 2
        mock_config.subprocess_timeout_seconds = 300
        mock_config.subprocess_memory_limit_gb = None

        current_concurrent = 0
        max_observed_concurrent = 0
        lock = asyncio.Lock()

        async def mock_run_subprocess(config, document_path, staged_path, source_format):
            nonlocal current_concurrent, max_observed_concurrent
            async with lock:
                current_concurrent += 1
                max_observed_concurrent = max(max_observed_concurrent, current_concurrent)

            # Simulate processing time
            await asyncio.sleep(0.05)

            async with lock:
                current_concurrent -= 1

            return {
                "status": "success",
                "document_id": document_path.stem,
                "chunks_generated": 1,
                "vectors_upserted": 1,
                "processing_time_seconds": 0.05,
                "peak_memory_mb": 100.0,
                "error_message": None,
                "error_type": None,
            }

        documents = [(Path(f"doc{i}.pdf"), Path(f"/staged/doc{i}")) for i in range(5)]

        with (
            patch("document_ingestion_worker.parallel_pipeline.QdrantConnector"),
            patch(
                "document_ingestion_worker.subprocess_runner.run_document_subprocess",
                side_effect=mock_run_subprocess,
            ),
            patch(
                "document_ingestion_worker.parallel_pipeline.DocumentParserFactory"
            ) as mock_factory,
        ):
            mock_format = Mock()
            mock_format.value = "pdf"
            mock_factory.get_format.return_value = mock_format

            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            results = await pipeline._process_documents_parallel(documents)

        assert len(results) == 5
        assert all(r["status"] == "success" for r in results)
        assert max_observed_concurrent <= 2, (
            f"Max concurrent was {max_observed_concurrent}, expected <= 2"
        )
        # Verify concurrency actually happened (not purely sequential)
        assert max_observed_concurrent == 2, (
            f"Expected concurrency of 2 but only observed {max_observed_concurrent}"
        )

    @pytest.mark.asyncio
    async def test_ipc_files_no_collision_between_concurrent_documents(self, mock_config, tmp_path):
        """Test that concurrent subprocess IPC files don't collide.

        Verifies that each document gets unique IPC file paths even when
        subprocesses are spawned concurrently.
        """
        mock_config.max_parallel_files = 3
        mock_config.subprocess_timeout_seconds = 300
        mock_config.subprocess_memory_limit_gb = None
        staged_dir = tmp_path / "staged" / "documents"
        staged_dir.mkdir(parents=True)
        mock_config.staged_documents_dir = staged_dir

        ipc_files_created: list[str] = []
        ipc_lock = asyncio.Lock()

        async def mock_run_subprocess(config, document_path, staged_path, source_format):
            # Simulate what run_document_subprocess does: create IPC dir + files
            ipc_dir = staged_path / "_ipc"
            ipc_dir.mkdir(exist_ok=True, parents=True)

            import uuid

            ipc_id = uuid.uuid4().hex[:8]
            request_file = ipc_dir / f"request_{ipc_id}.json"
            request_file.write_text("{}")

            async with ipc_lock:
                ipc_files_created.append(str(request_file))

            await asyncio.sleep(0.02)

            # Cleanup
            request_file.unlink(missing_ok=True)

            return {
                "status": "success",
                "document_id": document_path.stem,
                "chunks_generated": 1,
                "vectors_upserted": 1,
                "processing_time_seconds": 0.02,
                "peak_memory_mb": 50.0,
                "error_message": None,
                "error_type": None,
            }

        documents = [(Path(f"doc{i}.pdf"), staged_dir / f"doc{i}") for i in range(3)]
        for _, staged_path in documents:
            staged_path.mkdir(parents=True, exist_ok=True)

        with (
            patch("document_ingestion_worker.parallel_pipeline.QdrantConnector"),
            patch(
                "document_ingestion_worker.subprocess_runner.run_document_subprocess",
                side_effect=mock_run_subprocess,
            ),
            patch(
                "document_ingestion_worker.parallel_pipeline.DocumentParserFactory"
            ) as mock_factory,
        ):
            mock_format = Mock()
            mock_format.value = "pdf"
            mock_factory.get_format.return_value = mock_format

            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            results = await pipeline._process_documents_parallel(documents)

        assert len(results) == 3
        # All IPC file paths should be unique (no collisions)
        assert len(ipc_files_created) == len(set(ipc_files_created)), (
            f"IPC file collision detected: {ipc_files_created}"
        )

    @pytest.mark.asyncio
    async def test_exception_in_one_subprocess_does_not_block_others(self, mock_config):
        """Test that a failing subprocess doesn't prevent other documents from completing."""
        mock_config.max_parallel_files = 3
        mock_config.subprocess_timeout_seconds = 300
        mock_config.subprocess_memory_limit_gb = None

        call_count = 0

        async def mock_run_subprocess(config, document_path, staged_path, source_format):
            nonlocal call_count
            call_count += 1

            if document_path.stem == "doc1":
                raise RuntimeError("Simulated crash")

            return {
                "status": "success",
                "document_id": document_path.stem,
                "chunks_generated": 1,
                "vectors_upserted": 1,
                "processing_time_seconds": 0.01,
                "peak_memory_mb": 50.0,
                "error_message": None,
                "error_type": None,
            }

        documents = [(Path(f"doc{i}.pdf"), Path(f"/staged/doc{i}")) for i in range(3)]

        with (
            patch("document_ingestion_worker.parallel_pipeline.QdrantConnector"),
            patch(
                "document_ingestion_worker.subprocess_runner.run_document_subprocess",
                side_effect=mock_run_subprocess,
            ),
            patch(
                "document_ingestion_worker.parallel_pipeline.DocumentParserFactory"
            ) as mock_factory,
        ):
            mock_format = Mock()
            mock_format.value = "pdf"
            mock_factory.get_format.return_value = mock_format

            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            results = await pipeline._process_documents_parallel(documents)

        assert len(results) == 3
        assert call_count == 3, "All subprocesses should have been attempted"

        # doc1 failed, doc0 and doc2 succeeded
        failed = [r for r in results if r["status"] == "failed"]
        succeeded = [r for r in results if r["status"] == "success"]
        assert len(failed) == 1
        assert len(succeeded) == 2
        assert failed[0]["document_id"] == "doc1"
