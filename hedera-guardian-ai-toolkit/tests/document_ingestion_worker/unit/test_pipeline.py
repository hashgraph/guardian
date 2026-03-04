"""Unit tests for document_ingestion_worker.parallel_pipeline."""

import json
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import numpy as np
import pytest
from docling.datamodel.document import DoclingDocument

from document_ingestion_worker import ParallelDocumentIngestionPipeline
from document_ingestion_worker.config import DocumentIngestionSettings
from document_ingestion_worker.index_definitions import METHODOLOGY_DOCUMENT_INDEXES
from document_ingestion_worker.models import (
    SingleDocumentResult,
    create_single_document_state,
)
from document_ingestion_worker.single_document_pipeline import SingleDocumentPipeline


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
    config.max_parallel_files = 5
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
    # Accelerator and batch processing options
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
    config.save_intermediate_parsing_results = False
    config.enable_subscript_handling = True
    # Layout model configuration - raise ImportError to skip layout config
    # (the actual LayoutOptions requires a real LayoutModelConfig, not a mock)
    config.layout_model = "heron"
    config.get_layout_model_spec = Mock(
        side_effect=ImportError("Mock: layout_model_specs not available")
    )
    return config


@pytest.fixture
def mock_pdf_parser():
    """Create a mock PDF parser."""
    parser = MagicMock()
    mock_doc = MagicMock(spec=DoclingDocument)
    mock_doc.export_to_dict.return_value = {"content": "test"}
    parser.convert_pdf.return_value = mock_doc
    return parser


@pytest.fixture
def mock_docx_parser():
    """Create a mock DOCX parser."""
    parser = MagicMock()
    mock_doc = MagicMock(spec=DoclingDocument)
    mock_doc.export_to_dict.return_value = {"content": "test docx"}
    parser.convert_docx.return_value = mock_doc
    return parser


@pytest.fixture
def mock_chunker():
    """Create a mock document chunker."""
    chunker = MagicMock()
    # chunk_document returns both text (markdown) and embedding_text (compact)
    chunker.chunk_document.return_value = [
        {
            "text": "chunk **markdown**",  # Display text (markdown tables)
            "embedding_text": "chunk text",  # Embedding text (triplet format)
            "heading": "",
            "page_no": 1,
        }
    ]
    # prepare_for_embedding returns both embedding_input and display_text
    # Note: content does NOT include "text" - text is in embedding_input/display_text
    chunker.prepare_for_embedding.return_value = [
        {
            "embedding_input": "chunk text",  # Compact format for embeddings
            "display_text": "chunk **markdown**",  # Markdown format for display
            "content": {
                "chunk_id": 1,
                "heading": "",
                "headings": [],
                "page_no": 1,
                "token_count": 0,
            },
            "source": "test.pdf",
            "document_name": "test",
        }
    ]
    return chunker


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
        return_value=Mock(points_count=10, vectors_count=10, status="green")
    )
    store.ensure_collection_exists = AsyncMock()
    store.ensure_hybrid_collection_exists = AsyncMock()
    store.ensure_payload_indexes = AsyncMock()
    store.clear_collection = AsyncMock()
    store.close = AsyncMock()
    return store


@pytest.fixture
def single_doc_pipeline(
    mock_config,
    mock_pdf_parser,
    mock_docx_parser,
    mock_chunker,
    mock_embedding_provider,
    mock_vector_store,
):
    """Create a SingleDocumentPipeline with mocked dependencies."""
    return SingleDocumentPipeline(
        config=mock_config,
        pdf_parser=mock_pdf_parser,
        docx_parser=mock_docx_parser,
        chunker=mock_chunker,
        embedding_provider=mock_embedding_provider,
        vector_store=mock_vector_store,
    )


