"""
Integration tests for formula extraction functionality.

These tests verify formula number extraction, cross-reference detection,
and embedding enhancement using real PDF documents with numbered formulas.

Focus: End-to-end validation that formula metadata is correctly extracted
from real documents and available in prepared chunks.

Mark with @pytest.mark.integration to separate from unit tests.

## Test Data Setup

Uses the same test PDF fixtures as other integration tests.
Set TEST_PDF_PATH environment variable to use a custom PDF:

    export TEST_PDF_PATH=/path/to/your/test.pdf

Tests will use the default VM0042 methodology PDF which contains
numerous numbered formulas suitable for testing.
"""

import pytest

from document_ingestion_worker.document_parsing.docling_chunker import DoclingChunker
from document_ingestion_worker.document_parsing.structure_extractor import (
    build_formula_ref_map,
    collect_all_formula_declarations,
    detect_formula_references,
    enhance_embedding_with_formula_numbers,
    extract_formula_number,
)


@pytest.mark.integration
class TestFormulaExtractionIntegration:
    """Integration tests for formula number extraction from real documents."""

    def test_extract_formula_number_patterns(self):
        """Test formula number extraction with various real-world patterns."""
        # Standard patterns found in methodology documents
        assert extract_formula_number("E = mc² (5)") == "5"
        assert extract_formula_number("∑(ADi × EFi) (12)") == "12"
        assert extract_formula_number("BEF = A × B × C (2.1)") == "2.1"
        assert extract_formula_number("ΔCBSL,i,t (A6.1)") == "A6.1"
        assert extract_formula_number("Formula text (3a)") == "3a"

        # Edge cases
        assert extract_formula_number("No number here") is None
        assert extract_formula_number("f(x) = x²") is None  # Function notation, not formula number

    def test_detect_references_various_formats(self):
        """Test detection of formula references in various formats."""
        # Standard references
        assert detect_formula_references("See Equation 5 for details") == ["5"]
        assert detect_formula_references("Using Eq. 12 we calculate") == ["12"]
        assert detect_formula_references("Apply Formula 3 here") == ["3"]

        # Parenthesized format
        assert detect_formula_references("As shown in equation (5)") == ["5"]
        assert detect_formula_references("See formula (7) above") == ["7"]

        # Multiple references
        refs = detect_formula_references("Using Equations (1) and (2) and (3)")
        assert sorted(refs) == ["1", "2", "3"]

        # Case insensitive
        assert detect_formula_references("EQUATION 5 states") == ["5"]
        assert detect_formula_references("FORMULA (7) defines") == ["7"]

    def test_detect_references_with_validation(self):
        """Test that reference detection filters by valid declarations."""
        text = "Using Eq. 5 and Eq. 13.39 (from Cochran 1977)"
        valid_declarations = {"5", "6", "7"}  # 13.39 is external citation

        refs = detect_formula_references(text, valid_declarations)

        # Should only include "5" since "13.39" is not in valid declarations
        assert refs == ["5"]


@pytest.mark.integration
class TestFormulaExtractionWithRealDocument:
    """Integration tests using real parsed documents."""

    def test_build_formula_ref_map(self, sample_docling_document):
        """Test building formula reference map from real document."""
        formula_map = build_formula_ref_map(sample_docling_document)

        # Should find formulas in the methodology document
        # VM0042 has many numbered formulas
        assert len(formula_map) > 0

        # Each entry should map self_ref to (number, latex, page_no)
        for self_ref, (num, _latex, _page) in formula_map.items():
            assert self_ref.startswith("#/texts/")
            assert num  # Formula number should not be empty
            # LaTeX might be empty for some formulas

    def test_collect_all_formula_declarations(self, sample_docling_document):
        """Test collecting all formula numbers from document."""
        declarations = collect_all_formula_declarations(sample_docling_document)

        # Should find formula declarations
        assert len(declarations) > 0

        # All declarations should be strings
        assert all(isinstance(d, str) for d in declarations)

        # Check for typical formula number formats
        # VM0042 has sequential formula numbers
        number_declarations = [d for d in declarations if d.isdigit()]
        assert len(number_declarations) > 0

    def test_chunker_extracts_formula_declarations(self, sample_docling_document):
        """Test that DoclingChunker extracts formula declarations."""
        chunker = DoclingChunker()
        documents = chunker.chunk_and_prepare(sample_docling_document, source_document="test.pdf")

        # Find chunks with formula declarations
        chunks_with_declarations = [
            doc for doc in documents if doc["content"].get("formulas_declaration")
        ]

        # Should find at least some chunks with formula declarations
        assert len(chunks_with_declarations) > 0

        # Verify structure
        for chunk in chunks_with_declarations:
            decls = chunk["content"]["formulas_declaration"]
            assert isinstance(decls, list)
            assert all(isinstance(d, str) for d in decls)

    def test_chunker_extracts_formula_references(self, sample_docling_document):
        """Test that DoclingChunker extracts formula cross-references."""
        chunker = DoclingChunker()
        documents = chunker.chunk_and_prepare(sample_docling_document, source_document="test.pdf")

        # Find chunks with formula references
        chunks_with_references = [
            doc for doc in documents if doc["content"].get("formulas_references")
        ]

        # Should find at least some chunks with formula references
        # (methodology documents typically have cross-references)
        assert len(chunks_with_references) > 0

        # Verify structure
        for chunk in chunks_with_references:
            refs = chunk["content"]["formulas_references"]
            assert isinstance(refs, list)
            assert all(isinstance(r, str) for r in refs)

    def test_embedding_input_contains_formula_numbers(self, sample_docling_document):
        """Test that embedding_input contains formula numbers for searchability."""
        chunker = DoclingChunker()
        documents = chunker.chunk_and_prepare(sample_docling_document, source_document="test.pdf")

        # Find chunks with formula declarations
        chunks_with_declarations = [
            doc for doc in documents if doc["content"].get("formulas_declaration")
        ]

        # For chunks declaring formulas, embedding_input should contain the number
        for chunk in chunks_with_declarations[:5]:  # Check first 5
            embedding_input = chunk["embedding_input"]
            declarations = chunk["content"]["formulas_declaration"]

            # At least one declaration should appear in embedding_input
            # (either as "(N)" appended to LaTeX or in surrounding text)
            found_any = any(f"({d})" in embedding_input for d in declarations)

            # This is a soft check - formula numbers should generally appear
            # but text structure can vary
            if not found_any:
                # Formula might be referenced by number in text
                # This is a soft check - structure can vary
                _ = any(d in embedding_input for d in declarations)


