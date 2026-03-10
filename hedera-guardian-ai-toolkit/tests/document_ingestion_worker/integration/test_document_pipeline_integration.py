"""Integration tests for the parallel document ingestion pipeline.

These tests use testcontainers to automatically start a Qdrant container.
No manual Docker setup required.

Note: OCR is disabled for tests (do_ocr=False) since test PDFs have embedded text.

Run with: pytest tests/document_ingestion_worker/integration/test_document_pipeline_integration.py -v -m integration
"""

import contextlib
import logging
import shutil
from pathlib import Path

import pytest
from qdrant_client import models
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from document_ingestion_worker import ParallelDocumentIngestionPipeline
from document_ingestion_worker.config import DocumentIngestionSettings
from vector_store import QdrantConnector
from vector_store.embeddings.factory import create_embedding_provider
from vector_store.embeddings.types import EmbeddingProviderType

# Path to real PDF fixtures
FIXTURES_DIR = Path(__file__).parent.parent.parent.parent / "fixtures" / "pdfs"
REAL_METHODOLOGY_PDF = FIXTURES_DIR / "VM0042v2.1_ImprovedALM_corrected_21Jan2025-001-0201213.pdf"


def create_test_pdf(output_path: Path, content: str, title: str = "Test Document"):
    """
    Create a simple PDF file for testing.

    Args:
        output_path: Path where PDF should be saved
        content: Text content for the PDF
        title: Title of the document
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(output_path), pagesize=letter)
    width, height = letter

    # Add title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, title)

    # Add content
    c.setFont("Helvetica", 12)
    y_position = height - 100
    lines = content.split("\n")

    for line in lines:
        if y_position < 50:  # Start a new page if needed
            c.showPage()
            c.setFont("Helvetica", 12)
            y_position = height - 50

        c.drawString(50, y_position, line)
        y_position -= 20

    c.save()


@pytest.fixture
def integration_config(tmp_path, qdrant_url, request):
    """Create test configuration for integration tests.

    Uses dynamic Qdrant URL from testcontainers and unique collection names
    per test to ensure isolation.
    """
    # Generate unique collection name for test isolation
    test_id = request.node.name.replace("[", "_").replace("]", "")[:30]
    collection_name = f"test_docs_{test_id}_{id(request.node) % 10000}"

    # Create data directory structure
    data_dir = tmp_path / "data"

    config = DocumentIngestionSettings(
        qdrant_url=qdrant_url,
        qdrant_collection_name=collection_name,
        qdrant_api_key=None,
        embedding_model_name="aapot/bge-m3-onnx",
        embedding_batch_size=10,
        vector_upsert_batch_size=50,
        data_dir=data_dir,
        max_parallel_files=1,  # Sequential processing to avoid native library crashes on Windows
        log_level="INFO",
        mode="append",  # Use append for integration tests (don't clear existing data)
        do_ocr=False,  # Disable OCR for tests (test PDFs have embedded text)
        start_from="beginning",  # Override env var to run full pipeline
    )

    # Create directories
    config.input_documents_dir.mkdir(parents=True, exist_ok=True)
    config.staged_documents_dir.mkdir(parents=True, exist_ok=True)

    return config


@pytest.fixture
def real_pdf_config(tmp_path, qdrant_url, request):
    """Create test configuration using real PDF fixture.

    Uses dynamic Qdrant URL from testcontainers and unique collection names
    per test to ensure isolation.
    """
    if not REAL_METHODOLOGY_PDF.exists():
        pytest.skip(f"Real PDF fixture not found: {REAL_METHODOLOGY_PDF}")

    # Generate unique collection name for test isolation
    test_id = request.node.name.replace("[", "_").replace("]", "")[:30]
    collection_name = f"test_realpdf_{test_id}_{id(request.node) % 10000}"

    # Create data directory structure
    data_dir = tmp_path / "data"

    config = DocumentIngestionSettings(
        qdrant_url=qdrant_url,
        qdrant_collection_name=collection_name,
        qdrant_api_key=None,
        embedding_model_name="aapot/bge-m3-onnx",
        embedding_batch_size=10,
        vector_upsert_batch_size=50,
        data_dir=data_dir,
        max_parallel_files=1,  # Sequential processing to avoid native library crashes on Windows
        log_level="INFO",
        mode="append",
        do_ocr=False,
        start_from="beginning",  # Override env var to run full pipeline
    )

    # Create directories
    config.input_documents_dir.mkdir(parents=True, exist_ok=True)
    config.staged_documents_dir.mkdir(parents=True, exist_ok=True)

    # Copy real PDF to input directory
    shutil.copy(REAL_METHODOLOGY_PDF, config.input_documents_dir / REAL_METHODOLOGY_PDF.name)

    return config


@pytest.fixture
def sample_pdf_files(integration_config):
    """Create sample PDF files for testing."""
    config = integration_config

    # Create first test PDF about climate change
    create_test_pdf(
        config.input_documents_dir / "climate_methodology.pdf",
        """Climate Change Mitigation Methodology