class TestSingleDocumentPipelineInit:
    """Test suite for SingleDocumentPipeline initialization."""

    def test_init_stores_dependencies(
        self,
        mock_config,
        mock_pdf_parser,
        mock_docx_parser,
        mock_chunker,
        mock_embedding_provider,
        mock_vector_store,
    ):
        """Test that dependencies are stored correctly."""
        pipeline = SingleDocumentPipeline(
            config=mock_config,
            pdf_parser=mock_pdf_parser,
            docx_parser=mock_docx_parser,
            chunker=mock_chunker,
            embedding_provider=mock_embedding_provider,
            vector_store=mock_vector_store,
        )

        assert pipeline.config == mock_config
        assert pipeline.pdf_parser == mock_pdf_parser
        assert pipeline.docx_parser == mock_docx_parser
        assert pipeline.chunker == mock_chunker
        assert pipeline.embedding_provider == mock_embedding_provider
        assert pipeline.vector_store == mock_vector_store

    def test_graph_is_built(self, single_doc_pipeline):
        """Test that the LangGraph is built."""
        assert single_doc_pipeline.graph is not None


class TestSingleDocumentPipelineNodes:
    """Test suite for SingleDocumentPipeline node methods."""

    @pytest.mark.asyncio
    async def test_validate_pdf_success(self, single_doc_pipeline, tmp_path):
        """Test successful PDF validation."""
        pdf_file = tmp_path / "test.pdf"
        pdf_file.write_bytes(b"%PDF-1.4 content")

        state = create_single_document_state(
            pdf_path=pdf_file,
            staged_path=tmp_path / "staged" / "test",
        )

        result = await single_doc_pipeline.validate_pdf(state)

        assert "error" not in result or result.get("error") is None

    @pytest.mark.asyncio
    async def test_validate_pdf_not_found(self, single_doc_pipeline, tmp_path):
        """Test PDF validation when file doesn't exist."""
        pdf_file = tmp_path / "nonexistent.pdf"

        state = create_single_document_state(
            pdf_path=pdf_file,
            staged_path=tmp_path / "staged" / "nonexistent",
        )

        result = await single_doc_pipeline.validate_pdf(state)

        assert "error" in result
        assert "not found" in result["error"]

    @pytest.mark.asyncio
    async def test_validate_pdf_empty_file(self, single_doc_pipeline, tmp_path):
        """Test PDF validation with empty file."""
        pdf_file = tmp_path / "empty.pdf"
        pdf_file.write_bytes(b"")

        state = create_single_document_state(
            pdf_path=pdf_file,
            staged_path=tmp_path / "staged" / "empty",
        )

        result = await single_doc_pipeline.validate_pdf(state)

        assert "error" in result
        assert "Empty" in result["error"]

    @pytest.mark.asyncio
    async def test_parse_pdf_success(self, single_doc_pipeline, mock_pdf_parser, tmp_path):
        """Test successful PDF parsing."""
        pdf_file = tmp_path / "test.pdf"
        pdf_file.write_bytes(b"%PDF-1.4 content")

        state = create_single_document_state(
            pdf_path=pdf_file,
            staged_path=tmp_path / "staged" / "test",
        )

        result = await single_doc_pipeline.parse_pdf(state)

        assert "parsed_document" in result
        assert result["parsed_document"][0] == pdf_file

    @pytest.mark.asyncio
    async def test_parse_pdf_skips_on_error(self, single_doc_pipeline, tmp_path):
        """Test that parse_pdf skips when there's an existing error."""
        state = create_single_document_state(
            pdf_path=tmp_path / "test.pdf",
            staged_path=tmp_path / "staged" / "test",
        )
        state["error"] = "Previous error"

        result = await single_doc_pipeline.parse_pdf(state)

        assert result == {}

    @pytest.mark.asyncio
    async def test_parse_pdf_error(self, single_doc_pipeline, mock_pdf_parser, tmp_path):
        """Test parsing when conversion fails."""
        pdf_file = tmp_path / "bad.pdf"
        pdf_file.write_bytes(b"invalid")

        state = create_single_document_state(
            pdf_path=pdf_file,
            staged_path=tmp_path / "staged" / "bad",
        )

        mock_pdf_parser.convert_pdf.side_effect = Exception("Parse error")

        result = await single_doc_pipeline.parse_pdf(state)

        assert "error" in result
        assert "Parse error" in result["error"]

    @pytest.mark.asyncio
    async def test_chunk_document_success(self, single_doc_pipeline, mock_chunker, tmp_path):
        """Test successful document chunking."""
        pdf_file = tmp_path / "test.pdf"
        mock_doc = MagicMock(spec=DoclingDocument)

        state = create_single_document_state(
            pdf_path=pdf_file,
            staged_path=tmp_path / "staged" / "test",
        )
        state["parsed_document"] = (pdf_file, mock_doc)

        result = await single_doc_pipeline.chunk_document(state)

        assert "raw_chunks" in result
        assert len(result["raw_chunks"]) == 1
        assert result["raw_chunks"][0]["source"] == str(pdf_file)

    @pytest.mark.asyncio
    async def test_embed_chunks_success(
        self, single_doc_pipeline, mock_embedding_provider, tmp_path
    ):
        """Test successful embedding generation with dual text formats."""
        state = create_single_document_state(
            pdf_path=tmp_path / "test.pdf",
            staged_path=tmp_path / "staged" / "test",
        )
        # Chunks include both embedding_input (compact) and display_text (markdown)
        state["chunked_documents"] = [
            {
                "embedding_input": f"chunk {i} compact",  # Compact for embedding
                "display_text": f"chunk {i} **markdown**",  # Markdown for display
                "content": {
                    "chunk_id": i,
                    "heading": "",
                    "headings": [],
                    "page_no": None,
                    "token_count": 0,
                },
                "source": "test.pdf",
                "document_name": "test",
            }
            for i in range(5)
        ]

        mock_embedding_provider.embed_batch = AsyncMock(
            return_value=np.random.rand(5, 1024).astype(np.float32)
        )

        result = await single_doc_pipeline.embed_chunks(state)

        assert len(result["embedded_documents"]) == 5
        assert all("embedding" in doc for doc in result["embedded_documents"])
        # Verify that "text" field uses display_text (markdown format)
        assert all("**markdown**" in doc["text"] for doc in result["embedded_documents"])

    @pytest.mark.asyncio
    async def test_upsert_to_qdrant_success(self, single_doc_pipeline, mock_vector_store, tmp_path):
        """Test successful upsert to Qdrant."""
        state = create_single_document_state(
            pdf_path=tmp_path / "test.pdf",
            staged_path=tmp_path / "staged" / "test",
        )
        state["embedded_documents"] = [
            {
                "text": f"chunk {i}",
                "embedding": [0.1] * 1024,
                "metadata": {
                    "chunk_id": i,
                    "heading": "",
                    "headings": [],
                    "page_no": None,
                    "token_count": 0,
                    "source": "test.pdf",
                    "source_format": "pdf",
                    "source_name": "test",
                },
            }
            for i in range(10)
        ]

        mock_vector_store.add_pre_embedded_documents.return_value = [f"id-{i}" for i in range(10)]

        result = await single_doc_pipeline.upsert_to_qdrant(state)

        assert result["processed_count"] == 10


