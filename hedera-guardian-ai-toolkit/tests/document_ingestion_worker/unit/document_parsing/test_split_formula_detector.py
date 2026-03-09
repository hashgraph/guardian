"""
Unit tests for split formula detection module.

Tests the detection of multi-line formulas that were split during Docling's
layout detection, and the clustering/merging logic for handling them.
"""

import sys
from dataclasses import dataclass
from typing import Any
from unittest.mock import MagicMock, Mock

import pytest

# ============================================================================
# Module-level mocking - Must happen BEFORE any imports from document_ingestion_worker.document_parsing
# ============================================================================

# Save original modules BEFORE mocking to restore after tests complete
# This prevents mock pollution affecting other test files
# ALL mocked modules must be restored — the module under test is loaded via importlib
# and has already captured its references, so restoring real modules won't affect this file.
_MODULES_TO_RESTORE = [
    "docling_core",
    "docling_core.types",
    "docling_core.types.doc",
    "docling_core.types.doc.labels",
    "document_ingestion_worker.document_parsing.constants",
    "document_ingestion_worker.document_parsing.structure_extractor",
]
_original_modules = {key: sys.modules.get(key) for key in _MODULES_TO_RESTORE}


class MockDocItemLabel:
    """Mock DocItemLabel enum."""

    FORMULA = "formula"
    TEXT = "text"


class MockBoundingBox:
    """Mock BoundingBox class.

    Accepts left/right/top/bottom parameters but exposes l/r/t/b attributes
    for compatibility with Docling's BoundingBox interface.
    """

    def __init__(
        self, left: float, right: float, top: float, bottom: float, coord_origin: str = "BOTTOMLEFT"
    ):
        # Store as l/r/t/b to match Docling BoundingBox attribute names
        self.l = left
        self.r = right
        self.t = top
        self.b = bottom
        self.coord_origin = coord_origin


@dataclass
class MockProvenance:
    """Mock provenance with page and bbox."""

    page_no: int
    bbox: MockBoundingBox


@dataclass
class MockFormulaItem:
    """Mock formula TextItem for testing."""

    self_ref: str
    prov: list[MockProvenance]
    orig: str = ""
    label: Any = None
    text: str = ""

    def __post_init__(self):
        if self.label is None:
            self.label = MockDocItemLabel.FORMULA


def _setup_mock_modules() -> None:
    """Set up all mock modules for docling dependencies."""
    import re

    # Docling mocks
    mock_docling_core = MagicMock()
    mock_docling_core_types = MagicMock()
    mock_docling_core_types_doc = MagicMock()
    mock_docling_core_types_doc.DocItemLabel = MockDocItemLabel
    mock_docling_core_types_doc.BoundingBox = MockBoundingBox
    mock_docling_core_types_doc.NodeItem = Mock

    mock_docling_core_types_doc_labels = MagicMock()
    mock_docling_core_types_doc_labels.DocItemLabel = MockDocItemLabel

    # Mock document_ingestion_worker.document_parsing.constants module with real regex patterns
    # Inner pattern for formula numbers - handles both regular and appendix formats
    formula_num_inner = r"(?:[A-Z]+\d*|\d+)(?:\.\d+)*[a-z]?"

    mock_constants = MagicMock()
    mock_constants.FORMULA_NUMBER_ONLY_PATTERN = re.compile(
        rf"^\s*\$?\s*\(({formula_num_inner})\)\s*\$?\s*$"
    )

    # Mock document_ingestion_worker.document_parsing.structure_extractor for _extract_cluster_formula_number
    mock_structure_extractor = MagicMock()

    def mock_extract_formula_number(orig_text, latex_text=None):
        """Simple mock that extracts from (N) pattern including appendix format."""
        if orig_text:
            # Pattern matches both regular (5, 2.1) and appendix (A1.1) formats
            match = re.search(r"\(([A-Z]+\d*(?:\.\d+)*|\d+(?:\.\d+)*[a-z]?)\)", orig_text)
            if match:
                return match.group(1)
        return None

    mock_structure_extractor.extract_formula_number = mock_extract_formula_number

    # Apply mocks to sys.modules
    sys.modules["docling_core"] = mock_docling_core
    sys.modules["docling_core.types"] = mock_docling_core_types
    sys.modules["docling_core.types.doc"] = mock_docling_core_types_doc
    sys.modules["docling_core.types.doc.labels"] = mock_docling_core_types_doc_labels
    sys.modules["document_ingestion_worker.document_parsing.constants"] = mock_constants
    sys.modules["document_ingestion_worker.document_parsing.structure_extractor"] = (
        mock_structure_extractor
    )


# Setup mocks before importing the module
_setup_mock_modules()


def _restore_mock_modules():
    """Restore original modules to prevent mock pollution affecting other test files."""
    for key in _MODULES_TO_RESTORE:
        orig = _original_modules.get(key)
        if orig is None:
            sys.modules.pop(key, None)
        else:
            sys.modules[key] = orig


# Now import the module under test
import importlib.util  # noqa: E402
from pathlib import Path  # noqa: E402

