"""
Unit tests for structure_extractor.py - Formula extraction utilities.

These tests verify formula number extraction, reference detection, and embedding enhancement.
"""

from unittest.mock import Mock

from document_ingestion_worker.document_parsing.structure_extractor import (
    detect_content_types_from_doc_items,
    detect_formula_references,
    enhance_embedding_with_formula_numbers,
    extract_formula_number,
    extract_formulas_from_doc_items,
    extract_table_declarations_from_doc_items,
)


class TestExtractFormulaNumber:
    """Test suite for extract_formula_number function."""

    def test_simple_number(self):
        """Test extraction of simple numeric identifier."""
        assert extract_formula_number("E = mc² (5)") == "5"

    def test_double_digit_number(self):
        """Test extraction of double-digit identifier."""
        assert extract_formula_number("Some formula (12)") == "12"

    def test_decimal_number(self):
        """Test extraction of decimal identifier (e.g., 2.1)."""
        assert extract_formula_number("Formula text (2.1)") == "2.1"

    def test_alphabetic_identifier(self):
        """Test extraction of alphabetic identifier."""
        assert extract_formula_number("Another formula (A)") == "A"

    def test_alphanumeric_identifier(self):
        """Test extraction of alphanumeric identifier (e.g., 3a)."""
        assert extract_formula_number("Mixed formula (3a)") == "3a"

    def test_no_number(self):
        """Test that None is returned when no formula number present."""
        assert extract_formula_number("E = mc² without number") is None

    def test_trailing_whitespace(self):
        """Test that trailing whitespace is handled."""
        assert extract_formula_number("Formula (5)  ") == "5"

    def test_empty_string(self):
        """Test that empty string returns None."""
        assert extract_formula_number("") is None

    def test_none_input(self):
        """Test that None input returns None."""
        assert extract_formula_number(None) is None

    def test_parentheses_in_middle(self):
        """Test that parentheses in middle of string don't match."""
        assert extract_formula_number("f(x) = x² where x > 0") is None

    def test_complex_decimal(self):
        """Test extraction of complex decimal identifier (e.g., 5.3.1)."""
        assert extract_formula_number("Formula (5.3.1)") == "5.3.1"

    def test_tag_fallback_simple(self):
        r"""Test extraction from \tag{N} in LaTeX when orig is empty."""
        assert extract_formula_number("", r"$x = y \tag{5}$") == "5"

    def test_tag_fallback_with_none_orig(self):
        r"""Test extraction from \tag{N} when orig is None."""
        assert extract_formula_number(None, r"$$E = mc^2 \tag{12}$$") == "12"

    def test_tag_fallback_decimal_number(self):
        r"""Test extraction of decimal number from \tag{N}."""
        assert extract_formula_number("", r"$a + b \tag{2.1}$") == "2.1"

    def test_tag_fallback_alphanumeric(self):
        r"""Test extraction of alphanumeric from \tag{N}."""
        assert extract_formula_number("", r"$formula \tag{A}$") == "A"

    def test_tag_fallback_with_space(self):
        r"""Test extraction from \tag {N} with space before brace."""
        assert extract_formula_number("", r"$x = y \tag {7}$") == "7"

    def test_orig_takes_priority_over_tag(self):
        r"""Test that orig_text takes priority over \tag{N}."""
        # When orig has a number, use that instead of tag
        assert extract_formula_number("Formula (3)", r"$x = y \tag{5}$") == "3"

    def test_tag_fallback_no_tag_no_orig(self):
        """Test that None is returned when no tag and no orig."""
        assert extract_formula_number("", "$x = y$") is None
        assert extract_formula_number(None, "$x = y$") is None

    def test_tag_fallback_no_latex_provided(self):
        """Test that None is returned when only empty orig provided."""
        assert extract_formula_number("") is None

    def test_appendix_format_simple(self):
        """Test extraction of appendix formula number (A1.1)."""
        assert extract_formula_number("Formula (A1.1)") == "A1.1"

    def test_appendix_format_complex(self):
        """Test extraction of complex appendix number (A6.1)."""
        assert extract_formula_number("See appendix equation (A6.1)") == "A6.1"

    def test_appendix_format_simple_letter(self):
        """Test extraction of simple letter appendix (A)."""
        assert extract_formula_number("Appendix (A) formula") == "A"

    def test_appendix_format_multi_letter(self):
        """Test extraction of multi-letter appendix (AB)."""
        assert extract_formula_number("Formula (AB)") == "AB"

    def test_tag_fallback_appendix_format(self):
        r"""Test extraction of appendix number from \tag{A1.1}."""
        assert extract_formula_number("", r"$x = y \tag{A1.1}$") == "A1.1"

    def test_tag_fallback_appendix_complex(self):
        r"""Test extraction of complex appendix from \tag{A6.1}."""
        assert extract_formula_number(None, r"$$formula \tag{A6.1}$$") == "A6.1"