class TestSingleDocumentPipelineRun:
    """Test suite for SingleDocumentPipeline.run()."""

    @pytest.mark.asyncio
    async def test_run_full_pipeline(self, single_doc_pipeline, tmp_path):
        """Test running the full pipeline for a single document."""
        pdf_file = tmp_path / "test.pdf"
        pdf_file.write_bytes(b"%PDF-1.4 content")
        staged_path = tmp_path / "staged" / "test"
        staged_path.mkdir(parents=True)

        state = create_single_document_state(
            pdf_path=pdf_file,
            staged_path=staged_path,
        )

        # Mock graph.ainvoke to return final state
        final_state = state.copy()
        final_state["processed_count"] = 10
        final_state["chunked_documents"] = [{"chunk": i} for i in range(10)]

        with patch.object(
            single_doc_pipeline.graph, "ainvoke", AsyncMock(return_value=final_state)
        ):
            result = await single_doc_pipeline.run(state)

        assert result["processed_count"] == 10


class TestParallelDocumentIngestionPipelineInit:
    """Test suite for ParallelDocumentIngestionPipeline initialization."""

    @pytest.mark.asyncio
    async def test_init_with_config(self, mock_config):
        """Test pipeline initialization with configuration.

        Note: Per-document resources (parsers, chunkers, embedding providers)
        are created inside subprocesses. Only a lightweight QdrantConnector
        is initialized here.
        """
        with patch("document_ingestion_worker.parallel_pipeline.QdrantConnector") as mock_vs:
            pipeline = ParallelDocumentIngestionPipeline(mock_config)

            assert pipeline.config == mock_config
            mock_vs.assert_called_once()


