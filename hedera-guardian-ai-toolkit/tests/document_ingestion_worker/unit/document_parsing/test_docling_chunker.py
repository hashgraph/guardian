"""
Unit tests for docling_chunker.py - DoclingChunker class.

These tests use mocked Docling components and tokenizers to avoid model dependencies.
"""

import json
from unittest.mock import Mock, patch

from document_ingestion_worker.document_parsing.constants import DEFAULT_EMBEDDING_MODEL
from document_ingestion_worker.document_parsing.docling_chunker import DoclingChunker


class TestDoclingChunkerInitialization:
    """Test suite for DoclingChunker initialization."""

    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_initialization_default_settings(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class
    ):
        """Test that chunker initializes with default settings."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        assert chunker.model_id == DEFAULT_EMBEDDING_MODEL
        assert chunker.max_tokens == 5000
        assert chunker.overlap_tokens == 0

    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_initialization_custom_settings(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class
    ):
        """Test initialization with custom settings."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker(
            model_id="custom-model",
            max_tokens=256,
            overlap_tokens=25,
        )

        assert chunker.model_id == "custom-model"
        assert chunker.max_tokens == 256
        assert chunker.overlap_tokens == 25

    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    def test_initialization_creates_tokenizer(
        self, mock_hf_tokenizer_class, mock_chunker_class, mock_tokenizer_class
    ):
        """Test that tokenizer is created correctly."""
        mock_auto_tokenizer = Mock()
        mock_tokenizer_class.from_pretrained.return_value = mock_auto_tokenizer

        _chunker = DoclingChunker(model_id="test-model", max_tokens=128, overlap_tokens=10)

        # AutoTokenizer should be loaded
        mock_tokenizer_class.from_pretrained.assert_called_once_with("test-model")

        # HuggingFaceTokenizer should be created with correct params
        mock_hf_tokenizer_class.assert_called_once()
        call_kwargs = mock_hf_tokenizer_class.call_args[1]
        assert call_kwargs["tokenizer"] == mock_auto_tokenizer
        assert call_kwargs["max_tokens"] == 128
        assert call_kwargs["overlap_tokens"] == 10

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_initialization_creates_chunker(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test that HybridChunker is created (twice: for embedding and display)."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        _chunker = DoclingChunker()

        # HybridChunker should be created twice (primary chunker + display_chunker)
        assert mock_chunker_class.call_count == 2
        # Both should have tokenizer
        for call in mock_chunker_class.call_args_list:
            assert "tokenizer" in call[1]


class TestDoclingChunkerChunkDocument:
    """Test suite for chunk_document method."""

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_chunk_document_success(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test successful document chunking with dual serialization."""
        # Mock tokenizer
        mock_tokenizer = Mock()
        mock_tokenizer.encode.side_effect = lambda text: [1] * len(text.split())
        mock_tokenizer_class.from_pretrained.return_value = mock_tokenizer

        # Mock HuggingFaceTokenizer
        mock_hf_tokenizer = Mock()
        mock_hf_tokenizer.tokenizer = mock_tokenizer
        mock_hf_tokenizer_class.return_value = mock_hf_tokenizer

        # Mock chunks with proper meta structure for _extract_chunk_metadata
        mock_prov1 = Mock()
        mock_prov1.page_no = 1
        mock_prov1.bbox = None

        mock_doc_item1 = Mock()
        mock_doc_item1.prov = [mock_prov1]
        mock_doc_item1.label = None

        mock_meta1 = Mock()
        mock_meta1.headings = []
        mock_meta1.doc_items = [mock_doc_item1]

        mock_chunk1 = Mock()
        mock_chunk1.text = "First chunk text"
        mock_chunk1.meta = mock_meta1

        mock_prov2 = Mock()
        mock_prov2.page_no = 2
        mock_prov2.bbox = None

        mock_doc_item2 = Mock()
        mock_doc_item2.prov = [mock_prov2]
        mock_doc_item2.label = None

        mock_meta2 = Mock()
        mock_meta2.headings = []
        mock_meta2.doc_items = [mock_doc_item2]

        mock_chunk2 = Mock()
        mock_chunk2.text = "Second chunk text"
        mock_chunk2.meta = mock_meta2

        # Create separate mock instances for primary and display chunkers
        mock_primary_chunker = Mock()
        # primary_chunker is not used anymore

        mock_display_chunker = Mock()
        mock_display_chunker.chunk.return_value = [mock_chunk1, mock_chunk2]
        mock_display_chunker.contextualize.side_effect = lambda c: c.text

        # Return different instances for each HybridChunker call
        mock_chunker_class.side_effect = [mock_primary_chunker, mock_display_chunker]

        # Create chunker and chunk document
        chunker = DoclingChunker()
        mock_doc = Mock()
        result = chunker.chunk_document(mock_doc)

        # Only display_chunker should be called (simplified: same text for both)
        mock_primary_chunker.chunk.assert_not_called()
        mock_display_chunker.chunk.assert_called_once_with(mock_doc)

        # Should return list of chunk dictionaries with same text for both
        assert len(result) == 2

        # First chunk - both text and embedding_text are the same
        assert result[0]["chunk_id"] == 1
        assert result[0]["text"] == "First chunk text"
        assert result[0]["embedding_text"] == "First chunk text"  # Same as text
        assert result[0]["token_count"] == 3
        assert result[0]["metadata"] == {
            "meta": {"headings": [], "doc_items": [{"prov": [{"page_no": 1}]}]}
        }

        # Second chunk
        assert result[1]["chunk_id"] == 2
        assert result[1]["text"] == "Second chunk text"
        assert result[1]["embedding_text"] == "Second chunk text"  # Same as text
        assert result[1]["token_count"] == 3

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_chunk_document_empty_document(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test chunking empty document returns empty list."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        mock_chunker_instance = Mock()
        mock_chunker_instance.chunk.return_value = []
        mock_chunker_class.return_value = mock_chunker_instance

        chunker = DoclingChunker()
        mock_doc = Mock()
        result = chunker.chunk_document(mock_doc)

        assert result == []

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_chunk_document_calculates_token_count(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test that token count is calculated correctly based on embedding_text."""
        # Mock tokenizer to return specific token counts
        mock_tokenizer = Mock()
        mock_tokenizer.encode.side_effect = lambda _text: [0] * 42  # Always return 42 tokens
        mock_tokenizer_class.from_pretrained.return_value = mock_tokenizer

        # Mock HuggingFaceTokenizer
        mock_hf_tokenizer = Mock()
        mock_hf_tokenizer.tokenizer = mock_tokenizer
        mock_hf_tokenizer_class.return_value = mock_hf_tokenizer

        mock_meta = Mock()
        mock_meta.headings = []
        mock_meta.doc_items = []

        mock_chunk = Mock()
        mock_chunk.text = "Test text"
        mock_chunk.meta = mock_meta

        mock_chunker_instance = Mock()
        mock_chunker_instance.chunk.return_value = [mock_chunk]
        # Mock contextualize to return the text
        mock_chunker_instance.contextualize.side_effect = lambda c: c.text
        mock_chunker_class.return_value = mock_chunker_instance

        chunker = DoclingChunker()
        result = chunker.chunk_document(Mock())

        # Token count is based on embedding_text (what gets embedded)
        assert result[0]["token_count"] == 42


class TestDoclingChunkerPrepareForEmbedding:
    """Test suite for prepare_for_embedding method."""

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_prepare_for_embedding_basic(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test prepare_for_embedding with basic chunks including dual text formats."""
        # Mock tokenizer/chunker for initialization
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        # Chunks now have both text (display/markdown) and embedding_text (compact)
        chunks = [
            {
                "chunk_id": 1,
                "text": "First chunk **markdown**",  # Display text (markdown tables)
                "embedding_text": "First chunk compact",  # Embedding text (triplet format)
                "token_count": 10,
                "metadata": {},
            },
            {
                "chunk_id": 2,
                "text": "Second chunk **markdown**",
                "embedding_text": "Second chunk compact",
                "token_count": 15,
                "metadata": {},
            },
        ]

        result = chunker.prepare_for_embedding(chunks, source_document="test.pdf")

        assert len(result) == 2

        # Check first document
        assert result[0]["embedding_input"] == "First chunk compact"  # Uses embedding_text
        assert result[0]["display_text"] == "First chunk **markdown**"  # Markdown for display
        assert result[0]["content"]["chunk_id"] == 1
        # Note: text is NOT in content (stored only in embedding_input/display_text)
        assert "text" not in result[0]["content"]
        assert result[0]["content"]["token_count"] == 10
        assert result[0]["source"] == "test.pdf"
        # Should not have structure-related fields
        assert "structure_path" not in result[0]["content"]
        assert "structure_path_ids" not in result[0]["content"]
        assert "structure_heading_id" not in result[0]["content"]

        # Check second document
        assert result[1]["embedding_input"] == "Second chunk compact"
        assert result[1]["display_text"] == "Second chunk **markdown**"
        assert result[1]["source"] == "test.pdf"

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_prepare_for_embedding_extracts_heading(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test that prepare_for_embedding extracts last heading from metadata."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        chunks = [
            {
                "chunk_id": 1,
                "text": "Text under heading",
                "embedding_text": "Text under heading compact",
                "token_count": 10,
                "metadata": {"meta": {"headings": ["Chapter 1", "Section 1.1"]}},
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        # heading should be LAST element (for display)
        assert result[0]["content"]["heading"] == "Section 1.1"
        # headings should be full hierarchy (for filtering)
        assert result[0]["content"]["headings"] == ["Chapter 1", "Section 1.1"]

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_prepare_for_embedding_extracts_page_number(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test that prepare_for_embedding extracts page number from metadata."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        chunks = [
            {
                "chunk_id": 1,
                "text": "Page content",
                "embedding_text": "Page content compact",
                "token_count": 10,
                "metadata": {
                    "meta": {
                        "doc_items": [{"prov": [{"page_no": 5, "bbox": {}}]}],
                    }
                },
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        assert result[0]["content"]["page_no"] == 5

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_prepare_for_embedding_handles_missing_metadata(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test prepare_for_embedding handles missing metadata gracefully."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        chunks = [
            {
                "chunk_id": 1,
                "text": "Text without metadata",
                "embedding_text": "Text without metadata compact",
                "token_count": 10,
                "metadata": {},
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        assert result[0]["content"]["heading"] == ""
        assert result[0]["content"]["headings"] == []
        assert result[0]["content"]["page_no"] is None

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_prepare_for_embedding_default_source(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test that prepare_for_embedding uses 'unknown' as default source."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        chunks = [
            {
                "chunk_id": 1,
                "text": "Text",
                "embedding_text": "Text compact",
                "token_count": 10,
                "metadata": {},
            }
        ]

        result = chunker.prepare_for_embedding(chunks, source_document=None)

        assert result[0]["source"] == "unknown"

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_prepare_for_embedding_empty_list(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test prepare_for_embedding with empty list."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        result = chunker.prepare_for_embedding([])

        assert result == []

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_prepare_for_embedding_falls_back_to_text(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test that prepare_for_embedding falls back to text if embedding_text missing."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        # Chunk without embedding_text (backward compatibility)
        chunks = [
            {
                "chunk_id": 1,
                "text": "Only text field",
                "token_count": 10,
                "metadata": {},
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        # Should fall back to text for embedding_input
        assert result[0]["embedding_input"] == "Only text field"
        assert result[0]["display_text"] == "Only text field"


class TestDoclingChunkerChunkAndPrepare:
    """Test suite for chunk_and_prepare convenience method."""

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_chunk_and_prepare_integrates_both_steps(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test that chunk_and_prepare combines chunking and preparation with dual serialization."""
        # Mock tokenizer
        mock_tokenizer = Mock()
        mock_tokenizer.encode.return_value = [1, 2, 3]
        mock_tokenizer_class.from_pretrained.return_value = mock_tokenizer

        # Mock HuggingFaceTokenizer
        mock_hf_tokenizer = Mock()
        mock_hf_tokenizer.tokenizer = mock_tokenizer
        mock_hf_tokenizer_class.return_value = mock_hf_tokenizer

        # Mock chunk with proper meta structure
        mock_meta = Mock()
        mock_meta.headings = ["Chapter 1", "Title"]
        mock_meta.doc_items = []

        # Single chunk (same text for both display and embedding)
        mock_chunk = Mock()
        mock_chunk.text = "Test chunk text"
        mock_chunk.meta = mock_meta

        # Create separate mock instances for primary and display chunkers
        mock_primary_chunker = Mock()
        # primary_chunker is not used anymore

        mock_display_chunker = Mock()
        mock_display_chunker.chunk.return_value = [mock_chunk]
        mock_display_chunker.contextualize.side_effect = lambda c: c.text

        # Return different instances for each HybridChunker call
        mock_chunker_class.side_effect = [mock_primary_chunker, mock_display_chunker]

        # Test
        chunker = DoclingChunker()
        mock_doc = Mock()
        # Setup mock_doc for build_formula_ref_map
        mock_doc.iterate_items.return_value = []
        mock_doc.texts = []
        result = chunker.chunk_and_prepare(mock_doc, source_document="test.pdf")

        # Only display_chunker should be called
        mock_primary_chunker.chunk.assert_not_called()
        mock_display_chunker.chunk.assert_called_once_with(mock_doc)

        # Should return prepared documents with same text for both
        assert len(result) == 1
        assert result[0]["embedding_input"] == "Test chunk text"  # Same as display
        assert result[0]["display_text"] == "Test chunk text"  # Same as embedding
        assert result[0]["source"] == "test.pdf"
        # heading should be LAST element from headings list
        assert result[0]["content"]["heading"] == "Title"
        # headings should be full hierarchy
        assert result[0]["content"]["headings"] == ["Chapter 1", "Title"]


class TestDoclingChunkerSaveChunks:
    """Test suite for save_chunks static method."""

    def test_save_chunks_success(self, tmp_path):
        """Test successful saving of chunks to JSON files."""
        output_dir = tmp_path / "chunks"

        chunks = [
            {
                "chunk_id": 1,
                "text": "First chunk",
                "token_count": 10,
                "metadata": {},
            },
            {
                "chunk_id": 2,
                "text": "Second chunk",
                "token_count": 15,
                "metadata": {},
            },
        ]

        result = DoclingChunker.save_chunks(chunks, output_dir)

        # Directory should be created
        assert output_dir.exists()

        # Files should be created
        assert (output_dir / "chunk_0001.json").exists()
        assert (output_dir / "chunk_0002.json").exists()

        # Check content
        with (output_dir / "chunk_0001.json").open("r") as f:
            chunk1 = json.load(f)
        assert chunk1["text"] == "First chunk"
        assert chunk1["chunk_id"] == 1

        # Check result
        assert result["chunks_saved"] == 2
        assert result["output_dir"] == str(output_dir)
        assert result["success"] is True

    def test_save_chunks_creates_directory(self, tmp_path):
        """Test that save_chunks creates output directory if it doesn't exist."""
        output_dir = tmp_path / "new" / "nested" / "chunks"

        chunks = [{"chunk_id": 1, "text": "Test", "token_count": 5, "metadata": {}}]

        DoclingChunker.save_chunks(chunks, output_dir)

        assert output_dir.exists()
        assert (output_dir / "chunk_0001.json").exists()

    def test_save_chunks_clears_old_files(self, tmp_path):
        """Test that save_chunks removes old chunk files."""
        output_dir = tmp_path / "chunks"
        output_dir.mkdir()

        # Create old chunk files
        (output_dir / "chunk_0001.json").write_text("{}")
        (output_dir / "chunk_0002.json").write_text("{}")
        (output_dir / "other_file.json").write_text("{}")

        chunks = [{"chunk_id": 1, "text": "New chunk", "token_count": 5, "metadata": {}}]

        DoclingChunker.save_chunks(chunks, output_dir)

        # Old chunk files should be removed
        assert not (output_dir / "chunk_0002.json").exists()

        # New chunk file should exist
        assert (output_dir / "chunk_0001.json").exists()

        # Other files should remain
        assert (output_dir / "other_file.json").exists()

    def test_save_chunks_handles_unicode(self, tmp_path):
        """Test that save_chunks handles Unicode content correctly."""
        output_dir = tmp_path / "chunks"

        chunks = [
            {
                "chunk_id": 1,
                "text": "Content with émojis 🎉 and ñ",
                "token_count": 10,
                "metadata": {},
            }
        ]

        DoclingChunker.save_chunks(chunks, output_dir)

        # Should save with proper encoding
        with (output_dir / "chunk_0001.json").open("r", encoding="utf-8") as f:
            chunk = json.load(f)
        assert "🎉" in chunk["text"]
        assert "émojis" in chunk["text"]

    def test_save_chunks_empty_list(self, tmp_path):
        """Test save_chunks with empty list."""
        output_dir = tmp_path / "chunks"

        result = DoclingChunker.save_chunks([], output_dir)

        assert result["chunks_saved"] == 0
        assert result["success"] is True
        assert output_dir.exists()

    def test_save_chunks_accepts_string_path(self, tmp_path):
        """Test that save_chunks accepts string path."""
        output_dir = tmp_path / "chunks"

        chunks = [{"chunk_id": 1, "text": "Test", "token_count": 5, "metadata": {}}]

        result = DoclingChunker.save_chunks(chunks, str(output_dir))

        assert result["success"] is True
        assert output_dir.exists()

    def test_save_chunks_pads_chunk_numbers(self, tmp_path):
        """Test that chunk numbers are zero-padded in filenames."""
        output_dir = tmp_path / "chunks"

        chunks = [
            {"chunk_id": i, "text": f"Chunk {i}", "token_count": 5, "metadata": {}}
            for i in range(1, 101)
        ]

        DoclingChunker.save_chunks(chunks, output_dir)

        # Check padding
        assert (output_dir / "chunk_0001.json").exists()
        assert (output_dir / "chunk_0010.json").exists()
        assert (output_dir / "chunk_0100.json").exists()


class TestDoclingChunkerFormulaExtraction:
    """Test suite for formula extraction in prepare_for_embedding method."""

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_prepare_for_embedding_with_formula_declaration(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test that formulas_declaration is populated from raw doc_items."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        # Create mock formula item
        mock_formula = Mock()
        mock_formula.label = Mock()
        mock_formula.label.value = "formula"
        mock_formula.orig = "E = mc^2 (7)"
        mock_formula.text = "$E=mc^{2}$"

        chunks = [
            {
                "chunk_id": 1,
                "text": "The energy formula",
                "embedding_text": "The energy formula $E=mc^{2}$",
                "token_count": 10,
                "metadata": {},
                "_raw_doc_items": [mock_formula],
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        assert result[0]["content"]["formulas_declaration"] == ["7"]

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_prepare_for_embedding_without_formulas(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test that chunks without formulas have empty formulas_declaration."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        chunks = [
            {
                "chunk_id": 1,
                "text": "No formulas here",
                "embedding_text": "No formulas here",
                "token_count": 10,
                "metadata": {},
                "_raw_doc_items": [],
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        assert result[0]["content"]["formulas_declaration"] == []
        assert result[0]["content"]["formulas_references"] == []

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_prepare_for_embedding_with_formula_references(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test that formulas_references is populated from embedding text."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        chunks = [
            {
                "chunk_id": 1,
                "text": "Using Equation 5 and Eq. 12",
                "embedding_text": "Using Equation 5 and Eq. 12 we calculate",
                "token_count": 10,
                "metadata": {},
                "_raw_doc_items": [],
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        assert sorted(result[0]["content"]["formulas_references"]) == ["12", "5"]

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_prepare_for_embedding_enhances_embedding_input(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test that embedding_input is enhanced with formula numbers."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        # Create mock formula item
        mock_formula = Mock()
        mock_formula.label = Mock()
        mock_formula.label.value = "formula"
        mock_formula.orig = "E = mc^2 (5)"
        mock_formula.text = "$E=mc^{2}$"

        chunks = [
            {
                "chunk_id": 1,
                "text": "Energy formula $E=mc^{2}$",
                "embedding_text": "Energy formula $E=mc^{2}$",
                "token_count": 10,
                "metadata": {},
                "_raw_doc_items": [mock_formula],
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        # Embedding input should have formula number appended
        assert "(5)" in result[0]["embedding_input"]


class TestDoclingChunkerContentTypeMetadata:
    """Test suite for content type metadata in prepare_for_embedding method."""

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_has_formula_true_when_formulas_declared(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test has_formula is True when formulas_declaration is non-empty."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        # Create mock formula item
        mock_formula = Mock()
        mock_formula.label = Mock()
        mock_formula.label.value = "formula"
        mock_formula.orig = "E = mc^2 (5)"
        mock_formula.text = "$E=mc^{2}$"

        chunks = [
            {
                "chunk_id": 1,
                "text": "The energy formula",
                "embedding_text": "The energy formula $E=mc^{2}$",
                "token_count": 10,
                "metadata": {},
                "_raw_doc_items": [mock_formula],
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        assert result[0]["content"]["has_formula"] is True

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_has_formula_false_when_no_formulas(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test has_formula is False when no formulas declared."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        chunks = [
            {
                "chunk_id": 1,
                "text": "No formulas here",
                "embedding_text": "No formulas here",
                "token_count": 10,
                "metadata": {},
                "_raw_doc_items": [],
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        assert result[0]["content"]["has_formula"] is False

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_has_table_true_when_table_present(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test has_table is True when TABLE label present."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        # Create mock table item
        mock_table = Mock()
        mock_table.label = Mock()
        mock_table.label.value = "table"
        mock_table.orig = "Table content"
        mock_table.text = "Table content"

        chunks = [
            {
                "chunk_id": 1,
                "text": "Some table data",
                "embedding_text": "Some table data",
                "token_count": 10,
                "metadata": {},
                "_raw_doc_items": [mock_table],
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        assert result[0]["content"]["has_table"] is True

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_has_figure_true_when_picture_present(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test has_figure is True when PICTURE label present."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        # Create mock picture item
        mock_picture = Mock()
        mock_picture.label = Mock()
        mock_picture.label.value = "picture"
        mock_picture.orig = "Figure 1"
        mock_picture.text = "Figure 1"

        chunks = [
            {
                "chunk_id": 1,
                "text": "See the figure",
                "embedding_text": "See the figure",
                "token_count": 10,
                "metadata": {},
                "_raw_doc_items": [mock_picture],
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        assert result[0]["content"]["has_figure"] is True

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_tables_declaration_populated_from_caption(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test tables_declaration populated from caption items."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        # Create mock caption item
        mock_caption = Mock()
        mock_caption.label = Mock()
        mock_caption.label.value = "caption"
        mock_caption.orig = "Table 1: Summary of results"
        mock_caption.text = "Table 1: Summary of results"

        chunks = [
            {
                "chunk_id": 1,
                "text": "Data table",
                "embedding_text": "Data table",
                "token_count": 10,
                "metadata": {},
                "_raw_doc_items": [mock_caption],
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        assert result[0]["content"]["tables_declaration"] == ["Table 1"]

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_all_content_type_flags_present(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test all content type flags are present in output."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        chunks = [
            {
                "chunk_id": 1,
                "text": "Some text",
                "embedding_text": "Some text",
                "token_count": 10,
                "metadata": {},
                "_raw_doc_items": [],
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        # All new fields should be present
        assert "has_formula" in result[0]["content"]
        assert "has_table" in result[0]["content"]
        assert "has_figure" in result[0]["content"]
        assert "tables_declaration" in result[0]["content"]

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_no_special_content_defaults(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test default values when no special content present."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        chunks = [
            {
                "chunk_id": 1,
                "text": "Plain text content",
                "embedding_text": "Plain text content",
                "token_count": 10,
                "metadata": {},
                "_raw_doc_items": [],
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        assert result[0]["content"]["has_formula"] is False
        assert result[0]["content"]["has_table"] is False
        assert result[0]["content"]["has_figure"] is False
        assert result[0]["content"]["tables_declaration"] == []

    @patch(
        "document_ingestion_worker.document_parsing.docling_chunker.MarkdownTableSerializerProvider"
    )
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HybridChunker")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.HuggingFaceTokenizer")
    @patch("document_ingestion_worker.document_parsing.docling_chunker.AutoTokenizer")
    def test_multiple_content_types_in_chunk(
        self, mock_tokenizer_class, mock_hf_tokenizer_class, mock_chunker_class, mock_md_provider
    ):
        """Test chunk with multiple content types."""
        mock_tokenizer_class.from_pretrained.return_value = Mock()
        mock_hf_tokenizer_class.return_value = Mock()

        chunker = DoclingChunker()

        # Create mock items for multiple content types
        mock_formula = Mock()
        mock_formula.label = Mock()
        mock_formula.label.value = "formula"
        mock_formula.orig = "x = y (1)"
        mock_formula.text = "$x=y$"

        mock_table = Mock()
        mock_table.label = Mock()
        mock_table.label.value = "table"
        mock_table.orig = "Table 2: Data"
        mock_table.text = "Table 2: Data"

        mock_picture = Mock()
        mock_picture.label = Mock()
        mock_picture.label.value = "picture"
        mock_picture.orig = "Figure"
        mock_picture.text = "Figure"

        chunks = [
            {
                "chunk_id": 1,
                "text": "Mixed content chunk",
                "embedding_text": "Mixed content chunk $x=y$",
                "token_count": 10,
                "metadata": {},
                "_raw_doc_items": [mock_formula, mock_table, mock_picture],
            }
        ]

        result = chunker.prepare_for_embedding(chunks)

        assert result[0]["content"]["has_formula"] is True
        assert result[0]["content"]["has_table"] is True
        assert result[0]["content"]["has_figure"] is True
        assert result[0]["content"]["tables_declaration"] == ["Table 2"]
