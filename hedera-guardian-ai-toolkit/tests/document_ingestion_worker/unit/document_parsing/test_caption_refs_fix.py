"""
Test for caption reference updates after table removal.

Regression test for the IndexError bug that occurred when:
1. detect_and_merge_split_tables removes a table
2. Table indices shift (table[5] becomes table[4])
3. Caption references are not updated
4. Docling serializer tries to resolve caption → IndexError

Document: VCS-Standard-v4.7-FINAL-4.15.24
Error: list index out of range in document.py:1046
"""

from document_ingestion_worker.document_parsing.table_processing import _update_caption_refs


class TestCaptionReferenceUpdate:
    """Test that _update_caption_refs correctly updates caption references."""

    def test_caption_ref_updated_when_target_shifts(self):
        """Test caption ref updates when target index shifts."""
        table = {"captions": [{"cref": "#/texts/5"}]}

        # Simulate: texts[3] removed, so texts[5] → texts[4]
        ref_map = {
            "#/texts/4": "#/texts/3",
            "#/texts/5": "#/texts/4",
            "#/texts/6": "#/texts/5",
        }
        removed_refs = {"#/texts/3"}

        _update_caption_refs(table, ref_map, removed_refs)

        # Caption should be updated to new index
        assert table["captions"][0]["cref"] == "#/texts/4"

    def test_caption_ref_removed_when_target_deleted(self):
        """Test caption removed when it points to deleted item."""
        table = {
            "captions": [
                {"cref": "#/texts/1"},  # Will be removed
                {"cref": "#/texts/2"},  # Stays
            ]
        }

        ref_map = {"#/texts/2": "#/texts/1"}  # texts[2] → texts[1]
        removed_refs = {"#/texts/1"}

        _update_caption_refs(table, ref_map, removed_refs)

        # First caption removed, second updated
        assert len(table["captions"]) == 1
        assert table["captions"][0]["cref"] == "#/texts/1"

    def test_caption_ref_unchanged_when_no_mapping(self):
        """Test caption unchanged when not in ref_map."""
        table = {"captions": [{"cref": "#/texts/0"}]}

        ref_map = {"#/texts/5": "#/texts/4"}  # Doesn't affect texts[0]
        removed_refs = set()

        _update_caption_refs(table, ref_map, removed_refs)

        # Caption unchanged
        assert table["captions"][0]["cref"] == "#/texts/0"

    def test_multiple_captions_updated_correctly(self):
        """Test multiple captions with mixed updates."""
        table = {
            "captions": [
                {"cref": "#/texts/1"},  # Remove (points to removed)
                {"cref": "#/texts/3"},  # Update to #/texts/2
                {"cref": "#/texts/5"},  # Update to #/texts/4
                {"cref": "#/texts/0"},  # Unchanged
            ]
        }

        ref_map = {
            "#/texts/2": "#/texts/1",
            "#/texts/3": "#/texts/2",
            "#/texts/4": "#/texts/3",
            "#/texts/5": "#/texts/4",
        }
        removed_refs = {"#/texts/1"}

        _update_caption_refs(table, ref_map, removed_refs)

        # First caption removed, others updated/unchanged
        assert len(table["captions"]) == 3
        assert table["captions"][0]["cref"] == "#/texts/2"
        assert table["captions"][1]["cref"] == "#/texts/4"
        assert table["captions"][2]["cref"] == "#/texts/0"

    def test_empty_captions_list_handled(self):
        """Test empty captions list doesn't cause errors."""
        table = {"captions": []}

        ref_map = {"#/texts/5": "#/texts/4"}
        removed_refs = {"#/texts/1"}

        # Should not raise any errors
        _update_caption_refs(table, ref_map, removed_refs)

        assert table["captions"] == []

    def test_missing_captions_field_handled(self):
        """Test table without captions field doesn't cause errors."""
        table = {}  # No captions field

        ref_map = {"#/texts/5": "#/texts/4"}
        removed_refs = {"#/texts/1"}

        # Should not raise any errors
        _update_caption_refs(table, ref_map, removed_refs)

        # No captions field created
        assert "captions" not in table

    def test_caption_pointing_to_table(self):
        """Test caption pointing to another table (cross-reference)."""
        table = {"captions": [{"cref": "#/tables/3"}]}

        # tables[2] removed, so tables[3] → tables[2]
        ref_map = {"#/tables/3": "#/tables/2", "#/tables/4": "#/tables/3"}
        removed_refs = {"#/tables/2"}

        _update_caption_refs(table, ref_map, removed_refs)

        # Caption updated to new table index
        assert table["captions"][0]["cref"] == "#/tables/2"

    def test_invalid_caption_structure_handled(self):
        """Test invalid caption items don't cause errors."""
        table = {
            "captions": [
                {"cref": "#/texts/1"},  # Valid
                "invalid_string",  # Invalid
                {"not_cref": "value"},  # Invalid
                {"cref": "#/texts/2"},  # Valid
            ]
        }

        ref_map = {"#/texts/2": "#/texts/1"}
        removed_refs = {"#/texts/1"}

        _update_caption_refs(table, ref_map, removed_refs)

        # First caption removed, invalid items unchanged, last caption updated
        assert len(table["captions"]) == 3  # One removed
        # Skip checking individual items - just verify no crash