class TestParallelDocumentIngestionPipelineDiscovery:
    """Test suite for document discovery."""

    @pytest.mark.asyncio
    async def test_discover_documents_from_beginning(self, mock_config):
        """Test document discovery in beginning mode."""
        # Create test PDF files
        input_dir = mock_config.input_documents_dir
        (input_dir / "doc1.pdf").write_bytes(b"%PDF-1.4")
        (input_dir / "doc2.pdf").write_bytes(b"%PDF-1.4")

        with patch("document_ingestion_worker.parallel_pipeline.QdrantConnector"):
            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            documents = await pipeline._discover_documents()

        assert len(documents) == 2
        # Each document is a tuple of (pdf_path, staged_path)
        pdf_names = {doc[0].name for doc in documents}
        assert pdf_names == {"doc1.pdf", "doc2.pdf"}

    @pytest.mark.asyncio
    async def test_discover_documents_empty_directory(self, mock_config):
        """Test document discovery with empty directory."""
        with patch("document_ingestion_worker.parallel_pipeline.QdrantConnector"):
            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            documents = await pipeline._discover_documents()

        assert len(documents) == 0

    @pytest.mark.asyncio
    async def test_discover_for_resume_parsed(self, mock_config):
        """Test document discovery when resuming from parsed stage."""
        input_dir = mock_config.input_documents_dir
        staged_dir = mock_config.staged_documents_dir

        # Create input PDF
        (input_dir / "doc1.pdf").write_bytes(b"%PDF-1.4")

        # Create staged files for doc1
        doc1_staged = staged_dir / "doc1"
        doc1_staged.mkdir(parents=True)
        (doc1_staged / "parsed").mkdir()
        (doc1_staged / "parsed" / "doc1.json").write_text('{"content": "test"}')

        mock_config.start_from = "parsed"

        with patch("document_ingestion_worker.parallel_pipeline.QdrantConnector"):
            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            documents = await pipeline._discover_documents()

        assert len(documents) == 1
        assert documents[0][0].name == "doc1.pdf"

    @pytest.mark.asyncio
    async def test_discover_for_resume_chunked(self, mock_config):
        """Test document discovery when resuming from chunked stage."""
        input_dir = mock_config.input_documents_dir
        staged_dir = mock_config.staged_documents_dir

        # Create input PDFs
        (input_dir / "doc1.pdf").write_bytes(b"%PDF-1.4")
        (input_dir / "doc2.pdf").write_bytes(b"%PDF-1.4")

        # Create staged chunks_prepared for doc1 only
        doc1_staged = staged_dir / "doc1"
        doc1_prepared = doc1_staged / "chunks_prepared"
        doc1_prepared.mkdir(parents=True)
        (doc1_prepared / "chunk_00001.json").write_text('{"text": "chunk 1"}')
        (doc1_prepared / "chunk_00002.json").write_text('{"text": "chunk 2"}')

        # doc2 has no chunks_prepared - should be skipped
        doc2_staged = staged_dir / "doc2"
        doc2_staged.mkdir(parents=True)

        mock_config.start_from = "chunked"

        with patch("document_ingestion_worker.parallel_pipeline.QdrantConnector"):
            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            documents = await pipeline._discover_documents()

        # Only doc1 should be discovered (has chunks_prepared with files)
        assert len(documents) == 1
        assert documents[0][0].name == "doc1.pdf"

    @pytest.mark.asyncio
    async def test_discover_for_resume_chunked_empty_dir(self, mock_config):
        """Test document discovery skips empty chunks_prepared directories."""
        input_dir = mock_config.input_documents_dir
        staged_dir = mock_config.staged_documents_dir

        # Create input PDF
        (input_dir / "doc1.pdf").write_bytes(b"%PDF-1.4")

        # Create staged chunks_prepared dir but with no chunk files
        doc1_staged = staged_dir / "doc1"
        doc1_prepared = doc1_staged / "chunks_prepared"
        doc1_prepared.mkdir(parents=True)
        # Empty directory - no chunk_*.json files

        mock_config.start_from = "chunked"

        with patch("document_ingestion_worker.parallel_pipeline.QdrantConnector"):
            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            documents = await pipeline._discover_documents()

        # Should be empty - chunks_prepared exists but has no chunk files
        assert len(documents) == 0


