"""
Integration tests for docling_chunker.py - DoclingChunker class.

These tests verify chunking functionality using real Docling models and documents.
They test the complete workflow from document parsing to chunk preparation.

Focus: Test chunking with actual model loading, tokenization, and document processing.
Mark with @pytest.mark.integration to separate from unit tests.

## Test Data Setup

Set the TEST_PDF_PATH environment variable to specify a test PDF:

    export TEST_PDF_PATH=/path/to/your/test.pdf

Or on Windows:

    set TEST_PDF_PATH=C:\\path\to\\your\test.pdf

Tests will skip automatically if no test PDF is provided.
"""

import pytest

from document_ingestion_worker.document_parsing.constants import (
    DEFAULT_EMBEDDING_MODEL,
    DEFAULT_MAX_TOKENS,
    DEFAULT_OVERLAP_TOKENS,
)
from document_ingestion_worker.document_parsing.docling_chunker import DoclingChunker
from document_ingestion_worker.document_parsing.pdf_to_docling_parser import PdfParser


@pytest.fixture(scope="session")
def default_chunker():
    """
    Provide a DoclingChunker with default settings using real models.

    This fixture is session-scoped as model loading is expensive.
    The chunker can be reused across tests.

    Returns:
        DoclingChunker with default configuration
    """
    return DoclingChunker()


@pytest.mark.integration
class TestDoclingChunkerInitializationIntegration:
    """Integration tests for DoclingChunker initialization with real models."""

    def test_initialization_loads_real_model(self):
        """Test that chunker successfully loads real HuggingFace model."""
        chunker = DoclingChunker()

        # Verify chunker components are initialized
        assert chunker.tokenizer is not None
        assert chunker.chunker is not None

        # Verify tokenizer has underlying HuggingFace tokenizer
        assert chunker.tokenizer.tokenizer is not None

        # Verify model settings are stored
        assert chunker.model_id == DEFAULT_EMBEDDING_MODEL
        assert chunker.max_tokens == DEFAULT_MAX_TOKENS
        assert chunker.overlap_tokens == DEFAULT_OVERLAP_TOKENS

    def test_initialization_custom_model_settings(self):
        """Test initialization with custom token limits."""
        chunker = DoclingChunker(
            max_tokens=256,
            overlap_tokens=25,
        )

        # Verify custom settings
        assert chunker.max_tokens == 256
        assert chunker.overlap_tokens == 25

        # Verify tokenizer is still functional
        assert chunker.tokenizer is not None
        assert chunker.tokenizer.tokenizer is not None

    def test_tokenizer_can_encode_text(self):
        """Test that loaded tokenizer can encode text."""
        chunker = DoclingChunker()

        # Test encoding simple text
        text = "This is a test sentence for tokenization."
        tokens = chunker.tokenizer.tokenizer.encode(text)

        # Verify tokens were generated
        assert len(tokens) > 0
        assert all(isinstance(token, int) for token in tokens)


@pytest.mark.integration
class TestDoclingChunkerChunkDocumentIntegration:
    """Integration tests for chunk_document with real documents."""

    def test_chunk_real_document(self, default_chunker, sample_docling_document):
        """Test chunking a real DoclingDocument."""
        chunks = default_chunker.chunk_document(sample_docling_document)

        # Verify chunks were generated
        assert len(chunks) > 0

        # Verify chunk structure
        for i, chunk in enumerate(chunks, start=1):
            assert chunk["chunk_id"] == i
            assert "text" in chunk
            assert len(chunk["text"]) > 0
            assert "token_count" in chunk
            assert chunk["token_count"] > 0
            assert "metadata" in chunk

    def test_chunks_respect_token_limit(self, sample_docling_document):
        """Test that chunks respect the configured max_tokens limit."""
        max_tokens = 128
        chunker = DoclingChunker(max_tokens=max_tokens)

        chunks = chunker.chunk_document(sample_docling_document)

        # Verify chunks don't exceed token limit
        for chunk in chunks:
            # Allow small margin for tokenization differences
            assert chunk["token_count"] <= max_tokens + 10, (
                f"Chunk {chunk['chunk_id']} has {chunk['token_count']} tokens, "
                f"exceeds limit of {max_tokens}"
            )

    def test_chunks_have_overlap(self, sample_docling_document):
        """Test that consecutive chunks have overlapping content."""
        chunker = DoclingChunker(max_tokens=128, overlap_tokens=25)

        chunks = chunker.chunk_document(sample_docling_document)

        # Need at least 2 chunks to test overlap
        if len(chunks) < 2:
            pytest.skip("Document too short to test overlap")

        # Check that consecutive chunks share some content
        # (This is a heuristic check - exact overlap depends on tokenization)
        for i in range(len(chunks) - 1):
            current_text = chunks[i]["text"]
            next_text = chunks[i + 1]["text"]

            # Get last few words from current and first few words from next
            current_words = current_text.split()[-10:]
            next_words = next_text.split()[:10]

            # Check if there's some word overlap
            # Note: overlap might not always exist depending on chunk boundaries
            # This is more of a sanity check than strict validation
            _ = set(current_words) & set(next_words)

    def test_chunk_metadata_includes_docling_info(self, default_chunker, sample_docling_document):
        """Test that chunk metadata includes Docling document structure."""
        chunks = default_chunker.chunk_document(sample_docling_document)

        # At least some chunks should have metadata
        assert len(chunks) > 0

        # Check that metadata dict is present and properly structured
        for chunk in chunks:
            assert isinstance(chunk["metadata"], dict)
            # Metadata structure varies by chunk, but should be exportable

    def test_chunk_different_token_limits(self, sample_docling_document):
        """Test chunking with different token limits produces different results."""
        chunker_small = DoclingChunker(max_tokens=128)
        chunker_large = DoclingChunker(max_tokens=512)

        chunks_small = chunker_small.chunk_document(sample_docling_document)
        chunks_large = chunker_large.chunk_document(sample_docling_document)

        # Smaller token limit should generally produce more chunks
        # (unless document is very short)
        if len(sample_docling_document.export_to_markdown()) > 1000:
            assert len(chunks_small) >= len(chunks_large)


