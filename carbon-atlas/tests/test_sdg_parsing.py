"""
Tests for SDG and certification parsing in the ETL pipeline.

Covers the bugs found during data verification:
1. Gold Standard SDGs are comma-separated numbers that need mapping to labels
2. Verra Additional Certifications column leaks SDG entries (pattern NN:)
"""

from pipeline.extended_schema import _parse_sdg_string


class TestParseSDGString:
    """Verify _parse_sdg_string handles all registry formats."""

    def test_gold_standard_comma_separated_numbers(self):
        result = _parse_sdg_string("3,7,5,13")
        assert result == [
            "03: Good Health and Well-being",
            "05: Gender Equality",
            "07: Affordable and Clean Energy",
            "13: Climate Action",
        ]

    def test_verra_semicolon_separated_labels(self):
        result = _parse_sdg_string("01: No Poverty; 13: Climate Action; 15: Life on Land")
        assert result == ["01: No Poverty", "13: Climate Action", "15: Life on Land"]

    def test_sdg_prefix_stripped(self):
        result = _parse_sdg_string("SDG 7; SDG 13")
        assert result == ["07: Affordable and Clean Energy", "13: Climate Action"]

    def test_single_number(self):
        assert _parse_sdg_string("13") == ["13: Climate Action"]

    def test_all_17_sdgs(self):
        result = _parse_sdg_string(",".join(str(i) for i in range(1, 18)))
        assert len(result) == 17
        assert result[0] == "01: No Poverty"
        assert result[-1] == "17: Partnerships for the Goals"

    def test_deduplicates(self):
        result = _parse_sdg_string("7,7,13,13")
        assert result == ["07: Affordable and Clean Energy", "13: Climate Action"]

    def test_none_input(self):
        assert _parse_sdg_string(None) is None

    def test_empty_string(self):
        assert _parse_sdg_string("") is None

    def test_nan_string(self):
        assert _parse_sdg_string("nan") is None

    def test_preserves_verra_case(self):
        """Verra labels should not be uppercased."""
        result = _parse_sdg_string("03: Good Health and Well-being")
        assert result == ["03: Good Health and Well-being"]

    def test_mixed_numbers_and_labels(self):
        """Handle edge case of mixed formats."""
        result = _parse_sdg_string("7; 13: Climate Action")
        assert "07: Affordable and Clean Energy" in result
        assert "13: Climate Action" in result

    def test_gold_standard_eight_sdgs(self):
        """GS447 has 8 SDGs: 8,15,3,7,5,1,13,12"""
        result = _parse_sdg_string("8,15,3,7,5,1,13,12")
        assert len(result) == 8
        assert "01: No Poverty" in result
        assert "15: Life on Land" in result