class TestParallelDocumentIngestionPipelineRun:
    """Test suite for ParallelDocumentIngestionPipeline.run()."""

    @pytest.mark.asyncio
    async def test_run_no_documents(self, mock_config, mock_vector_store):
        """Test running pipeline with no documents."""
        with patch(
            "document_ingestion_worker.parallel_pipeline.QdrantConnector",
            return_value=mock_vector_store,
        ):
            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            results = await pipeline.run()

        assert results["total_documents"] == 0
        assert results["successful_documents"] == 0
        assert results["failed_documents"] == 0

    @pytest.mark.asyncio
    async def test_run_override_mode_clears_collection(self, mock_config, mock_vector_store):
        """Test that override mode clears the collection."""
        mock_config.mode = "override"
        input_dir = mock_config.input_documents_dir
        (input_dir / "doc1.pdf").write_bytes(b"%PDF-1.4")

        with (
            patch(
                "document_ingestion_worker.parallel_pipeline.QdrantConnector",
                return_value=mock_vector_store,
            ),
            patch.object(
                ParallelDocumentIngestionPipeline,
                "_process_documents_parallel",
                new_callable=AsyncMock,
                return_value=[],
            ),
        ):
            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            await pipeline.run()

        mock_vector_store.clear_collection.assert_called_once()
        mock_vector_store.ensure_payload_indexes.assert_awaited_once_with(
            METHODOLOGY_DOCUMENT_INDEXES
        )

    @pytest.mark.asyncio
    async def test_run_append_mode_no_clear(self, mock_config, mock_vector_store):
        """Test that append mode does not clear the collection."""
        mock_config.mode = "append"
        input_dir = mock_config.input_documents_dir
        (input_dir / "doc1.pdf").write_bytes(b"%PDF-1.4")

        with (
            patch(
                "document_ingestion_worker.parallel_pipeline.QdrantConnector",
                return_value=mock_vector_store,
            ),
            patch.object(
                ParallelDocumentIngestionPipeline,
                "_process_documents_parallel",
                new_callable=AsyncMock,
                return_value=[],
            ),
        ):
            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            await pipeline.run()

        mock_vector_store.clear_collection.assert_not_called()