_MODULE_PATH = (
    Path(__file__).parent.parent.parent.parent.parent
    / "packages"
    / "document_ingestion_worker"
    / "src"
    / "document_ingestion_worker"
    / "document_parsing"
    / "split_formula_detector.py"
)

# Ensure parent package is in sys.modules for relative imports
import types as _types  # noqa: E402

if "document_ingestion_worker.document_parsing" not in sys.modules:
    _parent = _types.ModuleType("document_ingestion_worker.document_parsing")
    _parent.__path__ = [str(_MODULE_PATH.parent)]
    sys.modules["document_ingestion_worker.document_parsing"] = _parent

_spec = importlib.util.spec_from_file_location(
    "document_ingestion_worker.document_parsing.split_formula_detector", _MODULE_PATH
)
_split_formula_module = importlib.util.module_from_spec(_spec)
_split_formula_module.__package__ = "document_ingestion_worker.document_parsing"
sys.modules["document_ingestion_worker.document_parsing.split_formula_detector"] = (
    _split_formula_module
)
_spec.loader.exec_module(_split_formula_module)

# Import the classes and functions we need
FormulaBbox = _split_formula_module.FormulaBbox
FormulaElement = _split_formula_module.FormulaElement
FormulaCluster = _split_formula_module.FormulaCluster
detect_split_formula_clusters = _split_formula_module.detect_split_formula_clusters
build_cluster_lookup = _split_formula_module.build_cluster_lookup
_compute_vertical_gap = _split_formula_module._compute_vertical_gap
_compute_horizontal_overlap_ratio = _split_formula_module._compute_horizontal_overlap_ratio
_should_merge = _split_formula_module._should_merge
_extract_formula_element = _split_formula_module._extract_formula_element

# CRITICAL: Restore original modules IMMEDIATELY after importing the module under test
# This prevents mock pollution from affecting other test files during pytest collection
_restore_mock_modules()


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def simple_formula_item():
    """Create a simple formula item with basic bbox."""
    bbox = MockBoundingBox(left=100, right=400, top=500, bottom=450)
    prov = MockProvenance(page_no=1, bbox=bbox)
    return MockFormulaItem(
        self_ref="#/texts/100",
        prov=[prov],
        orig="E = mc^2",
    )


@pytest.fixture
def formula_with_number():
    """Create a formula item with formula number in orig text."""
    bbox = MockBoundingBox(left=100, right=400, top=500, bottom=450)
    prov = MockProvenance(page_no=1, bbox=bbox)
    return MockFormulaItem(
        self_ref="#/texts/100",
        prov=[prov],
        orig="E = mc^2 (37)",
    )


@pytest.fixture
def formula_number_only():
    """Create a formula item that is just a formula number."""
    bbox = MockBoundingBox(left=450, right=480, top=480, bottom=450)
    prov = MockProvenance(page_no=1, bbox=bbox)
    return MockFormulaItem(
        self_ref="#/texts/101",
        prov=[prov],
        orig="(37)",
    )


# ============================================================================
# Test Classes
# ============================================================================


class TestFormulaBbox:
    """Test suite for FormulaBbox dataclass."""

    def test_bbox_creation(self):
        """Test basic bbox creation."""
        bbox = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        assert bbox.left == 100
        assert bbox.right == 400
        assert bbox.top == 500
        assert bbox.bottom == 450
        assert bbox.page_no == 1

    def test_bbox_width(self):
        """Test width calculation."""
        bbox = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        assert bbox.width == 300

    def test_bbox_height(self):
        """Test height calculation (PDF coordinates: top > bottom)."""
        bbox = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        assert bbox.height == 50

    def test_bbox_from_docling_bbox(self):
        """Test creation from Docling BoundingBox."""
        docling_bbox = MockBoundingBox(left=100, right=400, top=500, bottom=450)
        bbox = FormulaBbox.from_docling_bbox(docling_bbox, page_no=5)
        assert bbox.left == 100
        assert bbox.right == 400
        assert bbox.top == 500
        assert bbox.bottom == 450
        assert bbox.page_no == 5


class TestFormulaElement:
    """Test suite for FormulaElement dataclass."""

    def test_element_creation(self, simple_formula_item):
        """Test basic element creation."""
        bbox = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox,
            orig_text="E = mc^2",
        )
        assert elem.self_ref == "#/texts/100"
        assert elem.orig_text == "E = mc^2"
        assert elem.is_empty_orig is False
        assert elem.has_formula_number is False

    def test_element_detects_empty_orig(self, simple_formula_item):
        """Test detection of empty orig text."""
        bbox = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox,
            orig_text="",
        )
        assert elem.is_empty_orig is True

    def test_element_detects_whitespace_only_orig(self, simple_formula_item):
        """Test detection of whitespace-only orig text."""
        bbox = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox,
            orig_text="   \t\n  ",
        )
        assert elem.is_empty_orig is True

    def test_element_detects_formula_number_pattern(self, simple_formula_item):
        """Test detection of standalone formula number."""
        bbox = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox,
            orig_text="(37)",
        )
        assert elem.has_formula_number is True

    def test_element_no_formula_number_in_expression(self, simple_formula_item):
        """Test formula with embedded number is not flagged as number-only."""
        bbox = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox,
            orig_text="E = mc^2 (37)",
        )
        # Not a standalone formula number - has other content
        assert elem.has_formula_number is False

    @pytest.mark.parametrize(
        "orig_text,expected_has_number",
        [
            ("(37)", True),
            ("(1)", True),
            ("(A6.1)", True),
            ("(2.1)", True),
            ("(45)", True),
            (" (37) ", True),  # With whitespace
            ("E = mc^2", False),
            ("E = mc^2 (37)", False),  # Number embedded in formula
            ("", False),
            ("  ", False),
        ],
    )
    def test_formula_number_detection_patterns(
        self, simple_formula_item, orig_text, expected_has_number
    ):
        """Test various formula number patterns."""
        bbox = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox,
            orig_text=orig_text,
        )
        assert elem.has_formula_number is expected_has_number