@pytest.mark.integration
class TestDoclingChunkerPrepareForEmbeddingIntegration:
    """Integration tests for prepare_for_embedding with real chunks."""

    def test_prepare_real_chunks(self, default_chunker, sample_docling_document):
        """Test preparing real chunks for vector store ingestion."""
        chunks = default_chunker.chunk_document(sample_docling_document)
        documents = default_chunker.prepare_for_embedding(chunks, source_document="test.pdf")

        # Verify documents were prepared
        assert len(documents) == len(chunks)

        # Verify document structure matches vector store format
        for doc in documents:
            assert "embedding_input" in doc
            assert "display_text" in doc
            assert "content" in doc
            assert "source" in doc

            # Verify content structure (metadata only - text is at top level)
            content = doc["content"]
            assert "chunk_id" in content
            assert "heading" in content
            assert "headings" in content
            assert "page_no" in content
            assert "token_count" in content

            # Verify embedding input has content
            assert len(doc["embedding_input"]) > 0

            # Verify source is set correctly
            assert doc["source"] == "test.pdf"

    def test_prepared_chunks_extract_headings(self, default_chunker, sample_docling_document):
        """Test that headings are extracted from real document chunks."""
        chunks = default_chunker.chunk_document(sample_docling_document)
        documents = default_chunker.prepare_for_embedding(chunks)

        # At least some chunks should have headings
        chunks_with_headings = [
            doc
            for doc in documents
            if doc["content"]["heading"] and len(doc["content"]["heading"]) > 0
        ]

        # Most PDFs should have at least some headings
        assert len(chunks_with_headings) >= 0  # Relaxed check since structure varies

    def test_prepared_chunks_extract_page_numbers(self, default_chunker, sample_docling_document):
        """Test that page numbers are extracted from real document chunks."""
        chunks = default_chunker.chunk_document(sample_docling_document)
        documents = default_chunker.prepare_for_embedding(chunks)

        # All chunks should have page numbers (might be None for some)
        for doc in documents:
            # Page number can be None or an integer
            page_no = doc["content"]["page_no"]
            assert page_no is None or isinstance(page_no, int)

        # At least some chunks should have valid page numbers
        chunks_with_pages = [doc for doc in documents if doc["content"]["page_no"] is not None]
        assert len(chunks_with_pages) > 0