class TestDetectFormulaReferences:
    """Test suite for detect_formula_references function."""

    def test_equation_format(self):
        """Test detection of 'Equation N' format."""
        assert detect_formula_references("See Equation 5 for details") == ["5"]

    def test_eq_with_period(self):
        """Test detection of 'Eq. N' format."""
        assert detect_formula_references("Using Eq. 12 we calculate") == ["12"]

    def test_eq_without_period(self):
        """Test detection of 'Eq N' format (no period)."""
        assert detect_formula_references("From Eq 3 we get") == ["3"]

    def test_formula_format(self):
        """Test detection of 'Formula N' format."""
        assert detect_formula_references("Apply Formula 3 here") == ["3"]

    def test_equation_with_parentheses(self):
        """Test detection of 'equation (N)' format."""
        assert detect_formula_references("See equation (5) for more") == ["5"]

    def test_case_insensitive(self):
        """Test that detection is case-insensitive."""
        assert detect_formula_references("Apply EQUATION 5 here") == ["5"]

    def test_multiple_references(self):
        """Test detection of multiple different references."""
        result = detect_formula_references("Using Eq. 3 and Equation 5 we get")
        assert sorted(result) == ["3", "5"]

    def test_no_matches(self):
        """Test that empty list is returned when no matches."""
        assert detect_formula_references("No formula references here") == []

    def test_duplicates_removed(self):
        """Test that duplicate references are removed."""
        result = detect_formula_references("Equation 5 is similar to Equation 5")
        assert result == ["5"]

    def test_empty_string(self):
        """Test that empty string returns empty list."""
        assert detect_formula_references("") == []

    def test_none_input(self):
        """Test that None input returns empty list."""
        assert detect_formula_references(None) == []

    def test_decimal_reference(self):
        """Test detection of decimal formula reference."""
        assert detect_formula_references("See Equation 2.1 for details") == ["2.1"]

    def test_formula_with_parentheses(self):
        """Test detection of 'formula (N)' format."""
        assert detect_formula_references("Apply formula (7) to get") == ["7"]

    def test_mixed_formats(self):
        """Test detection of mixed reference formats."""
        text = "Using Eq. 1, Equation 2, and Formula 3, we apply equation (4)"
        result = detect_formula_references(text)
        assert sorted(result) == ["1", "2", "3", "4"]

    def test_plural_equations_with_parentheses(self):
        """Test detection of plural 'Equations (N) and (M)' format."""
        result = detect_formula_references("following Equations (1) and (2)")
        assert sorted(result) == ["1", "2"]

    def test_plural_equations_without_parentheses(self):
        """Test detection of plural 'Equations N' format without parentheses.

        Note: Bare 'and N' patterns removed to avoid false positives like
        'Approaches 1 and 2'. Only parenthesized numbers after 'and' are matched.
        """
        result = detect_formula_references("See Equations 5 and 6 for details")
        # Only "Equations 5" matches; bare "and 6" does not match
        assert sorted(result) == ["5"]

    def test_plural_formulas(self):
        """Test detection of plural 'Formulas' format."""
        result = detect_formula_references("Apply Formulas (3) and (4)")
        assert sorted(result) == ["3", "4"]

    def test_eqs_abbreviation(self):
        """Test detection of 'Eqs.' abbreviation.

        Note: Bare 'and N' patterns removed to avoid false positives.
        Use parentheses for multiple references: 'Eqs. (1) and (2)'.
        """
        result = detect_formula_references("Using Eqs. 1 and 2")
        # Only "Eqs. 1" matches; bare "and 2" does not match
        assert sorted(result) == ["1"]

    def test_equations_range_to(self):
        """Test detection of 'to' connector in ranges."""
        result = detect_formula_references("See Equations (1) to (5)")
        assert sorted(result) == ["1", "5"]