class TestFormulaCluster:
    """Test suite for FormulaCluster dataclass."""

    def test_single_element_cluster(self, simple_formula_item):
        """Test cluster with single element."""
        bbox = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox,
            orig_text="E = mc^2",
        )

        cluster = FormulaCluster(elements=[elem])

        assert len(cluster.elements) == 1
        assert cluster.primary_element == elem
        assert cluster.is_split is False
        assert cluster.merged_bbox is not None
        assert cluster.merged_bbox.left == 100
        assert cluster.merged_bbox.right == 400

    def test_multi_element_cluster(self, simple_formula_item):
        """Test cluster with multiple elements (split formula)."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem1 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox1,
            orig_text="COV(...)",
        )

        bbox2 = FormulaBbox(left=100, right=400, top=440, bottom=390, page_no=1)
        elem2 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/101",
            bbox=bbox2,
            orig_text="= ...",
        )

        cluster = FormulaCluster(elements=[elem1, elem2])

        assert len(cluster.elements) == 2
        assert cluster.is_split is True
        assert cluster.merged_bbox is not None
        # Merged bbox should cover both
        assert cluster.merged_bbox.left == 100
        assert cluster.merged_bbox.right == 400
        assert cluster.merged_bbox.top == 500  # Max top
        assert cluster.merged_bbox.bottom == 390  # Min bottom

    def test_primary_element_with_formula_number(self, simple_formula_item):
        """Test primary element selection prioritizes formula number."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem1 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox1,
            orig_text="E = mc^2",
        )

        bbox2 = FormulaBbox(left=450, right=480, top=500, bottom=450, page_no=1)
        elem2 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/101",
            bbox=bbox2,
            orig_text="(37)",  # Has formula number
        )

        cluster = FormulaCluster(elements=[elem1, elem2])

        # Element with formula number should be primary
        assert cluster.primary_element == elem2

    def test_primary_element_falls_back_to_first_in_order(self, simple_formula_item):
        """Test primary element falls back to first in document order."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem1 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/200",  # Higher index
            bbox=bbox1,
            orig_text="Part B",
        )

        bbox2 = FormulaBbox(left=100, right=400, top=440, bottom=390, page_no=1)
        elem2 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",  # Lower index
            bbox=bbox2,
            orig_text="Part A",
        )

        cluster = FormulaCluster(elements=[elem1, elem2])

        # Element with lower index should be primary (first in document order)
        assert cluster.primary_element == elem2

    def test_secondary_elements(self, simple_formula_item):
        """Test secondary_elements property."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem1 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox1,
            orig_text="(37)",
        )

        bbox2 = FormulaBbox(left=100, right=400, top=440, bottom=390, page_no=1)
        elem2 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/101",
            bbox=bbox2,
            orig_text="Part B",
        )

        bbox3 = FormulaBbox(left=100, right=400, top=380, bottom=330, page_no=1)
        elem3 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/102",
            bbox=bbox3,
            orig_text="Part C",
        )

        cluster = FormulaCluster(elements=[elem1, elem2, elem3])

        secondary = cluster.secondary_elements
        assert len(secondary) == 2
        assert elem1 not in secondary  # elem1 is primary (has formula number)
        assert elem2 in secondary
        assert elem3 in secondary