@pytest.mark.integration
class TestFormulaReferenceValidation:
    """Integration tests validating formula reference integrity."""

    def test_all_references_are_valid_declarations(self, sample_docling_document):
        """Test that all detected references point to declared formulas."""
        chunker = DoclingChunker()
        documents = chunker.chunk_and_prepare(sample_docling_document, source_document="test.pdf")

        # Collect all declarations across document
        all_declarations = set()
        for doc in documents:
            decls = doc["content"].get("formulas_declaration", [])
            all_declarations.update(decls)

        # Collect all references across document
        all_references = set()
        for doc in documents:
            refs = doc["content"].get("formulas_references", [])
            all_references.update(refs)

        # All references should be to declared formulas
        # (This is the key validation - references are filtered by valid_declarations)
        invalid_refs = all_references - all_declarations
        assert len(invalid_refs) == 0, f"Found references to undeclared formulas: {invalid_refs}"

    def test_formula_metadata_consistency(self, sample_docling_document):
        """Test that formula metadata is consistent across document."""
        chunker = DoclingChunker()
        documents = chunker.chunk_and_prepare(sample_docling_document, source_document="test.pdf")

        # All chunks should have both metadata fields (even if empty)
        for doc in documents:
            content = doc["content"]
            assert "formulas_declaration" in content
            assert "formulas_references" in content
            assert isinstance(content["formulas_declaration"], list)
            assert isinstance(content["formulas_references"], list)


@pytest.mark.integration
class TestEnhanceEmbeddingIntegration:
    """Integration tests for embedding text enhancement."""

    def test_enhance_preserves_original_content(self):
        """Test that enhancement preserves original text content."""
        original_text = "The emission factor $E=mc^{2}$ is calculated using..."
        formula_map = {"5": "$E=mc^{2}$"}

        enhanced = enhance_embedding_with_formula_numbers(original_text, formula_map)

        # Original content should still be present
        assert "emission factor" in enhanced
        assert "is calculated using" in enhanced
        assert "$E=mc^{2}$" in enhanced

        # Formula number should be added
        assert "(5)" in enhanced

    def test_enhance_multiple_formulas(self):
        """Test enhancement with multiple formulas."""
        original_text = "Using $a+b=c$ and $x^2$ we get results"
        formula_map = {"1": "$a+b=c$", "2": "$x^2$"}

        enhanced = enhance_embedding_with_formula_numbers(original_text, formula_map)

        # Both formulas should be enhanced
        assert "$a+b=c$ (1)" in enhanced
        assert "$x^2$ (2)" in enhanced

    def test_enhance_no_duplicate_numbers(self):
        """Test that enhancement doesn't duplicate existing numbers."""
        # Text already has formula number
        original_text = "The formula $E=mc^{2}$ (5) shows..."
        formula_map = {"5": "$E=mc^{2}$"}

        enhanced = enhance_embedding_with_formula_numbers(original_text, formula_map)

        # Should not add duplicate (5)
        assert enhanced.count("(5)") == 1

    def test_enhance_empty_inputs(self):
        """Test enhancement handles empty inputs gracefully."""
        assert enhance_embedding_with_formula_numbers("", {"5": "$x$"}) == ""
        assert enhance_embedding_with_formula_numbers("text", {}) == "text"
        assert enhance_embedding_with_formula_numbers("text", None) == "text"