class TestExtractFormulasFromDocItems:
    """Test suite for extract_formulas_from_doc_items function."""

    def test_single_formula_with_number(self):
        """Test extraction from single formula item with number."""
        mock_item = Mock()
        mock_item.label = Mock()
        mock_item.label.value = "formula"
        mock_item.orig = "E = mc² (5)"
        mock_item.text = "$E=mc^{2}$"

        numbers, formula_map = extract_formulas_from_doc_items([mock_item])

        assert numbers == ["5"]
        assert formula_map == {"5": "$E=mc^{2}$"}

    def test_multiple_formulas(self):
        """Test extraction from multiple formula items."""
        mock_item1 = Mock()
        mock_item1.label = Mock()
        mock_item1.label.value = "formula"
        mock_item1.orig = "x + y = z (1)"
        mock_item1.text = "$x + y = z$"

        mock_item2 = Mock()
        mock_item2.label = Mock()
        mock_item2.label.value = "formula"
        mock_item2.orig = "a² + b² = c² (2)"
        mock_item2.text = "$a^2 + b^2 = c^2$"

        numbers, formula_map = extract_formulas_from_doc_items([mock_item1, mock_item2])

        assert numbers == ["1", "2"]
        assert formula_map == {"1": "$x + y = z$", "2": "$a^2 + b^2 = c^2$"}

    def test_formula_without_number_skipped(self):
        """Test that formula without number in orig is skipped."""
        mock_item = Mock()
        mock_item.label = Mock()
        mock_item.label.value = "formula"
        mock_item.orig = "E = mc² without number"
        mock_item.text = "$E=mc^{2}$"

        numbers, formula_map = extract_formulas_from_doc_items([mock_item])

        assert numbers == []
        assert formula_map == {}

    def test_empty_list(self):
        """Test that empty list returns empty results."""
        numbers, formula_map = extract_formulas_from_doc_items([])

        assert numbers == []
        assert formula_map == {}

    def test_non_formula_items_ignored(self):
        """Test that non-formula items are ignored."""
        mock_paragraph = Mock()
        mock_paragraph.label = Mock()
        mock_paragraph.label.value = "paragraph"
        mock_paragraph.orig = "Some text (5)"
        mock_paragraph.text = "Some text"

        mock_formula = Mock()
        mock_formula.label = Mock()
        mock_formula.label.value = "formula"
        mock_formula.orig = "E = mc² (3)"
        mock_formula.text = "$E=mc^{2}$"

        numbers, formula_map = extract_formulas_from_doc_items([mock_paragraph, mock_formula])

        assert numbers == ["3"]
        assert formula_map == {"3": "$E=mc^{2}$"}

    def test_items_without_label_ignored(self):
        """Test that items without label attribute are ignored."""
        mock_item = Mock(spec=[])  # No attributes

        numbers, formula_map = extract_formulas_from_doc_items([mock_item])

        assert numbers == []
        assert formula_map == {}

    def test_duplicate_formula_numbers_deduplicated(self):
        """Test that duplicate formula numbers are deduplicated."""
        mock_item1 = Mock()
        mock_item1.label = Mock()
        mock_item1.label.value = "formula"
        mock_item1.orig = "First formula (5)"
        mock_item1.text = "$latex1$"

        mock_item2 = Mock()
        mock_item2.label = Mock()
        mock_item2.label.value = "formula"
        mock_item2.orig = "Same number formula (5)"
        mock_item2.text = "$latex2$"

        numbers, formula_map = extract_formulas_from_doc_items([mock_item1, mock_item2])

        # Should only have one "5", but formula_map will have the last one
        assert numbers == ["5"]
        assert "5" in formula_map

    def test_none_items_handled(self):
        """Test that None is handled gracefully."""
        numbers, formula_map = extract_formulas_from_doc_items(None)

        assert numbers == []
        assert formula_map == {}


