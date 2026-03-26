"""
Integration tests for subscript serialization with real DOCX documents.

These tests verify that subscript/superscript text is properly serialized
when chunking real DOCX documents through the complete pipeline.
"""

from pathlib import Path

import pytest

from document_ingestion_worker.document_parsing.docling_chunker import DoclingChunker
from document_ingestion_worker.document_parsing.docx_to_docling_parser import DocxParser
from document_ingestion_worker.document_parsing.subscript_serializer import SubscriptConfig

DOCX_FIXTURES_DIR = Path(__file__).parent.parent.parent.parent / "fixtures" / "docx"


@pytest.fixture(scope="module")
def docx_with_subscripts_path() -> Path:
    """Provide path to DOCX with subscripts for testing."""
    fixture_path = DOCX_FIXTURES_DIR / "with_subscripts.docx"
    if not fixture_path.exists():
        pytest.skip(
            f"Fixture not found at {fixture_path}. "
            "Run tests/fixtures/docx/create_fixtures.py to generate."
        )
    return fixture_path


@pytest.fixture(scope="module")
def parsed_docx_with_subscripts(docx_with_subscripts_path: Path):
    """Parse the DOCX fixture once for all tests in module."""
    parser = DocxParser()
    return parser.convert_docx(docx_with_subscripts_path)


@pytest.mark.integration
class TestSubscriptChunkingIntegration:
    """Integration tests for subscript handling in document chunking."""

    def test_subscript_unicode_conversion_enabled_by_default(self, parsed_docx_with_subscripts):
        """Test that subscripts are converted to Unicode by default."""
        # Default config enables Unicode conversion
        chunker = DoclingChunker(subscript_config=SubscriptConfig())
        chunks = chunker.chunk_document(parsed_docx_with_subscripts)

        # Combine all chunk texts
        chunk_texts = [chunk["text"] for chunk in chunks]
        combined_text = " ".join(chunk_texts)

        # Should contain Unicode subscript: tCO₂e (not tCO\n2\ne)
        assert "tCO\u2082e" in combined_text or "tCO₂e" in combined_text, (
            f"Expected 'tCO₂e' with Unicode subscript. Got: {combined_text[:500]}"
        )
        # Should NOT contain the newline-separated pattern
        assert "tCO\n\n2\n\ne" not in combined_text, "Should not contain double-newline pattern"

    def test_subscript_concatenated_without_spaces(self, parsed_docx_with_subscripts):
        """Test that subscript digits are concatenated (no spaces or newlines)."""
        config = SubscriptConfig(convert_to_unicode=False, concatenate_inline=True)
        chunker = DoclingChunker(subscript_config=config)
        chunks = chunker.chunk_document(parsed_docx_with_subscripts)

        chunk_texts = [chunk["text"] for chunk in chunks]
        combined_text = " ".join(chunk_texts)

        # With unicode disabled, should produce "tCO2e" (concatenated)
        assert "tCO2e" in combined_text, (
            f"Expected 'tCO2e' (concatenated). Got: {combined_text[:500]}"
        )
        # Should NOT contain newline-separated pattern
        assert "tCO\n2\ne" not in combined_text, "Should not contain newline pattern"

    def test_subscript_unicode_disabled(self, parsed_docx_with_subscripts):
        """Test that subscript digits stay as regular digits when unicode disabled."""
        config = SubscriptConfig(convert_to_unicode=False, concatenate_inline=True)
        chunker = DoclingChunker(subscript_config=config)
        chunks = chunker.chunk_document(parsed_docx_with_subscripts)

        chunk_texts = [chunk["text"] for chunk in chunks]
        combined_text = " ".join(chunk_texts)

        # Should produce concatenated "CO2" (no unicode, no newlines)
        assert "CO2" in combined_text, f"Expected 'CO2' concatenated. Got: {combined_text[:500]}"
        # Should NOT have Unicode subscript
        assert "\u2082" not in combined_text, "Should not contain Unicode subscript"

    def test_superscript_serialization(self, parsed_docx_with_subscripts):
        """Test that superscript content is concatenated (not newline-separated)."""
        config = SubscriptConfig(convert_to_unicode=False)
        chunker = DoclingChunker(subscript_config=config)
        chunks = chunker.chunk_document(parsed_docx_with_subscripts)

        chunk_texts = [chunk["text"] for chunk in chunks]
        combined_text = " ".join(chunk_texts)

        # The fixture contains "10^3" - should be "103" (concatenated) not "10\n3\n"
        assert "103" in combined_text, (
            f"Expected '103' (concatenated superscript). Got: {combined_text[:500]}"
        )

    def test_chunks_have_valid_structure(self, parsed_docx_with_subscripts):
        """Test that chunks maintain valid structure after subscript processing."""
        chunker = DoclingChunker(subscript_config=SubscriptConfig())
        chunks = chunker.chunk_document(parsed_docx_with_subscripts)

        # Should produce valid chunks
        assert len(chunks) > 0, "Should produce at least one chunk"

        for chunk in chunks:
            # Each chunk should have required fields
            assert "text" in chunk, "Chunk missing 'text' field"
            assert "chunk_id" in chunk, "Chunk missing 'chunk_id' field"
            assert "token_count" in chunk, "Chunk missing 'token_count' field"
            assert "metadata" in chunk, "Chunk missing 'metadata' field"

            # Text should not be empty
            assert len(chunk["text"]) > 0, "Chunk has empty text"

            # Token count should be positive
            assert chunk["token_count"] > 0, "Chunk has zero token count"

    def test_co2e_properly_formatted(self, parsed_docx_with_subscripts):
        """Test specific CO2e formatting commonly used in carbon credit documents."""
        config = SubscriptConfig(convert_to_unicode=False)
        chunker = DoclingChunker(subscript_config=config)
        chunks = chunker.chunk_document(parsed_docx_with_subscripts)

        chunk_texts = [chunk["text"] for chunk in chunks]
        combined_text = " ".join(chunk_texts)

        # Post-processing concatenates subscript fragments: tCO2e (no spaces or newlines)
        properly_formatted = "tCO2e" in combined_text

        assert properly_formatted, (
            f"Expected 'tCO2e' (concatenated). Text sample: {combined_text[:500]}"
        )


