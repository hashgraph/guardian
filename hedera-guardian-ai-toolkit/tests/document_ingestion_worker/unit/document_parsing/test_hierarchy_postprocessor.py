"""Unit tests for FallbackResultPostprocessor."""

from unittest.mock import Mock, patch

import pytest

from document_ingestion_worker.document_parsing.hierarchy_postprocessor import (
    FallbackHierarchyBuilderMetadata,
    FallbackResultPostprocessor,
)


def test_fallback_metadata_returns_empty_toc():
    """Test that FallbackHierarchyBuilderMetadata always returns empty TOC."""
    # Create mock for parent class initialization
    with patch(
        "hierarchical.hierarchy_builder_metadata.HierarchyBuilderMetadata.__init__",
        return_value=None,
    ):
        metadata = FallbackHierarchyBuilderMetadata(None, None)
        assert metadata.toc == []


def test_fallback_postprocessor_replaces_metadata_class():
    """Test that FallbackResultPostprocessor temporarily replaces metadata class."""
    # Mock the convert_result
    mock_result = Mock()

    # Track which metadata class was used
    metadata_class_used = []

    def mock_super_process(self):
        """Mock super().process() to capture which metadata class is active."""
        from hierarchical import postprocessor

        metadata_class_used.append(postprocessor.HierarchyBuilderMetadata)

    with (
        patch("hierarchical.postprocessor.ResultPostprocessor.__init__", return_value=None),
        patch("hierarchical.postprocessor.ResultPostprocessor.process", mock_super_process),
    ):
        postprocessor = FallbackResultPostprocessor(mock_result)
        postprocessor.process()

    # Verify fallback class was used during processing
    assert len(metadata_class_used) == 1
    assert metadata_class_used[0] == FallbackHierarchyBuilderMetadata


def test_fallback_postprocessor_restores_original_class():
    """Test that original metadata class is restored even on exception."""
    from hierarchical import postprocessor

    # Save original class
    original_class = postprocessor.HierarchyBuilderMetadata

    # Mock to raise exception during processing
    mock_result = Mock()

    with (
        patch("hierarchical.postprocessor.ResultPostprocessor.__init__", return_value=None),
        patch(
            "hierarchical.postprocessor.ResultPostprocessor.process",
            side_effect=Exception("Test error"),
        ),
    ):
        postprocessor_instance = FallbackResultPostprocessor(mock_result)

        # Should raise exception but still restore class
        with pytest.raises(Exception, match="Test error"):
            postprocessor_instance.process()

    # Verify original class was restored
    assert postprocessor.HierarchyBuilderMetadata == original_class


def test_fallback_postprocessor_calls_parent_process():
    """Test that FallbackResultPostprocessor calls parent process method."""
    mock_result = Mock()
    process_called = []

    def mock_super_process(self):
        """Track that parent process was called."""
        process_called.append(True)

    with (
        patch("hierarchical.postprocessor.ResultPostprocessor.__init__", return_value=None),
        patch("hierarchical.postprocessor.ResultPostprocessor.process", mock_super_process),
    ):
        postprocessor = FallbackResultPostprocessor(mock_result)
        postprocessor.process()

    # Verify parent process was called
    assert len(process_called) == 1
    assert process_called[0] is True