class TestEnhanceEmbeddingWithFormulaNumbers:
    """Test suite for enhance_embedding_with_formula_numbers function."""

    def test_single_formula_enhancement(self):
        """Test enhancement of single formula in text."""
        text = "The formula $E=mc^{2}$ describes energy"
        formula_map = {"5": "$E=mc^{2}$"}

        result = enhance_embedding_with_formula_numbers(text, formula_map)

        assert result == "The formula $E=mc^{2}$ (5) describes energy"

    def test_multiple_formula_enhancement(self):
        """Test enhancement of multiple formulas in text."""
        text = "Using $a+b=c$ and $x^2$ we calculate"
        formula_map = {"1": "$a+b=c$", "2": "$x^2$"}

        result = enhance_embedding_with_formula_numbers(text, formula_map)

        assert "$a+b=c$ (1)" in result
        assert "$x^2$ (2)" in result

    def test_no_matching_formula(self):
        """Test that text is unchanged when no formula matches."""
        text = "Some text without matching formulas"
        formula_map = {"5": "$E=mc^{2}$"}

        result = enhance_embedding_with_formula_numbers(text, formula_map)

        assert result == text

    def test_empty_text(self):
        """Test that empty text returns empty text."""
        result = enhance_embedding_with_formula_numbers("", {"5": "$latex$"})

        assert result == ""

    def test_empty_formula_map(self):
        """Test that empty formula_map returns original text."""
        text = "Some text with $E=mc^{2}$"
        result = enhance_embedding_with_formula_numbers(text, {})

        assert result == text

    def test_already_has_number_not_duplicated(self):
        """Test that formulas already containing number are not enhanced again."""
        text = "The formula $E=mc^{2}$ (5) already has number"
        formula_map = {"5": "$E=mc^{2}$"}

        result = enhance_embedding_with_formula_numbers(text, formula_map)

        # Should not add another (5)
        assert result.count("(5)") == 1

    def test_formula_map_with_number_in_latex(self):
        """Test handling when LaTeX itself contains the number."""
        text = "Using $E=mc^{2}$ here"
        formula_map = {"5": "$E=mc^{2}$ (5)"}  # LaTeX already has number

        result = enhance_embedding_with_formula_numbers(text, formula_map)

        # Should not modify since LaTeX already has number
        assert result == text

    def test_none_input_text(self):
        """Test that None text input returns empty/None."""
        result = enhance_embedding_with_formula_numbers(None, {"5": "$latex$"})
        assert result is None

    def test_none_formula_map(self):
        """Test that None formula_map returns original text."""
        text = "Some text"
        result = enhance_embedding_with_formula_numbers(text, None)
        assert result == text


class TestDetectContentTypes:
    """Test suite for detect_content_types_from_doc_items function."""

    def test_detects_formula_label(self):
        """Test that formula label is detected."""
        mock_item = Mock()
        mock_item.label = Mock()
        mock_item.label.value = "formula"

        has_formula, has_table, has_figure = detect_content_types_from_doc_items([mock_item])

        assert has_formula is True
        assert has_table is False
        assert has_figure is False

    def test_detects_table_label(self):
        """Test that table label is detected."""
        mock_item = Mock()
        mock_item.label = Mock()
        mock_item.label.value = "table"

        has_formula, has_table, has_figure = detect_content_types_from_doc_items([mock_item])

        assert has_formula is False
        assert has_table is True
        assert has_figure is False

    def test_detects_picture_label(self):
        """Test that picture label is detected."""
        mock_item = Mock()
        mock_item.label = Mock()
        mock_item.label.value = "picture"

        has_formula, has_table, has_figure = detect_content_types_from_doc_items([mock_item])

        assert has_formula is False
        assert has_table is False
        assert has_figure is True

    def test_no_content_types(self):
        """Test with items that don't match any content type."""
        mock_item = Mock()
        mock_item.label = Mock()
        mock_item.label.value = "text"

        has_formula, has_table, has_figure = detect_content_types_from_doc_items([mock_item])

        assert has_formula is False
        assert has_table is False
        assert has_figure is False

    def test_multiple_content_types(self):
        """Test chunk with formulas, tables, and figures."""
        mock_formula = Mock()
        mock_formula.label = Mock()
        mock_formula.label.value = "formula"

        mock_table = Mock()
        mock_table.label = Mock()
        mock_table.label.value = "table"

        mock_picture = Mock()
        mock_picture.label = Mock()
        mock_picture.label.value = "picture"

        has_formula, has_table, has_figure = detect_content_types_from_doc_items(
            [mock_formula, mock_table, mock_picture]
        )

        assert has_formula is True
        assert has_table is True
        assert has_figure is True

    def test_empty_list(self):
        """Test with empty doc_items list."""
        has_formula, has_table, has_figure = detect_content_types_from_doc_items([])

        assert has_formula is False
        assert has_table is False
        assert has_figure is False

    def test_none_input(self):
        """Test with None input."""
        has_formula, has_table, has_figure = detect_content_types_from_doc_items(None)

        assert has_formula is False
        assert has_table is False
        assert has_figure is False

    def test_handles_dict_items(self):
        """Test with dict-format items (resolved refs format)."""
        mock_label = Mock()
        mock_label.value = "table"

        dict_item = {"label": mock_label, "text": "some text"}

        has_formula, has_table, has_figure = detect_content_types_from_doc_items([dict_item])

        assert has_formula is False
        assert has_table is True
        assert has_figure is False

    def test_handles_string_label_in_dict(self):
        """Test with string label in dict format."""
        dict_item = {"label": "picture", "text": "some text"}

        has_formula, has_table, has_figure = detect_content_types_from_doc_items([dict_item])

        assert has_formula is False
        assert has_table is False
        assert has_figure is True

    def test_items_without_label_ignored(self):
        """Test that items without label are ignored."""
        mock_item = Mock(spec=[])  # No label attribute

        has_formula, has_table, has_figure = detect_content_types_from_doc_items([mock_item])

        assert has_formula is False
        assert has_table is False
        assert has_figure is False