class TestVerticalGapComputation:
    """Test suite for vertical gap computation."""

    def test_overlapping_bboxes_negative_gap(self):
        """Test overlapping bboxes return negative gap."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=400, page_no=1)
        bbox2 = FormulaBbox(left=100, right=400, top=450, bottom=350, page_no=1)  # Overlaps

        gap = _compute_vertical_gap(bbox1, bbox2)
        assert gap < 0  # Negative = overlap

    def test_adjacent_bboxes_small_gap(self):
        """Test adjacent bboxes return small gap."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        bbox2 = FormulaBbox(left=100, right=400, top=445, bottom=400, page_no=1)  # 5px gap

        gap = _compute_vertical_gap(bbox1, bbox2)
        assert gap == 5  # Small positive gap

    def test_distant_bboxes_large_gap(self):
        """Test distant bboxes return large gap."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        bbox2 = FormulaBbox(left=100, right=400, top=300, bottom=250, page_no=1)  # Far apart

        gap = _compute_vertical_gap(bbox1, bbox2)
        assert gap == 150  # Large positive gap


class TestHorizontalOverlapComputation:
    """Test suite for horizontal overlap computation."""

    def test_complete_overlap(self):
        """Test complete horizontal overlap returns 1.0."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        bbox2 = FormulaBbox(left=100, right=400, top=440, bottom=390, page_no=1)  # Same l/r

        ratio = _compute_horizontal_overlap_ratio(bbox1, bbox2)
        assert ratio == 1.0

    def test_partial_overlap(self):
        """Test partial horizontal overlap."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)  # width=300
        bbox2 = FormulaBbox(
            left=250, right=450, top=440, bottom=390, page_no=1
        )  # width=200, overlap=150

        ratio = _compute_horizontal_overlap_ratio(bbox1, bbox2)
        # Overlap is 150 (from 250 to 400), smaller width is 200
        assert ratio == 0.75  # 150/200

    def test_no_overlap(self):
        """Test no horizontal overlap returns 0."""
        bbox1 = FormulaBbox(left=100, right=200, top=500, bottom=450, page_no=1)
        bbox2 = FormulaBbox(left=300, right=400, top=440, bottom=390, page_no=1)  # Separate

        ratio = _compute_horizontal_overlap_ratio(bbox1, bbox2)
        assert ratio == 0.0


class TestShouldMerge:
    """Test suite for merge decision logic."""

    def test_merge_vertical_split_with_overlap(self):
        """Test merging vertically adjacent bboxes with horizontal overlap."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        bbox2 = FormulaBbox(left=100, right=400, top=445, bottom=400, page_no=1)

        elem1 = FormulaElement(item=Mock(), self_ref="#/texts/1", bbox=bbox1, orig_text="Part 1")
        elem2 = FormulaElement(item=Mock(), self_ref="#/texts/2", bbox=bbox2, orig_text="Part 2")

        assert _should_merge(
            elem1, elem2, vertical_gap_threshold=10.0, horizontal_overlap_ratio=0.3
        )

    def test_no_merge_different_pages(self):
        """Test no merging across different pages."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        bbox2 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=2)  # Different page

        elem1 = FormulaElement(item=Mock(), self_ref="#/texts/1", bbox=bbox1, orig_text="Part 1")
        elem2 = FormulaElement(item=Mock(), self_ref="#/texts/2", bbox=bbox2, orig_text="Part 2")

        assert not _should_merge(
            elem1, elem2, vertical_gap_threshold=10.0, horizontal_overlap_ratio=0.3
        )

    def test_no_merge_large_vertical_gap(self):
        """Test no merging with large vertical gap."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        bbox2 = FormulaBbox(left=100, right=400, top=300, bottom=250, page_no=1)  # 150px gap

        elem1 = FormulaElement(item=Mock(), self_ref="#/texts/1", bbox=bbox1, orig_text="Part 1")
        elem2 = FormulaElement(item=Mock(), self_ref="#/texts/2", bbox=bbox2, orig_text="Part 2")

        assert not _should_merge(
            elem1, elem2, vertical_gap_threshold=10.0, horizontal_overlap_ratio=0.3
        )

    def test_no_merge_no_horizontal_overlap(self):
        """Test no merging without horizontal overlap."""
        bbox1 = FormulaBbox(left=100, right=200, top=500, bottom=450, page_no=1)
        bbox2 = FormulaBbox(left=300, right=400, top=445, bottom=400, page_no=1)  # No h overlap

        elem1 = FormulaElement(item=Mock(), self_ref="#/texts/1", bbox=bbox1, orig_text="Part 1")
        elem2 = FormulaElement(item=Mock(), self_ref="#/texts/2", bbox=bbox2, orig_text="Part 2")

        # Should not merge - no horizontal overlap for vertical split detection
        # And not enough vertical overlap for horizontal split detection
        assert not _should_merge(
            elem1, elem2, vertical_gap_threshold=10.0, horizontal_overlap_ratio=0.3
        )

    def test_merge_horizontal_split(self):
        """Test merging horizontally adjacent bboxes (side by side)."""
        bbox1 = FormulaBbox(left=100, right=200, top=500, bottom=450, page_no=1)
        bbox2 = FormulaBbox(
            left=220, right=400, top=500, bottom=450, page_no=1
        )  # Side by side, 20px gap

        elem1 = FormulaElement(item=Mock(), self_ref="#/texts/1", bbox=bbox1, orig_text="Left")
        elem2 = FormulaElement(item=Mock(), self_ref="#/texts/2", bbox=bbox2, orig_text="Right")

        # Same vertical position (complete vertical overlap), horizontal gap of 20px
        result = _should_merge(
            elem1, elem2, vertical_gap_threshold=10.0, horizontal_overlap_ratio=0.3
        )
        assert result  # Should merge as horizontal split