This methodology provides guidance on measuring greenhouse gas emissions.
It covers scope 1, 2, and 3 emissions calculations.

Key principles:
- Accuracy and transparency
- Completeness of coverage
- Consistency over time
- Relevance to stakeholders

The methodology is designed to support carbon credit projects.""",
        title="Climate Methodology",
    )

    # Create second test PDF about forestry
    create_test_pdf(
        config.input_documents_dir / "forestry_protocol.pdf",
        """Forestry Carbon Sequestration Protocol

This protocol defines procedures for forest carbon projects.
It includes baseline establishment and monitoring requirements.

Eligibility criteria:
- Minimum project area: 10 hectares
- Monitoring period: 30 years minimum
- Native species preferred

Carbon stock estimation methods are provided in Annex A.""",
        title="Forestry Protocol",
    )

    return config


@pytest.fixture
async def pipeline_with_cleanup(sample_pdf_files):
    """Create pipeline and ensure cleanup before and after test."""
    config = sample_pdf_files
    pipeline = ParallelDocumentIngestionPipeline(config)

    # Clear any existing data before test
    try:
        await pipeline.vector_store.clear_collection()
        logging.info("Cleared test collection before test: methodology_documents")
    except Exception as e:
        logging.warning(f"Failed to clear test collection before test: {e}")

    yield pipeline

    # Cleanup: clear the test collection after test
    try:
        await pipeline.vector_store.clear_collection()
        logging.info("Cleaned up test collection: methodology_documents")
    except Exception as e:
        logging.warning(f"Failed to cleanup test collection: {e}")

    # Close the pipeline
    await pipeline.close()


@pytest.fixture
async def search_connector(integration_config):
    """QdrantConnector with embedding_provider for search assertions.

    The pipeline's vector_store has no embedding_provider (by design — keeps
    the parent orchestrator lightweight). Tests that need to call .search()
    must use this separate connector which includes an embedding provider.
    """
    provider = create_embedding_provider(
        provider_type=EmbeddingProviderType.BGE_M3_ONNX,
        model_name=integration_config.embedding_model_name,
    )
    connector = QdrantConnector(
        url=integration_config.qdrant_url,
        collection_name=integration_config.qdrant_collection_name,
        embedding_provider=provider,
    )
    yield connector
    await connector.close()


@pytest.fixture
async def real_pdf_search_connector(real_pdf_config):
    """QdrantConnector with embedding_provider for real PDF search assertions."""
    provider = create_embedding_provider(
        provider_type=EmbeddingProviderType.BGE_M3_ONNX,
        model_name=real_pdf_config.embedding_model_name,
    )
    connector = QdrantConnector(
        url=real_pdf_config.qdrant_url,
        collection_name=real_pdf_config.qdrant_collection_name,
        embedding_provider=provider,
    )
    yield connector
    await connector.close()


@pytest.mark.integration
class TestParallelDocumentPipelineExecution:
    """Integration tests for end-to-end parallel document pipeline execution."""

    @pytest.mark.asyncio
    async def test_pipeline_end_to_end(self, pipeline_with_cleanup, sample_pdf_files):  # noqa: ARG002
        """Test complete pipeline execution from PDF processing to Qdrant storage."""
        pipeline = pipeline_with_cleanup

        # Run pipeline
        results = await pipeline.run()

        # Verify results structure
        assert "batch_id" in results
        assert results["total_documents"] == 2
        assert results["successful_documents"] == 2
        assert results["failed_documents"] == 0

        # Should have generated chunks and vectors
        assert results["total_chunks_processed"] > 0
        assert results["total_vectors_upserted"] > 0

        # Should have no failures
        assert len(results["failed_files"]) == 0

        # Should have per-document results
        assert len(results["document_results"]) == 2

    @pytest.mark.asyncio
    async def test_intermediate_files_saved(self, pipeline_with_cleanup, sample_pdf_files):
        """Test that intermediate files are saved in per-document folders.

        Files are organized in document-specific sub-folders:
        - staged_documents_dir/<doc_stem>/parsed/<doc_stem>.json (intermediate)
        - staged_documents_dir/<doc_stem>/chunks_prepared/chunk_00001.json (intermediate)
        - staged_documents_dir/<doc_stem>/chunks_embedded/chunk_00001.json (final)
        """
        pipeline = pipeline_with_cleanup
        config = sample_pdf_files

        # Run pipeline
        await pipeline.run()

        # Check parsed documents were saved in staged sub-folders
        # Note: Intermediate files may also be saved (e.g., _01_docling_raw.json)
        staged_dir = config.staged_documents_dir
        parsed_files = list(staged_dir.glob("*/parsed/*.json"))
        assert len(parsed_files) >= 2  # At least one per document

        # Check chunks_prepared were saved in staged sub-folders
        chunk_files = list(staged_dir.glob("*/chunks_prepared/chunk_*.json"))
        assert len(chunk_files) > 0

        # Check chunks_embedded were saved in staged sub-folders
        embedded_files = list(staged_dir.glob("*/chunks_embedded/chunk_*.json"))
        assert len(embedded_files) > 0

        # Check structure files exist in staged folder
        # Structure may or may not be generated depending on PDF content
        # So we don't assert a specific count
        _ = list(staged_dir.glob("*/structure.json"))

    @pytest.mark.asyncio
    async def test_verify_vectors_in_qdrant(self, pipeline_with_cleanup):
        """Test that vectors are properly stored in Qdrant."""
        pipeline = pipeline_with_cleanup

        # Run pipeline
        results = await pipeline.run()

        # Get collection stats
        stats = await pipeline.vector_store.get_stats()

        expected_count = results["total_vectors_upserted"]
        assert stats.points_count == expected_count
        assert stats.config["vector_size"] == 1024  # BAAI/bge-m3 dimension

    @pytest.mark.asyncio
    async def test_semantic_search_climate_content(self, pipeline_with_cleanup, search_connector):
        """Test semantic search for climate-related content."""
        pipeline = pipeline_with_cleanup

        # Run pipeline to populate database
        await pipeline.run()

        # Search for climate-related content (use search_connector which has embedding_provider)
        climate_results = await search_connector.search(
            "greenhouse gas emissions measurement", limit=5
        )

        assert len(climate_results) > 0

        # Verify that we got relevant results
        # At least one result should mention climate or emissions
        # Text is in result.content (not metadata["content"]["text"])
        result_texts = [r.content.lower() for r in climate_results]
        assert any(
            "greenhouse" in text or "emissions" in text or "climate" in text
            for text in result_texts
        )

    @pytest.mark.asyncio
    async def test_semantic_search_forestry_content(self, pipeline_with_cleanup, search_connector):
        """Test semantic search for forestry-related content."""
        pipeline = pipeline_with_cleanup

        # Run pipeline to populate database
        await pipeline.run()

        # Search for forestry-related content (use search_connector which has embedding_provider)
        forestry_results = await search_connector.search(
            "forest carbon sequestration projects", limit=5
        )

        assert len(forestry_results) > 0

        # Verify that we got relevant results
        # Text is in result.content (not metadata["content"]["text"])
        result_texts = [r.content.lower() for r in forestry_results]
        assert any(
            "forest" in text or "carbon" in text or "sequestration" in text for text in result_texts
        )

    @pytest.mark.asyncio
    async def test_search_with_source_filter(self, pipeline_with_cleanup, search_connector):
        """Test search with metadata filters for specific documents."""
        pipeline = pipeline_with_cleanup

        # Run pipeline
        await pipeline.run()

        # Search with source filter (only climate methodology)
        source_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="metadata.source",
                    match=models.MatchText(text="climate_methodology.pdf"),
                )
            ]
        )

        # Use search_connector which has embedding_provider
        filtered_results = await search_connector.search(
            "methodology", limit=10, query_filter=source_filter
        )

        assert len(filtered_results) > 0

        # All results should be from climate_methodology.pdf
        for result in filtered_results:
            assert "climate_methodology.pdf" in result.metadata["source"]

    @pytest.mark.asyncio
    async def test_override_mode(self, sample_pdf_files):
        """Test pipeline in override mode clears existing data."""
        config = sample_pdf_files

        # First run in append mode
        config.mode = "append"
        pipeline1 = ParallelDocumentIngestionPipeline(config)

        with contextlib.suppress(Exception):
            await pipeline1.vector_store.clear_collection()

        results1 = await pipeline1.run()
        count_after_first_run = results1["total_vectors_upserted"]
        await pipeline1.close()

        # Second run in override mode should clear and re-add
        config2 = DocumentIngestionSettings(
            qdrant_url=config.qdrant_url,
            qdrant_api_key=config.qdrant_api_key,
            qdrant_collection_name=config.qdrant_collection_name,
            embedding_model_name=config.embedding_model_name,
            embedding_batch_size=config.embedding_batch_size,
            vector_upsert_batch_size=config.vector_upsert_batch_size,
            data_dir=config.data_dir,
            max_parallel_files=config.max_parallel_files,
            log_level=config.log_level,
            mode="override",
            do_ocr=config.do_ocr,
        )

        pipeline2 = ParallelDocumentIngestionPipeline(config2)

        results2 = await pipeline2.run()
        count_after_second_run = results2["total_vectors_upserted"]

        # Counts should be the same (override cleared and re-added)
        assert count_after_second_run == count_after_first_run

        # Verify collection stats
        stats = await pipeline2.vector_store.get_stats()
        assert stats.points_count == count_after_second_run

        await pipeline2.vector_store.clear_collection()
        await pipeline2.close()

    @pytest.mark.asyncio
    async def test_per_document_results(self, pipeline_with_cleanup):
        """Test that per-document results are returned correctly."""
        pipeline = pipeline_with_cleanup

        # Run pipeline
        results = await pipeline.run()

        # Check document results
        doc_results = results["document_results"]
        assert len(doc_results) == 2

        for doc_result in doc_results:
            assert "document_id" in doc_result
            assert "pdf_path" in doc_result
            assert "chunks_generated" in doc_result
            assert "vectors_upserted" in doc_result
            assert "status" in doc_result
            assert "processing_time_seconds" in doc_result

            # All documents should be successful
            assert doc_result["status"] == "success"
            assert doc_result["chunks_generated"] > 0
            assert doc_result["vectors_upserted"] > 0


@pytest.mark.integration
class TestParallelDocumentPipelineEdgeCases:
    """Integration tests for edge cases and error conditions."""

    @pytest.mark.asyncio
    async def test_empty_directory(self, integration_config):
        """Test pipeline with empty PDF directory."""
        config = integration_config

        # input_documents_dir is already empty from fixture
        pipeline = ParallelDocumentIngestionPipeline(config)

        try:
            results = await pipeline.run()

            # Should complete successfully with no files processed
            assert results["total_documents"] == 0
            assert results["successful_documents"] == 0
            assert results["failed_documents"] == 0

        finally:
            await pipeline.close()

    @pytest.mark.asyncio
    async def test_error_handling_invalid_pdf(self, integration_config):
        """Test pipeline handles invalid PDF files gracefully."""
        config = integration_config

        # Create a valid PDF
        create_test_pdf(config.input_documents_dir / "valid.pdf", "Valid content", "Valid Doc")

        # Create an invalid "PDF" (just text file with .pdf extension)
        (config.input_documents_dir / "invalid.pdf").write_text("This is not a valid PDF")

        pipeline = ParallelDocumentIngestionPipeline(config)

        try:
            # Run pipeline
            results = await pipeline.run()

            # Should have processed 2 documents
            assert results["total_documents"] == 2

            # Should have at least 1 successful and 1 failed
            # (invalid PDF might be handled by Docling or fail)
            assert results["successful_documents"] >= 1

        finally:
            await pipeline.close()

    @pytest.mark.asyncio
    async def test_batch_processing(self, integration_config):
        """Test pipeline handles multiple PDFs with batching."""
        config = integration_config

        # Set small batch sizes to force batching
        config.embedding_batch_size = 2
        config.vector_upsert_batch_size = 3

        # Create 3 small PDFs
        for i in range(3):
            create_test_pdf(
                config.input_documents_dir / f"doc{i}.pdf",
                f"Document {i} content.\nSome test text for chunking and embedding.",
                f"Document {i}",
            )

        pipeline = ParallelDocumentIngestionPipeline(config)

        try:
            # Clear collection before test to ensure clean state
            with contextlib.suppress(Exception):
                await pipeline.vector_store.clear_collection()

            # Run pipeline
            results = await pipeline.run()

            # Should have processed all 3 PDFs
            assert results["total_documents"] == 3
            assert results["successful_documents"] == 3
            assert results["total_vectors_upserted"] > 0

            # Verify all chunks were stored in Qdrant
            stats = await pipeline.vector_store.get_stats()
            assert stats.points_count == results["total_vectors_upserted"]

        finally:
            await pipeline.vector_store.clear_collection()
            await pipeline.close()

    @pytest.mark.asyncio
    async def test_large_pdf_chunking(self, integration_config):
        """Test pipeline handles large documents that generate multiple chunks."""
        config = integration_config

        # Create a PDF with structured content that will produce multiple chunks
        sections = []
        for section_num in range(5):
            section_title = f"Section {section_num + 1}: Topic Overview"
            section_content = "\n".join(
                [
                    f"This is paragraph {i} of section {section_num + 1}. "
                    f"It contains detailed information about the topic being discussed. "
                    f"The content here is designed to generate meaningful chunks for embedding."
                    for i in range(20)
                ]
            )
            sections.append(f"{section_title}\n\n{section_content}")

        large_content = "\n\n".join(sections)
        create_test_pdf(
            config.input_documents_dir / "large_doc.pdf",
            large_content,
            "Large Structured Document",
        )

        pipeline = ParallelDocumentIngestionPipeline(config)

        try:
            # Clear collection before test
            with contextlib.suppress(Exception):
                await pipeline.vector_store.clear_collection()

            results = await pipeline.run()

            # Should have processed the PDF successfully
            assert results["total_documents"] == 1
            assert results["successful_documents"] == 1

            # Should have generated at least one chunk
            assert results["total_chunks_processed"] >= 1

            # All chunks should be stored
            assert results["total_vectors_upserted"] == results["total_chunks_processed"]

            # Verify data is in Qdrant
            stats = await pipeline.vector_store.get_stats()
            assert stats.points_count == results["total_vectors_upserted"]

        finally:
            await pipeline.vector_store.clear_collection()
            await pipeline.close()


@pytest.mark.integration
class TestParallelDocumentPipelineWithRealPDF:
    """Integration tests using real PDF methodology document."""

    @pytest.mark.asyncio
    async def test_real_pdf_end_to_end(self, real_pdf_config):
        """Test complete pipeline with a real methodology PDF document."""
        config = real_pdf_config

        pipeline = ParallelDocumentIngestionPipeline(config)

        try:
            # Clear collection before test
            with contextlib.suppress(Exception):
                await pipeline.vector_store.clear_collection()

            results = await pipeline.run()

            # Should have processed the real PDF
            assert results["total_documents"] == 1
            assert results["successful_documents"] == 1
            assert results["failed_documents"] == 0

            # Real PDF should produce multiple chunks
            assert results["total_chunks_processed"] > 1

            # All chunks should be stored
            assert results["total_vectors_upserted"] == results["total_chunks_processed"]

            # Verify in Qdrant
            stats = await pipeline.vector_store.get_stats()
            assert stats.points_count == results["total_vectors_upserted"]

        finally:
            await pipeline.vector_store.clear_collection()
            await pipeline.close()

    @pytest.mark.asyncio
    async def test_real_pdf_semantic_search(self, real_pdf_config, real_pdf_search_connector):
        """Test semantic search works correctly with real methodology content."""
        config = real_pdf_config

        pipeline = ParallelDocumentIngestionPipeline(config)

        try:
            # Clear and run pipeline
            with contextlib.suppress(Exception):
                await pipeline.vector_store.clear_collection()

            await pipeline.run()

            # Search for methodology-related content
            results = await real_pdf_search_connector.search(
                "carbon credit methodology baseline", limit=5
            )

            assert len(results) > 0, "Should find relevant content in real methodology PDF"

            # Results should have proper structure
            # - result.content holds the text
            # - result.metadata has flat structure (chunk_id, heading, source, etc.)
            for result in results:
                assert result.content is not None
                assert len(result.content) > 0
                assert result.metadata is not None
                assert "source" in result.metadata

        finally:
            await pipeline.vector_store.clear_collection()
            await pipeline.close()

    @pytest.mark.asyncio
    async def test_real_pdf_source_name_in_chunks(self, real_pdf_config, real_pdf_search_connector):
        """Test that source_name field is added to chunks at metadata root level."""
        config = real_pdf_config

        pipeline = ParallelDocumentIngestionPipeline(config)

        try:
            # Clear and run pipeline
            with contextlib.suppress(Exception):
                await pipeline.vector_store.clear_collection()

            await pipeline.run()

            # Search and check chunk metadata
            results = await real_pdf_search_connector.search("methodology", limit=5)

            assert len(results) > 0

            for result in results:
                # source_name should be at metadata root level (same level as source)
                source_name = result.metadata.get("source_name")
                assert source_name is not None, "source_name should be in metadata root"
                assert isinstance(source_name, str)

        finally:
            await pipeline.vector_store.clear_collection()
            await pipeline.close()