class TestExtractTableDeclarations:
    """Test suite for extract_table_declarations_from_doc_items function."""

    def test_extracts_from_caption(self):
        """Test extraction from CAPTION label items."""
        mock_item = Mock()
        mock_item.label = Mock()
        mock_item.label.value = "caption"
        mock_item.orig = "Table 1: Summary of results"
        mock_item.text = "Table 1: Summary of results"

        result = extract_table_declarations_from_doc_items([mock_item])

        assert result == ["Table 1"]

    def test_extracts_from_table_label(self):
        """Test extraction from TABLE label items."""
        mock_item = Mock()
        mock_item.label = Mock()
        mock_item.label.value = "table"
        mock_item.orig = "Table 2: Data"
        mock_item.text = "Table 2: Data"

        result = extract_table_declarations_from_doc_items([mock_item])

        assert result == ["Table 2"]

    def test_extracts_decimal_table_numbers(self):
        """Test extraction of decimal identifiers (e.g., 2.3)."""
        mock_item = Mock()
        mock_item.label = Mock()
        mock_item.label.value = "caption"
        mock_item.orig = "Table 2.3: Detailed results"
        mock_item.text = "Table 2.3: Detailed results"

        result = extract_table_declarations_from_doc_items([mock_item])

        assert result == ["Table 2.3"]

    def test_extracts_alphanumeric_table_numbers(self):
        """Test extraction of alphanumeric identifiers (e.g., 5a)."""
        mock_item = Mock()
        mock_item.label = Mock()
        mock_item.label.value = "caption"
        mock_item.orig = "Table 5a: Appendix data"
        mock_item.text = "Table 5a: Appendix data"

        result = extract_table_declarations_from_doc_items([mock_item])

        assert result == ["Table 5a"]

    def test_no_tables(self):
        """Test with no table declarations."""
        mock_item = Mock()
        mock_item.label = Mock()
        mock_item.label.value = "text"
        mock_item.orig = "Some paragraph text"
        mock_item.text = "Some paragraph text"

        result = extract_table_declarations_from_doc_items([mock_item])

        assert result == []

    def test_case_normalization(self):
        """Test that lowercase 'table' is normalized to 'Table'."""
        mock_item = Mock()
        mock_item.label = Mock()
        mock_item.label.value = "caption"
        mock_item.orig = "table 3: lowercase caption"
        mock_item.text = "table 3: lowercase caption"

        result = extract_table_declarations_from_doc_items([mock_item])

        assert result == ["Table 3"]

    def test_deduplication(self):
        """Test that duplicate table numbers are deduplicated."""
        mock_item1 = Mock()
        mock_item1.label = Mock()
        mock_item1.label.value = "caption"
        mock_item1.orig = "Table 1: First mention"
        mock_item1.text = "Table 1: First mention"

        mock_item2 = Mock()
        mock_item2.label = Mock()
        mock_item2.label.value = "table"
        mock_item2.orig = "Table 1: Same table"
        mock_item2.text = "Table 1: Same table"

        result = extract_table_declarations_from_doc_items([mock_item1, mock_item2])

        assert result == ["Table 1"]

    def test_multiple_tables_sorted(self):
        """Test that multiple tables are sorted."""
        mock_item1 = Mock()
        mock_item1.label = Mock()
        mock_item1.label.value = "caption"
        mock_item1.orig = "Table 3: Third"
        mock_item1.text = "Table 3: Third"

        mock_item2 = Mock()
        mock_item2.label = Mock()
        mock_item2.label.value = "caption"
        mock_item2.orig = "Table 1: First"
        mock_item2.text = "Table 1: First"

        result = extract_table_declarations_from_doc_items([mock_item1, mock_item2])

        assert result == ["Table 1", "Table 3"]

    def test_empty_list(self):
        """Test with empty doc_items list."""
        result = extract_table_declarations_from_doc_items([])
        assert result == []

    def test_none_input(self):
        """Test with None input."""
        result = extract_table_declarations_from_doc_items(None)
        assert result == []

    def test_handles_dict_items(self):
        """Test with dict-format items (resolved refs format)."""
        mock_label = Mock()
        mock_label.value = "caption"

        dict_item = {
            "label": mock_label,
            "orig": "Table 4: Dict format",
            "text": "Table 4: Dict format",
        }

        result = extract_table_declarations_from_doc_items([dict_item])

        assert result == ["Table 4"]

    def test_ignores_non_caption_non_table_labels(self):
        """Test that only caption and table labels are checked."""
        mock_item = Mock()
        mock_item.label = Mock()
        mock_item.label.value = "text"
        mock_item.orig = "See Table 5 for details"
        mock_item.text = "See Table 5 for details"

        result = extract_table_declarations_from_doc_items([mock_item])

        assert result == []