class TestExtractFormulaElement:
    """Test suite for formula element extraction."""

    def test_extract_valid_item(self, simple_formula_item):
        """Test extraction from valid formula item."""
        elem = _extract_formula_element(simple_formula_item)
        assert elem is not None
        assert elem.self_ref == "#/texts/100"
        assert elem.orig_text == "E = mc^2"
        assert elem.bbox.page_no == 1

    def test_extract_missing_self_ref(self):
        """Test extraction fails without self_ref."""
        item = Mock()
        item.self_ref = None
        item.prov = [MockProvenance(page_no=1, bbox=MockBoundingBox(0, 100, 100, 0))]

        elem = _extract_formula_element(item)
        assert elem is None

    def test_extract_missing_prov(self):
        """Test extraction fails without provenance."""
        item = Mock()
        item.self_ref = "#/texts/1"
        item.prov = None

        elem = _extract_formula_element(item)
        assert elem is None

    def test_extract_empty_prov(self):
        """Test extraction fails with empty provenance list."""
        item = Mock()
        item.self_ref = "#/texts/1"
        item.prov = []

        elem = _extract_formula_element(item)
        assert elem is None


class TestDetectSplitFormulaClusters:
    """Test suite for main detection function."""

    def test_no_formulas_returns_empty(self):
        """Test empty input returns empty list."""
        clusters = detect_split_formula_clusters([])
        assert clusters == []

    def test_single_formula_returns_single_cluster(self, simple_formula_item):
        """Test single formula returns non-split cluster."""
        clusters = detect_split_formula_clusters([simple_formula_item])

        assert len(clusters) == 1
        assert clusters[0].is_split is False
        assert len(clusters[0].elements) == 1

    def test_detects_vertical_split(self):
        """Test detection of vertically split formula."""
        # Two formulas on same page, vertically adjacent
        bbox1 = MockBoundingBox(left=100, right=400, top=500, bottom=450)
        bbox2 = MockBoundingBox(left=100, right=400, top=445, bottom=400)  # 5px gap

        item1 = MockFormulaItem(
            self_ref="#/texts/100",
            prov=[MockProvenance(page_no=1, bbox=bbox1)],
            orig="Part 1",
        )
        item2 = MockFormulaItem(
            self_ref="#/texts/101",
            prov=[MockProvenance(page_no=1, bbox=bbox2)],
            orig="Part 2",
        )

        clusters = detect_split_formula_clusters([item1, item2])

        assert len(clusters) == 1
        assert clusters[0].is_split is True
        assert len(clusters[0].elements) == 2

    def test_separate_formulas_not_merged(self):
        """Test formulas far apart are not merged."""
        bbox1 = MockBoundingBox(left=100, right=400, top=500, bottom=450)
        bbox2 = MockBoundingBox(left=100, right=400, top=200, bottom=150)  # Far apart

        item1 = MockFormulaItem(
            self_ref="#/texts/100",
            prov=[MockProvenance(page_no=1, bbox=bbox1)],
            orig="Formula 1",
        )
        item2 = MockFormulaItem(
            self_ref="#/texts/101",
            prov=[MockProvenance(page_no=1, bbox=bbox2)],
            orig="Formula 2",
        )

        clusters = detect_split_formula_clusters([item1, item2])

        assert len(clusters) == 2
        assert all(not c.is_split for c in clusters)

    def test_different_pages_not_merged(self):
        """Test formulas on different pages are not merged."""
        bbox1 = MockBoundingBox(left=100, right=400, top=500, bottom=450)
        bbox2 = MockBoundingBox(
            left=100, right=400, top=500, bottom=450
        )  # Same position, different page

        item1 = MockFormulaItem(
            self_ref="#/texts/100",
            prov=[MockProvenance(page_no=1, bbox=bbox1)],
            orig="Page 1 formula",
        )
        item2 = MockFormulaItem(
            self_ref="#/texts/101",
            prov=[MockProvenance(page_no=2, bbox=bbox2)],
            orig="Page 2 formula",
        )

        clusters = detect_split_formula_clusters([item1, item2])

        assert len(clusters) == 2
        assert all(not c.is_split for c in clusters)

    def test_three_way_split(self):
        """Test detection of formula split into three parts."""
        bbox1 = MockBoundingBox(left=100, right=400, top=500, bottom=450)
        bbox2 = MockBoundingBox(left=100, right=400, top=445, bottom=400)  # 5px gap
        bbox3 = MockBoundingBox(left=100, right=400, top=395, bottom=350)  # 5px gap

        item1 = MockFormulaItem(
            self_ref="#/texts/100",
            prov=[MockProvenance(page_no=1, bbox=bbox1)],
            orig="Part 1",
        )
        item2 = MockFormulaItem(
            self_ref="#/texts/101",
            prov=[MockProvenance(page_no=1, bbox=bbox2)],
            orig="Part 2",
        )
        item3 = MockFormulaItem(
            self_ref="#/texts/102",
            prov=[MockProvenance(page_no=1, bbox=bbox3)],
            orig="Part 3",
        )

        clusters = detect_split_formula_clusters([item1, item2, item3])

        assert len(clusters) == 1
        assert clusters[0].is_split is True
        assert len(clusters[0].elements) == 3

    def test_custom_threshold(self):
        """Test custom vertical gap threshold."""
        bbox1 = MockBoundingBox(left=100, right=400, top=500, bottom=450)
        bbox2 = MockBoundingBox(left=100, right=400, top=430, bottom=380)  # 20px gap

        item1 = MockFormulaItem(
            self_ref="#/texts/100",
            prov=[MockProvenance(page_no=1, bbox=bbox1)],
            orig="Part 1",
        )
        item2 = MockFormulaItem(
            self_ref="#/texts/101",
            prov=[MockProvenance(page_no=1, bbox=bbox2)],
            orig="Part 2",
        )

        # Default threshold (10px) - should not merge
        clusters_default = detect_split_formula_clusters(
            [item1, item2], vertical_gap_threshold=10.0
        )
        assert len(clusters_default) == 2

        # Higher threshold (25px) - should merge
        clusters_high = detect_split_formula_clusters([item1, item2], vertical_gap_threshold=25.0)
        assert len(clusters_high) == 1
        assert clusters_high[0].is_split is True