class TestParallelDocumentIngestionPipelineAggregation:
    """Test suite for result aggregation."""

    def test_aggregate_results(self, mock_config, tmp_path):
        """Test result aggregation from multiple documents."""
        with patch("document_ingestion_worker.parallel_pipeline.QdrantConnector"):
            pipeline = ParallelDocumentIngestionPipeline(mock_config)

            results: list[SingleDocumentResult] = [
                {
                    "document_id": "doc1",
                    "pdf_path": tmp_path / "doc1.pdf",
                    "chunks_generated": 10,
                    "vectors_upserted": 10,
                    "status": "success",
                    "error": None,
                    "processing_time_seconds": 5.0,
                },
                {
                    "document_id": "doc2",
                    "pdf_path": tmp_path / "doc2.pdf",
                    "chunks_generated": 15,
                    "vectors_upserted": 15,
                    "status": "success",
                    "error": None,
                    "processing_time_seconds": 7.0,
                },
                {
                    "document_id": "doc3",
                    "pdf_path": tmp_path / "doc3.pdf",
                    "chunks_generated": 0,
                    "vectors_upserted": 0,
                    "status": "failed",
                    "error": "Parse error",
                    "processing_time_seconds": 1.0,
                },
            ]

            import time

            start_time = time.time() - 13.0  # Simulate 13s elapsed

            aggregated = pipeline._aggregate_results("batch-123", results, start_time)

            assert aggregated["batch_id"] == "batch-123"
            assert aggregated["total_documents"] == 3
            assert aggregated["successful_documents"] == 2
            assert aggregated["failed_documents"] == 1
            assert aggregated["total_chunks_processed"] == 25
            assert aggregated["total_vectors_upserted"] == 25
            assert len(aggregated["document_results"]) == 3
            assert len(aggregated["failed_files"]) == 1

    def test_create_empty_results(self, mock_config):
        """Test creating empty results."""
        with patch("document_ingestion_worker.parallel_pipeline.QdrantConnector"):
            pipeline = ParallelDocumentIngestionPipeline(mock_config)

            import time

            start_time = time.time()
            empty_results = pipeline._create_empty_results("empty-batch", start_time)

            assert empty_results["batch_id"] == "empty-batch"
            assert empty_results["total_documents"] == 0
            assert empty_results["successful_documents"] == 0
            assert empty_results["failed_documents"] == 0
            assert empty_results["document_results"] == []
            assert empty_results["failed_files"] == []


class TestParallelDocumentIngestionPipelineStats:
    """Test suite for get_stats method."""

    @pytest.mark.asyncio
    async def test_get_stats_success(self, mock_config, mock_vector_store):
        """Test successful stats retrieval."""
        with patch(
            "document_ingestion_worker.parallel_pipeline.QdrantConnector",
            return_value=mock_vector_store,
        ):
            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            stats = await pipeline.get_stats()

        assert stats["points_count"] == 10
        assert stats["vectors_count"] == 10

    @pytest.mark.asyncio
    async def test_get_stats_error(self, mock_config, mock_vector_store):
        """Test stats retrieval error handling."""
        mock_vector_store.get_stats.side_effect = Exception("Stats error")

        with patch(
            "document_ingestion_worker.parallel_pipeline.QdrantConnector",
            return_value=mock_vector_store,
        ):
            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            stats = await pipeline.get_stats()

        assert "error" in stats


class TestParallelDocumentIngestionPipelineClose:
    """Test suite for close method."""

    @pytest.mark.asyncio
    async def test_close_pipeline(self, mock_config, mock_vector_store):
        """Test pipeline close calls vector store close."""
        with patch(
            "document_ingestion_worker.parallel_pipeline.QdrantConnector",
            return_value=mock_vector_store,
        ):
            pipeline = ParallelDocumentIngestionPipeline(mock_config)
            await pipeline.close()

        mock_vector_store.close.assert_called_once()