@pytest.mark.integration
class TestSubscriptBackwardCompatibility:
    """Tests ensuring backward compatibility when subscript handling is disabled."""

    def test_disabled_concatenation_still_produces_chunks(self, parsed_docx_with_subscripts):
        """Test that disabling subscript handling still produces valid chunks."""
        # Explicitly disable concatenation to revert to default Docling behavior
        config = SubscriptConfig(concatenate_inline=False)
        chunker = DoclingChunker(subscript_config=config)
        chunks = chunker.chunk_document(parsed_docx_with_subscripts)

        # Should still produce chunks
        assert len(chunks) > 0, "Should produce chunks even with subscript handling disabled"

        # Chunks should have valid structure
        for chunk in chunks:
            assert "text" in chunk
            assert len(chunk["text"]) > 0

    def test_none_config_uses_defaults(self, parsed_docx_with_subscripts):
        """Test that None config uses default enabled behavior."""
        # When subscript_config is None, should use default (enabled with Unicode)
        chunker = DoclingChunker(subscript_config=None)
        chunks = chunker.chunk_document(parsed_docx_with_subscripts)

        chunk_texts = [chunk["text"] for chunk in chunks]
        combined_text = " ".join(chunk_texts)

        # Default config enables Unicode subscript conversion: tCO₂e
        assert "tCO\u2082e" in combined_text or "tCO₂e" in combined_text, (
            f"Default config should produce Unicode subscript (tCO₂e). Got: {combined_text[:500]}"
        )


@pytest.mark.integration
class TestChunkerWithoutSubscriptFixture:
    """Tests using documents without subscripts to ensure no regression."""

    @pytest.fixture
    def simple_docx_path(self) -> Path:
        """Provide path to simple DOCX without subscripts."""
        fixture_path = DOCX_FIXTURES_DIR / "simple.docx"
        if not fixture_path.exists():
            pytest.skip(f"Fixture not found at {fixture_path}")
        return fixture_path

    def test_simple_docx_unchanged(self, simple_docx_path):
        """Test that simple documents without subscripts are not affected."""
        parser = DocxParser()
        doc = parser.convert_docx(simple_docx_path)

        # With subscript handling enabled
        chunker = DoclingChunker(subscript_config=SubscriptConfig())
        chunks = chunker.chunk_document(doc)

        # Should produce valid chunks
        assert len(chunks) > 0

        # Chunk text should be coherent
        for chunk in chunks:
            text = chunk["text"]
            # Should not have weird formatting artifacts
            assert "\n\n\n" not in text, "Too many consecutive newlines"