class TestBuildClusterLookup:
    """Test suite for cluster lookup building."""

    def test_build_lookup_single_element(self):
        """Test lookup from single-element clusters."""
        bbox = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem = FormulaElement(item=Mock(), self_ref="#/texts/100", bbox=bbox, orig_text="Formula")
        cluster = FormulaCluster(elements=[elem])

        cluster_by_ref, merged_into = build_cluster_lookup([cluster])

        assert "#/texts/100" in cluster_by_ref
        assert cluster_by_ref["#/texts/100"] == cluster
        assert merged_into == {}  # No secondary elements

    def test_build_lookup_split_cluster(self):
        """Test lookup from split cluster."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem1 = FormulaElement(item=Mock(), self_ref="#/texts/100", bbox=bbox1, orig_text="(37)")

        bbox2 = FormulaBbox(left=100, right=400, top=440, bottom=390, page_no=1)
        elem2 = FormulaElement(item=Mock(), self_ref="#/texts/101", bbox=bbox2, orig_text="Part 2")

        cluster = FormulaCluster(elements=[elem1, elem2])

        cluster_by_ref, merged_into = build_cluster_lookup([cluster])

        # Both elements in cluster_by_ref
        assert "#/texts/100" in cluster_by_ref
        assert "#/texts/101" in cluster_by_ref

        # Secondary element points to primary
        assert merged_into["#/texts/101"] == "#/texts/100"
        assert "#/texts/100" not in merged_into  # Primary not in merged_into

    def test_build_lookup_multiple_clusters(self):
        """Test lookup from multiple clusters."""
        # Cluster 1 - split
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem1 = FormulaElement(item=Mock(), self_ref="#/texts/100", bbox=bbox1, orig_text="(1)")
        bbox2 = FormulaBbox(left=100, right=400, top=440, bottom=390, page_no=1)
        elem2 = FormulaElement(item=Mock(), self_ref="#/texts/101", bbox=bbox2, orig_text="Part")
        cluster1 = FormulaCluster(elements=[elem1, elem2])

        # Cluster 2 - single
        bbox3 = FormulaBbox(left=100, right=400, top=300, bottom=250, page_no=1)
        elem3 = FormulaElement(
            item=Mock(), self_ref="#/texts/200", bbox=bbox3, orig_text="Separate"
        )
        cluster2 = FormulaCluster(elements=[elem3])

        cluster_by_ref, merged_into = build_cluster_lookup([cluster1, cluster2])

        # All elements in cluster_by_ref
        assert len(cluster_by_ref) == 3
        assert cluster_by_ref["#/texts/100"] == cluster1
        assert cluster_by_ref["#/texts/101"] == cluster1
        assert cluster_by_ref["#/texts/200"] == cluster2

        # Only split cluster has merged_into
        assert merged_into == {"#/texts/101": "#/texts/100"}


class TestRealWorldScenarios:
    """Test cases based on real split scenarios from VCS-VM0042."""

    def test_formula_number_split(self):
        """Test formula number (37) detected as separate element.

        Based on Page 54: #/texts/758 (main) + #/texts/759 (just "(37)")
        """
        # Main formula - large multi-line
        bbox_main = MockBoundingBox(left=100, right=450, top=374.1, bottom=134.8)
        item_main = MockFormulaItem(
            self_ref="#/texts/758",
            prov=[MockProvenance(page_no=54, bbox=bbox_main)],
            orig="Large formula content...",
        )

        # Formula number - far right
        bbox_num = MockBoundingBox(left=509.0, right=530.0, top=270.0, bottom=250.0)
        item_num = MockFormulaItem(
            self_ref="#/texts/759",
            prov=[MockProvenance(page_no=54, bbox=bbox_num)],
            orig="(37)",
        )

        # These have vertical overlap since main formula spans t=374.1 to b=134.8
        # and number is at t=270.0, bottom=250.0 (within that range)
        # But no horizontal overlap (main: 100-450, number: 509-530)
        clusters = detect_split_formula_clusters([item_main, item_num])

        # Gap is 59px (509 - 450) which is within MAX_HORIZONTAL_GAP_PX (70),
        # so these should merge into a single split cluster
        assert len(clusters) == 1
        assert clusters[0].is_split is True

    def test_empty_orig_split(self):
        """Test split where one part has empty orig text.

        Based on Page 58: #/texts/819 (empty orig) + #/texts/820 (real formula)
        """
        bbox_empty = MockBoundingBox(left=100, right=400, top=500, bottom=470)
        item_empty = MockFormulaItem(
            self_ref="#/texts/819",
            prov=[MockProvenance(page_no=58, bbox=bbox_empty)],
            orig="",  # Empty orig
        )

        bbox_real = MockBoundingBox(left=100, right=400, top=460, bottom=400)
        item_real = MockFormulaItem(
            self_ref="#/texts/820",
            prov=[MockProvenance(page_no=58, bbox=bbox_real)],
            orig="Real formula content",
        )

        clusters = detect_split_formula_clusters([item_empty, item_real])

        assert len(clusters) == 1
        assert clusters[0].is_split is True

        # Primary is first in document order (neither has formula number)
        assert clusters[0].primary_element.self_ref == "#/texts/819"  # First in order

    def test_vertical_continuation_split(self):
        """Test COV(...) on line 1, = ... continuation on line 2.

        Based on Page 77: #/texts/1171 + #/texts/1172
        """
        bbox_cov = MockBoundingBox(left=100, right=400, top=500, bottom=460)
        item_cov = MockFormulaItem(
            self_ref="#/texts/1171",
            prov=[MockProvenance(page_no=77, bbox=bbox_cov)],
            orig="COV(SOC...)",
        )

        bbox_eq = MockBoundingBox(left=100, right=400, top=455.6, bottom=420)  # 4.4px gap
        item_eq = MockFormulaItem(
            self_ref="#/texts/1172",
            prov=[MockProvenance(page_no=77, bbox=bbox_eq)],
            orig="= ...",
        )

        clusters = detect_split_formula_clusters([item_cov, item_eq])

        assert len(clusters) == 1
        assert clusters[0].is_split is True
        assert len(clusters[0].elements) == 2


class TestClusterFormulaNumberExtraction:
    """Test suite for extracted_formula_number from split clusters."""

    def test_extracts_from_standalone_number_element(self, simple_formula_item):
        """Test extraction from standalone formula number element (37)."""
        # Main formula element - no number
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem1 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox1,
            orig_text="E = mc^2",
        )

        # Formula number element - standalone (37)
        bbox2 = FormulaBbox(left=450, right=480, top=500, bottom=450, page_no=1)
        elem2 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/101",
            bbox=bbox2,
            orig_text="(37)",
        )

        cluster = FormulaCluster(elements=[elem1, elem2])

        assert cluster.is_split is True
        assert cluster.extracted_formula_number == "37"

    def test_extracts_from_embedded_number_in_element(self, simple_formula_item):
        """Test extraction from element with embedded number in orig_text."""
        # Formula part 1 - no number
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem1 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox1,
            orig_text="COV(SOC...)",
        )

        # Formula part 2 - has embedded number
        bbox2 = FormulaBbox(left=100, right=400, top=440, bottom=390, page_no=1)
        elem2 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/101",
            bbox=bbox2,
            orig_text="= result (45)",
        )

        cluster = FormulaCluster(elements=[elem1, elem2])

        assert cluster.is_split is True
        assert cluster.extracted_formula_number == "45"

    def test_standalone_number_prioritized_over_embedded(self, simple_formula_item):
        """Test standalone (N) element takes priority over embedded number."""
        # Formula with embedded number
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem1 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox1,
            orig_text="formula (99)",  # Embedded number
        )

        # Standalone formula number
        bbox2 = FormulaBbox(left=450, right=480, top=500, bottom=450, page_no=1)
        elem2 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/101",
            bbox=bbox2,
            orig_text="(42)",  # Standalone number - should be prioritized
        )

        cluster = FormulaCluster(elements=[elem1, elem2])

        assert cluster.is_split is True
        # Standalone (42) should be extracted, not embedded (99)
        assert cluster.extracted_formula_number == "42"

    def test_no_extraction_for_single_element_cluster(self, simple_formula_item):
        """Test no extraction for non-split (single element) clusters."""
        bbox = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox,
            orig_text="E = mc^2 (37)",
        )

        cluster = FormulaCluster(elements=[elem])

        assert cluster.is_split is False
        # Should not extract for non-split clusters
        assert cluster.extracted_formula_number is None

    def test_no_number_when_elements_have_no_number(self, simple_formula_item):
        """Test None when no element has a formula number."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem1 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox1,
            orig_text="Part A",
        )

        bbox2 = FormulaBbox(left=100, right=400, top=440, bottom=390, page_no=1)
        elem2 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/101",
            bbox=bbox2,
            orig_text="Part B",
        )

        cluster = FormulaCluster(elements=[elem1, elem2])

        assert cluster.is_split is True
        assert cluster.extracted_formula_number is None

    def test_extracts_appendix_format_number(self, simple_formula_item):
        """Test extraction of appendix format numbers like (A6.1)."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem1 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox1,
            orig_text="Formula content",
        )

        bbox2 = FormulaBbox(left=450, right=500, top=500, bottom=450, page_no=1)
        elem2 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/101",
            bbox=bbox2,
            orig_text="(A6.1)",
        )

        cluster = FormulaCluster(elements=[elem1, elem2])

        assert cluster.is_split is True
        assert cluster.extracted_formula_number == "A6.1"

    def test_extracts_decimal_format_number(self, simple_formula_item):
        """Test extraction of decimal format numbers like (2.1)."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem1 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox1,
            orig_text="Main formula",
        )

        bbox2 = FormulaBbox(left=450, right=500, top=500, bottom=450, page_no=1)
        elem2 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/101",
            bbox=bbox2,
            orig_text="(2.1)",
        )

        cluster = FormulaCluster(elements=[elem1, elem2])

        assert cluster.is_split is True
        assert cluster.extracted_formula_number == "2.1"

    def test_real_world_split_formula_with_number(self):
        """Test real-world scenario: E = mc^2 split with (37) in secondary element.

        Based on the problem described in the plan - formula content in one element
        and formula number in a separate element due to layout detection split.
        """
        # Main formula element - just the formula content
        bbox_main = MockBoundingBox(left=100, right=400, top=500, bottom=450)
        item_main = MockFormulaItem(
            self_ref="#/texts/758",
            prov=[MockProvenance(page_no=54, bbox=bbox_main)],
            orig="E = mc^2",  # No formula number
        )

        # Formula number element - just the number
        bbox_num = MockBoundingBox(left=420, right=460, top=500, bottom=450)
        item_num = MockFormulaItem(
            self_ref="#/texts/759",
            prov=[MockProvenance(page_no=54, bbox=bbox_num)],
            orig="(37)",  # Only formula number
        )

        clusters = detect_split_formula_clusters([item_main, item_num])

        assert len(clusters) == 1
        assert clusters[0].is_split is True
        assert clusters[0].extracted_formula_number == "37"

    def test_horizontal_gap_64px_merges_with_new_threshold(self):
        """Test that 64px horizontal gap merges with MAX_HORIZONTAL_GAP_PX=70.

        Based on formula 37 in VCS-VM0042 where the gap was 64px, which exceeded
        the old 50px threshold but is within the new 70px threshold.
        """
        # Main formula element
        bbox_main = MockBoundingBox(left=100, right=400, top=500, bottom=450)
        item_main = MockFormulaItem(
            self_ref="#/texts/100",
            prov=[MockProvenance(page_no=1, bbox=bbox_main)],
            orig="Formula content",
        )

        # Formula number element with 64px horizontal gap (400 + 64 = 464)
        bbox_num = MockBoundingBox(left=464, right=500, top=500, bottom=450)
        item_num = MockFormulaItem(
            self_ref="#/texts/101",
            prov=[MockProvenance(page_no=1, bbox=bbox_num)],
            orig="(37)",
        )

        clusters = detect_split_formula_clusters([item_main, item_num])

        # Should merge with the new 70px threshold (64px < 70px)
        assert len(clusters) == 1
        assert clusters[0].is_split is True
        assert clusters[0].extracted_formula_number == "37"

    def test_horizontal_gap_80px_does_not_merge(self):
        """Test that 80px horizontal gap does NOT merge (exceeds 70px threshold)."""
        # Main formula element
        bbox_main = MockBoundingBox(left=100, right=400, top=500, bottom=450)
        item_main = MockFormulaItem(
            self_ref="#/texts/100",
            prov=[MockProvenance(page_no=1, bbox=bbox_main)],
            orig="Formula content",
        )

        # Formula number element with 80px horizontal gap (400 + 80 = 480)
        bbox_num = MockBoundingBox(left=480, right=520, top=500, bottom=450)
        item_num = MockFormulaItem(
            self_ref="#/texts/101",
            prov=[MockProvenance(page_no=1, bbox=bbox_num)],
            orig="(37)",
        )

        clusters = detect_split_formula_clusters([item_main, item_num])

        # Should NOT merge because 80px > 70px threshold
        assert len(clusters) == 2
        assert all(not c.is_split for c in clusters)

    def test_skips_empty_orig_elements(self, simple_formula_item):
        """Test extraction skips elements with empty orig_text."""
        bbox1 = FormulaBbox(left=100, right=400, top=500, bottom=450, page_no=1)
        elem1 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/100",
            bbox=bbox1,
            orig_text="",  # Empty
        )

        bbox2 = FormulaBbox(left=100, right=400, top=440, bottom=390, page_no=1)
        elem2 = FormulaElement(
            item=simple_formula_item,
            self_ref="#/texts/101",
            bbox=bbox2,
            orig_text="(42)",
        )

        cluster = FormulaCluster(elements=[elem1, elem2])

        assert cluster.is_split is True
        assert cluster.extracted_formula_number == "42"