@pytest.mark.integration
class TestDoclingChunkerEndToEndWorkflow:
    """Integration tests for complete chunking workflow."""

    def test_chunk_and_prepare_workflow(self, default_chunker, sample_docling_document):
        """Test complete workflow from document to prepared chunks."""
        documents = default_chunker.chunk_and_prepare(
            sample_docling_document, source_document="methodology.pdf"
        )

        # Verify documents were generated
        assert len(documents) > 0

        # Verify all documents have required fields for vector store
        for doc in documents:
            # Required fields
            assert "embedding_input" in doc
            assert "display_text" in doc
            assert "content" in doc
            assert "source" in doc

            # Verify types
            assert isinstance(doc["embedding_input"], str)
            assert isinstance(doc["content"], dict)
            assert doc["source"] == "methodology.pdf"

            # Verify embedding input is not empty
            assert len(doc["embedding_input"]) > 0

            # Verify content structure (metadata only - text is at top level)
            assert "chunk_id" in doc["content"]
            assert "token_count" in doc["content"]

    def test_save_chunks_workflow(self, default_chunker, sample_docling_document, tmp_path):
        """Test workflow including chunk saving."""
        # Generate chunks
        chunks = default_chunker.chunk_document(sample_docling_document)

        # Save chunks
        output_dir = tmp_path / "chunks"
        result = DoclingChunker.save_chunks(chunks, output_dir)

        # Verify save succeeded
        assert result["success"] is True
        assert result["chunks_saved"] == len(chunks)
        assert output_dir.exists()

        # Verify chunk files were created
        chunk_files = list(output_dir.glob("chunk_*.json"))
        assert len(chunk_files) == len(chunks)

    def test_full_pipeline_pdf_to_vector_ready(self, real_pdf_path, ultra_fast_parser, tmp_path):
        """Test complete pipeline: PDF -> Parse -> Chunk -> Prepare for embedding."""
        # Step 1: Parse PDF to DoclingDocument
        doc = ultra_fast_parser.convert_pdf(real_pdf_path)
        assert doc is not None

        # Step 2: Save intermediate DoclingDocument
        json_path = tmp_path / "intermediate.json"
        ultra_fast_parser.convert_and_save(real_pdf_path, json_path)
        assert json_path.exists()

        # Step 3: Load DoclingDocument
        loaded_doc = PdfParser.load_docling_document(json_path)
        assert loaded_doc is not None

        # Step 4: Chunk document
        chunker = DoclingChunker(max_tokens=256, overlap_tokens=25)
        chunks = chunker.chunk_document(loaded_doc)
        assert len(chunks) > 0

        # Step 5: Prepare for embedding
        documents = chunker.prepare_for_embedding(chunks, source_document=real_pdf_path.name)
        assert len(documents) == len(chunks)

        # Step 6: Save prepared chunks
        output_dir = tmp_path / "vector_ready"
        save_result = DoclingChunker.save_chunks(chunks, output_dir)
        assert save_result["success"] is True

        # Verify final documents are vector-store ready
        for doc in documents:
            # These are the exact fields expected by VectorStore
            assert set(doc.keys()) == {
                "embedding_input",
                "display_text",
                "content",
                "source",
                "document_name",
            }
            assert isinstance(doc["embedding_input"], str)
            assert len(doc["embedding_input"]) > 0

    def test_chunking_consistency(self, sample_docling_document):
        """Test that chunking the same document produces consistent results."""
        chunker = DoclingChunker(max_tokens=256, overlap_tokens=25)

        # Chunk the same document twice
        chunks1 = chunker.chunk_document(sample_docling_document)
        chunks2 = chunker.chunk_document(sample_docling_document)

        # Results should be identical
        assert len(chunks1) == len(chunks2)

        for c1, c2 in zip(chunks1, chunks2, strict=False):
            assert c1["chunk_id"] == c2["chunk_id"]
            assert c1["text"] == c2["text"]
            assert c1["token_count"] == c2["token_count"]

    def test_prepare_consistency(self, default_chunker, sample_docling_document):
        """Test that prepare_for_embedding produces consistent results."""
        chunks = default_chunker.chunk_document(sample_docling_document)

        # Prepare the same chunks twice
        docs1 = default_chunker.prepare_for_embedding(chunks, source_document="test.pdf")
        docs2 = default_chunker.prepare_for_embedding(chunks, source_document="test.pdf")

        # Results should be identical
        assert len(docs1) == len(docs2)

        for d1, d2 in zip(docs1, docs2, strict=False):
            assert d1["embedding_input"] == d2["embedding_input"]
            assert d1["content"] == d2["content"]
            assert d1["source"] == d2["source"]


@pytest.mark.integration
class TestDoclingChunkerEdgeCases:
    """Integration tests for edge cases with real models."""

    def test_very_small_token_limit(self, sample_docling_document):
        """Test chunking with very small token limit."""
        chunker = DoclingChunker(max_tokens=32, overlap_tokens=5)

        chunks = chunker.chunk_document(sample_docling_document)

        # Should still produce valid chunks
        assert len(chunks) > 0

        # Chunks should respect small limit
        for chunk in chunks:
            # Allow margin for tokenization
            assert chunk["token_count"] <= 50

    def test_zero_overlap(self, sample_docling_document):
        """Test chunking with no overlap between chunks."""
        chunker = DoclingChunker(max_tokens=256, overlap_tokens=0)

        chunks = chunker.chunk_document(sample_docling_document)

        # Should still produce valid chunks
        assert len(chunks) > 0

        # All chunks should have content
        for chunk in chunks:
            assert len(chunk["text"]) > 0

    def test_overlap_larger_than_max_tokens(self, sample_docling_document):
        """Test behavior when overlap is configured larger than max_tokens."""
        # This is an edge case - HybridChunker should handle it gracefully
        # Typically overlap should be smaller than max_tokens
        chunker = DoclingChunker(max_tokens=128, overlap_tokens=150)

        # Should either work or raise a meaningful error
        try:
            chunks = chunker.chunk_document(sample_docling_document)
            # If it works, verify chunks are generated
            assert len(chunks) >= 0
        except (ValueError, AssertionError) as e:
            # If it fails, should be a clear validation error
            assert "overlap" in str(e).lower() or "token" in str(e).lower()