class TestFindAdjacentTextFormulaNumber:
    """Test suite for _find_adjacent_text_formula_number function."""

    def _create_mock_item(
        self,
        label: str,
        page_no: int,
        left: float,
        right: float,
        top: float,
        bottom: float,
        orig: str = "",
    ) -> Mock:
        """Create a mock document item with bbox."""
        mock_item = Mock()
        mock_item.label = Mock()
        mock_item.label.value = label
        mock_item.orig = orig
        mock_item.text = orig

        mock_bbox = Mock()
        mock_bbox.l = left
        mock_bbox.r = right
        mock_bbox.t = top
        mock_bbox.b = bottom

        mock_prov = Mock()
        mock_prov.page_no = page_no
        mock_prov.bbox = mock_bbox

        mock_item.prov = [mock_prov]
        return mock_item

    def test_finds_adjacent_text_number_to_right(self):
        """Test finding formula number in text element to the right."""
        from document_ingestion_worker.document_parsing.structure_extractor import (
            _find_adjacent_text_formula_number,
        )

        # Formula element on the left
        formula = self._create_mock_item(
            label="formula",
            page_no=1,
            left=100,
            right=400,
            top=500,
            bottom=450,
            orig="E = mc^2",
        )

        # Text element with formula number to the right
        text_num = self._create_mock_item(
            label="text",
            page_no=1,
            left=450,  # To the right of formula (50px gap)
            right=500,
            top=495,  # Overlaps vertically
            bottom=455,
            orig="(6)",
        )

        all_texts = [formula, text_num]
        result = _find_adjacent_text_formula_number(formula, all_texts)

        assert result == "6"

    def test_ignores_text_to_left_of_formula(self):
        """Test that text elements to the LEFT of formula are ignored."""
        from document_ingestion_worker.document_parsing.structure_extractor import (
            _find_adjacent_text_formula_number,
        )

        # Formula element
        formula = self._create_mock_item(
            label="formula",
            page_no=1,
            left=200,
            right=500,
            top=500,
            bottom=450,
            orig="E = mc^2",
        )

        # Text element with formula number to the LEFT
        text_num = self._create_mock_item(
            label="text",
            page_no=1,
            left=50,  # To the left of formula
            right=150,
            top=495,
            bottom=455,
            orig="(6)",
        )

        all_texts = [formula, text_num]
        result = _find_adjacent_text_formula_number(formula, all_texts)

        assert result is None

    def test_respects_max_horizontal_gap(self):
        """Test that elements beyond max_horizontal_gap are ignored."""
        from document_ingestion_worker.document_parsing.structure_extractor import (
            _find_adjacent_text_formula_number,
        )

        formula = self._create_mock_item(
            label="formula",
            page_no=1,
            left=100,
            right=400,
            top=500,
            bottom=450,
            orig="E = mc^2",
        )

        # Text element far to the right (500px gap > default 400px)
        text_num = self._create_mock_item(
            label="text",
            page_no=1,
            left=900,  # Far right
            right=950,
            top=495,
            bottom=455,
            orig="(6)",
        )

        all_texts = [formula, text_num]
        result = _find_adjacent_text_formula_number(formula, all_texts)

        assert result is None

    def test_respects_custom_max_horizontal_gap(self):
        """Test custom max_horizontal_gap parameter."""
        from document_ingestion_worker.document_parsing.structure_extractor import (
            _find_adjacent_text_formula_number,
        )

        formula = self._create_mock_item(
            label="formula",
            page_no=1,
            left=100,
            right=400,
            top=500,
            bottom=450,
            orig="E = mc^2",
        )

        # Text element 100px to the right
        text_num = self._create_mock_item(
            label="text",
            page_no=1,
            left=500,  # 100px gap
            right=550,
            top=495,
            bottom=455,
            orig="(6)",
        )

        all_texts = [formula, text_num]

        # Should find with default gap (400px)
        result = _find_adjacent_text_formula_number(formula, all_texts)
        assert result == "6"

        # Should NOT find with restrictive gap (50px)
        result = _find_adjacent_text_formula_number(formula, all_texts, max_horizontal_gap=50.0)
        assert result is None

    def test_requires_vertical_overlap(self):
        """Test that elements without vertical overlap are ignored."""
        from document_ingestion_worker.document_parsing.structure_extractor import (
            _find_adjacent_text_formula_number,
        )

        formula = self._create_mock_item(
            label="formula",
            page_no=1,
            left=100,
            right=400,
            top=500,
            bottom=450,
            orig="E = mc^2",
        )

        # Text element with no vertical overlap (above formula)
        text_num = self._create_mock_item(
            label="text",
            page_no=1,
            left=450,
            right=500,
            top=600,  # Above formula
            bottom=550,
            orig="(6)",
        )

        all_texts = [formula, text_num]
        result = _find_adjacent_text_formula_number(formula, all_texts)

        assert result is None

    def test_requires_minimum_vertical_overlap_ratio(self):
        """Test that elements with insufficient vertical overlap are ignored."""
        from document_ingestion_worker.document_parsing.structure_extractor import (
            _find_adjacent_text_formula_number,
        )

        # Formula: height = 50 (500 - 450)
        formula = self._create_mock_item(
            label="formula",
            page_no=1,
            left=100,
            right=400,
            top=500,
            bottom=450,
            orig="E = mc^2",
        )

        # Text: height = 50, but only 10px overlap (20% of smaller height)
        text_num = self._create_mock_item(
            label="text",
            page_no=1,
            left=450,
            right=500,
            top=460,  # Only overlaps 10px (460-450)
            bottom=410,
            orig="(6)",
        )

        all_texts = [formula, text_num]

        # Should NOT find with default 30% overlap requirement
        result = _find_adjacent_text_formula_number(formula, all_texts)
        assert result is None

        # Should find with reduced 10% overlap requirement
        result = _find_adjacent_text_formula_number(
            formula, all_texts, min_vertical_overlap_ratio=0.1
        )
        assert result == "6"

    def test_ignores_different_pages(self):
        """Test that elements on different pages are ignored."""
        from document_ingestion_worker.document_parsing.structure_extractor import (
            _find_adjacent_text_formula_number,
        )

        formula = self._create_mock_item(
            label="formula",
            page_no=1,
            left=100,
            right=400,
            top=500,
            bottom=450,
            orig="E = mc^2",
        )

        # Text element on different page
        text_num = self._create_mock_item(
            label="text",
            page_no=2,  # Different page
            left=450,
            right=500,
            top=495,
            bottom=455,
            orig="(6)",
        )

        all_texts = [formula, text_num]
        result = _find_adjacent_text_formula_number(formula, all_texts)

        assert result is None

    def test_ignores_formula_labels(self):
        """Test that formula-labeled elements are ignored (only TEXT searched)."""
        from document_ingestion_worker.document_parsing.structure_extractor import (
            _find_adjacent_text_formula_number,
        )

        formula = self._create_mock_item(
            label="formula",
            page_no=1,
            left=100,
            right=400,
            top=500,
            bottom=450,
            orig="E = mc^2",
        )

        # Another formula element (not text) to the right
        formula_num = self._create_mock_item(
            label="formula",  # Formula label, not text
            page_no=1,
            left=450,
            right=500,
            top=495,
            bottom=455,
            orig="(6)",
        )

        all_texts = [formula, formula_num]
        result = _find_adjacent_text_formula_number(formula, all_texts)

        assert result is None

    def test_validates_formula_number_pattern(self):
        """Test that only valid formula number patterns are matched."""
        from document_ingestion_worker.document_parsing.structure_extractor import (
            _find_adjacent_text_formula_number,
        )

        formula = self._create_mock_item(
            label="formula",
            page_no=1,
            left=100,
            right=400,
            top=500,
            bottom=450,
            orig="E = mc^2",
        )

        # Text with non-formula-number content
        text_invalid = self._create_mock_item(
            label="text",
            page_no=1,
            left=450,
            right=550,
            top=495,
            bottom=455,
            orig="See page 6",  # Not a formula number pattern
        )

        all_texts = [formula, text_invalid]
        result = _find_adjacent_text_formula_number(formula, all_texts)

        assert result is None

    def test_extracts_appendix_format_number(self):
        """Test extraction of appendix format numbers like (A6.1)."""
        from document_ingestion_worker.document_parsing.structure_extractor import (
            _find_adjacent_text_formula_number,
        )

        formula = self._create_mock_item(
            label="formula",
            page_no=1,
            left=100,
            right=400,
            top=500,
            bottom=450,
            orig="Appendix formula",
        )

        text_num = self._create_mock_item(
            label="text",
            page_no=1,
            left=450,
            right=510,
            top=495,
            bottom=455,
            orig="(A6.1)",
        )

        all_texts = [formula, text_num]
        result = _find_adjacent_text_formula_number(formula, all_texts)

        assert result == "A6.1"

    def test_real_world_right_margin_number(self):
        """Test real-world scenario: formula with number in right margin.

        Based on VCS-VM0042 formulas 6, 66, 74 where the formula number
        appears far to the right and is labeled as "text" by Docling.
        """
        from document_ingestion_worker.document_parsing.structure_extractor import (
            _find_adjacent_text_formula_number,
        )

        # Main formula - multi-line, spans significant vertical space
        formula = self._create_mock_item(
            label="formula",
            page_no=54,
            left=100,
            right=450,
            top=374.0,
            bottom=135.0,  # Tall formula
            orig="Large formula content...",
        )

        # Formula number in right margin - labeled as "text"
        # Gap is about 240px (typical for right-margin placement)
        text_num = self._create_mock_item(
            label="text",
            page_no=54,
            left=690,  # Far right (240px gap)
            right=730,
            top=270.0,  # Within formula's vertical span
            bottom=250.0,
            orig="(66)",
        )

        all_texts = [formula, text_num]
        result = _find_adjacent_text_formula_number(formula, all_texts)

        assert result == "66"

    def test_returns_none_for_empty_orig(self):
        """Test that elements with empty orig are skipped."""
        from document_ingestion_worker.document_parsing.structure_extractor import (
            _find_adjacent_text_formula_number,
        )

        formula = self._create_mock_item(
            label="formula",
            page_no=1,
            left=100,
            right=400,
            top=500,
            bottom=450,
            orig="E = mc^2",
        )

        # Text element with empty content
        text_empty = self._create_mock_item(
            label="text",
            page_no=1,
            left=450,
            right=500,
            top=495,
            bottom=455,
            orig="",
        )

        all_texts = [formula, text_empty]
        result = _find_adjacent_text_formula_number(formula, all_texts)

        assert result is None

    def test_returns_none_for_invalid_formula_bbox(self):
        """Test that formulas without valid bbox return None."""
        from document_ingestion_worker.document_parsing.structure_extractor import (
            _find_adjacent_text_formula_number,
        )

        # Formula without prov
        formula = Mock()
        formula.label = Mock()
        formula.label.value = "formula"
        formula.orig = "E = mc^2"
        formula.prov = None

        text_num = self._create_mock_item(
            label="text",
            page_no=1,
            left=450,
            right=500,
            top=495,
            bottom=455,
            orig="(6)",
        )

        all_texts = [formula, text_num]
        result = _find_adjacent_text_formula_number(formula, all_texts)

        assert result is None