class TestSingleDocumentPipelineSaveLoad:
    """Test suite for save/load functionality in SingleDocumentPipeline."""

    @pytest.mark.asyncio
    async def test_save_parsed_document(self, single_doc_pipeline, tmp_path):
        """Test saving parsed document to staged directory."""
        pdf_file = tmp_path / "test.pdf"
        staged_path = tmp_path / "staged" / "test"

        mock_doc = MagicMock(spec=DoclingDocument)
        mock_doc.export_to_dict.return_value = {"content": "test document"}

        state = create_single_document_state(
            pdf_path=pdf_file,
            staged_path=staged_path,
        )
        state["parsed_document"] = (pdf_file, mock_doc)

        result = await single_doc_pipeline.save_parsed(state)

        assert result == {}
        saved_file = staged_path / "parsed" / "test.json"
        assert saved_file.exists()

    @pytest.mark.asyncio
    async def test_load_parsed_document(self, single_doc_pipeline, tmp_path):
        """Test loading parsed document from staged directory."""
        pdf_file = tmp_path / "test.pdf"
        staged_path = tmp_path / "staged" / "test"

        # Create staged parsed file with valid DoclingDocument structure
        parsed_dir = staged_path / "parsed"
        parsed_dir.mkdir(parents=True)
        parsed_file = parsed_dir / "test.json"

        # Minimal valid DoclingDocument JSON
        valid_doc_json = json.dumps(
            {
                "schema_name": "DoclingDocument",
                "version": "1.0.0",
                "name": "test_doc",
                "origin": {
                    "filename": "test.pdf",
                    "mimetype": "application/pdf",
                    "binary_hash": 12345,
                },
                "furniture": {"self_ref": "#/furniture"},
                "body": {"self_ref": "#/body"},
                "groups": [],
                "texts": [],
                "pictures": [],
                "tables": [],
                "key_value_items": [],
                "form_items": [],
                "pages": {},
            }
        )
        parsed_file.write_text(valid_doc_json)

        state = create_single_document_state(
            pdf_path=pdf_file,
            staged_path=staged_path,
        )

        result = await single_doc_pipeline.load_parsed(state)

        assert "parsed_document" in result
        assert result["parsed_document"][0] == pdf_file

    @pytest.mark.asyncio
    async def test_load_parsed_not_found(self, single_doc_pipeline, tmp_path):
        """Test loading parsed document when file doesn't exist."""
        pdf_file = tmp_path / "test.pdf"
        staged_path = tmp_path / "staged" / "test"
        staged_path.mkdir(parents=True)

        state = create_single_document_state(
            pdf_path=pdf_file,
            staged_path=staged_path,
        )

        result = await single_doc_pipeline.load_parsed(state)

        assert "error" in result
        assert "not found" in result["error"]

    @pytest.mark.asyncio
    async def test_save_prepared_chunks(self, single_doc_pipeline, tmp_path):
        """Test saving prepared chunks with dual text formats to staged directory."""
        staged_path = tmp_path / "staged" / "test"

        state = create_single_document_state(
            pdf_path=tmp_path / "test.pdf",
            staged_path=staged_path,
        )
        # Chunks include both embedding_input (compact) and display_text (markdown)
        state["chunked_documents"] = [
            {
                "embedding_input": "chunk 1 compact",
                "display_text": "chunk 1 **markdown**",
                "content": {
                    "chunk_id": 1,
                    "heading": "",
                    "headings": [],
                    "page_no": None,
                    "token_count": 0,
                },
                "source": "test.pdf",
                "document_name": "test",
            },
            {
                "embedding_input": "chunk 2 compact",
                "display_text": "chunk 2 **markdown**",
                "content": {
                    "chunk_id": 2,
                    "heading": "",
                    "headings": [],
                    "page_no": None,
                    "token_count": 0,
                },
                "source": "test.pdf",
                "document_name": "test",
            },
        ]

        result = await single_doc_pipeline.save_prepared_chunks(state)

        assert result == {}
        # Chunks are now saved to staged_documents_dir/test/chunks_prepared
        chunks_prepared_dir = (
            single_doc_pipeline.config.staged_documents_dir / "test" / "chunks_prepared"
        )
        assert chunks_prepared_dir.exists()
        assert (chunks_prepared_dir / "chunk_00001.json").exists()
        assert (chunks_prepared_dir / "chunk_00002.json").exists()

        # Verify both text formats are saved
        with open(chunks_prepared_dir / "chunk_00001.json") as f:
            chunk = json.load(f)
        assert chunk["embedding_input"] == "chunk 1 compact"
        assert chunk["display_text"] == "chunk 1 **markdown**"

    @pytest.mark.asyncio
    async def test_load_prepared_chunks(self, single_doc_pipeline, tmp_path):
        """Test loading prepared chunks with dual text formats from staged directory."""
        # Chunks are now loaded from staged_documents_dir/test/chunks_prepared
        chunks_prepared_dir = (
            single_doc_pipeline.config.staged_documents_dir / "test" / "chunks_prepared"
        )
        chunks_prepared_dir.mkdir(parents=True)

        # Create chunk files with dual text formats
        for i in range(2):
            chunk_file = chunks_prepared_dir / f"chunk_{i + 1:05d}.json"
            chunk_file.write_text(
                json.dumps(
                    {
                        "embedding_input": f"chunk {i + 1} compact",
                        "display_text": f"chunk {i + 1} **markdown**",
                        "content": {"chunk_id": i + 1},
                        "source": "test.pdf",
                        "document_name": "test",
                    }
                )
            )

        state = create_single_document_state(
            pdf_path=tmp_path / "test.pdf",
            staged_path=tmp_path / "staged" / "test",
        )

        result = await single_doc_pipeline.load_prepared_chunks(state)

        assert "chunked_documents" in result
        assert len(result["chunked_documents"]) == 2
        # Verify both text formats are loaded
        assert result["chunked_documents"][0]["embedding_input"] == "chunk 1 compact"
        assert result["chunked_documents"][0]["display_text"] == "chunk 1 **markdown**"

    @pytest.mark.asyncio
    async def test_save_embedded_documents(self, single_doc_pipeline, tmp_path):
        """Test saving embedded documents to staged directory."""
        staged_path = tmp_path / "staged" / "test"
        state = create_single_document_state(
            pdf_path=tmp_path / "test.pdf",
            staged_path=staged_path,
        )
        state["embedded_documents"] = [
            {
                "text": "chunk 1",
                "embedding": [0.1, 0.2, 0.3],
                "metadata": {
                    "chunk_id": 1,
                    "heading": "",
                    "headings": [],
                    "page_no": None,
                    "token_count": 0,
                    "source": "test.pdf",
                    "source_format": "pdf",
                    "source_name": "test",
                },
            },
            {
                "text": "chunk 2",
                "embedding": [0.4, 0.5, 0.6],
                "metadata": {
                    "chunk_id": 2,
                    "heading": "",
                    "headings": [],
                    "page_no": None,
                    "token_count": 0,
                    "source": "test.pdf",
                    "source_format": "pdf",
                    "source_name": "test",
                },
            },
        ]

        result = await single_doc_pipeline.save_embedded_documents(state)

        assert result == {}
        # Embedded documents are saved to staged_path/chunks_embedded
        chunks_embedded_dir = staged_path / "chunks_embedded"
        assert chunks_embedded_dir.exists()
        assert (chunks_embedded_dir / "chunk_00001.json").exists()
        assert (chunks_embedded_dir / "chunk_00002.json").exists()

        # Verify content
        with open(chunks_embedded_dir / "chunk_00001.json") as f:
            doc = json.load(f)
        assert doc["text"] == "chunk 1"
        assert doc["embedding"] == [0.1, 0.2, 0.3]
        assert doc["metadata"]["source"] == "test.pdf"
