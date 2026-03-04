"""
Unit tests for SuryaFormulaEnrichmentModel.

Tests the custom enrichment model that uses Surya's RecognitionPredictor for
LaTeX formula extraction. All Surya and Docling dependencies are mocked to
allow testing without surya-ocr installed.
"""

import sys
import threading
from pathlib import Path
from unittest.mock import MagicMock, Mock

import pytest

# PIL is needed for image creation in tests
PIL = pytest.importorskip("PIL", reason="PIL/Pillow not installed")
from PIL import Image  # noqa: E402

# ============================================================================
# Module-level mocking - Must happen BEFORE any imports from document_ingestion_worker.document_parsing
# ============================================================================

# Save original modules BEFORE mocking to restore after tests complete
# This prevents mock pollution affecting other test files
# ALL mocked modules must be restored EXCEPT docling.datamodel.base_models which provides
# the mock ItemAndImageEnrichmentElement used by TestSequentialDocumentProcessing tests.
_MODULES_TO_RESTORE = [
    "surya",
    "surya.common",
    "surya.common.surya",
    "surya.common.surya.schema",
    "surya.foundation",
    "surya.recognition",
    "docling",
    "docling.models",
    "docling.models.base_model",
    "docling_core",
    "docling_core.types",
    "docling_core.types.doc",
    "docling.datamodel",
    # NOTE: docling.datamodel.base_models intentionally NOT restored — it provides the mock
    # ItemAndImageEnrichmentElement that TestSequentialDocumentProcessing tests depend on.
    "docling.chunking",
    "docling.pipeline",
    "docling.datamodel.pipeline_options",
    "docling.pipeline.standard_pdf_pipeline",
    "document_ingestion_worker.document_parsing.split_formula_detector",
    "document_ingestion_worker.document_parsing.constants",
    "document_ingestion_worker.document_parsing.structure_extractor",
]
_original_modules = {key: sys.modules.get(key) for key in _MODULES_TO_RESTORE}


class MockDocItemLabel:
    """Mock DocItemLabel enum."""

    FORMULA = "formula"
    TEXT = "text"
    TABLE = "table"


class MockTextItem:
    """Mock TextItem class."""

    def __init__(self, label=None, text=""):
        self.label = label
        self.text = text


class MockBaseItemAndImageEnrichmentModel:
    """Mock base class for enrichment models."""

    images_scale: float = 2.6


class MockTaskNames:
    """Mock TaskNames enum."""

    block_without_boxes = "block_without_boxes"
    ocr_with_boxes = "ocr_with_boxes"


def _setup_mock_modules() -> None:
    """Set up all mock modules for surya and docling dependencies."""
    # Surya mocks
    mock_surya = MagicMock()
    mock_surya_common = MagicMock()
    mock_surya_common_surya = MagicMock()
    mock_surya_common_surya_schema = MagicMock()
    mock_surya_common_surya_schema.TaskNames = MockTaskNames

    mock_surya_foundation = MagicMock()
    mock_surya_foundation.FoundationPredictor = MagicMock()

    mock_surya_recognition = MagicMock()
    mock_surya_recognition.RecognitionPredictor = MagicMock()

    # Docling mocks
    mock_docling = MagicMock()
    mock_docling_models = MagicMock()
    mock_base_model = MagicMock()
    mock_base_model.BaseItemAndImageEnrichmentModel = MockBaseItemAndImageEnrichmentModel
    mock_docling_models.base_model = mock_base_model

    mock_docling_core = MagicMock()
    mock_docling_core_types = MagicMock()
    mock_docling_core_types_doc = MagicMock()
    mock_docling_core_types_doc.DocItemLabel = MockDocItemLabel
    mock_docling_core_types_doc.DoclingDocument = MagicMock
    mock_docling_core_types_doc.NodeItem = MagicMock
    mock_docling_core_types_doc.TextItem = MockTextItem

    mock_docling_datamodel = MagicMock()
    mock_docling_base_models = MagicMock()
    mock_docling_chunking = MagicMock()
    mock_docling_pipeline = MagicMock()
    mock_docling_pipeline_options = MagicMock()
    mock_docling_standard_pipeline = MagicMock()

    # Mock split_formula_detector module
    mock_split_formula_detector = MagicMock()
    mock_split_formula_detector.FormulaCluster = MagicMock()
    mock_split_formula_detector.build_cluster_lookup = MagicMock(return_value=({}, {}))
    mock_split_formula_detector.detect_split_formula_clusters = MagicMock(return_value=[])

    # Mock document_ingestion_worker.document_parsing.constants module with real regex patterns
    import re

    # Inner pattern for formula numbers - handles both regular and appendix formats
    formula_num_inner = r"(?:[A-Z]+\d*|\d+)(?:\.\d+)*[a-z]?"

    mock_constants = MagicMock()
    mock_constants.FORMULA_NUMBER_ONLY_PATTERN = re.compile(
        rf"^\s*\$?\s*\(({formula_num_inner})\)\s*\$?\s*$"
    )
    mock_constants.FORMULA_PAREN_END_PATTERN = re.compile(rf"\(({formula_num_inner})\)\s*$")
    mock_constants.FORMULA_PAREN_OUTSIDE_LATEX = re.compile(
        rf"(\$\$?)\s*\n?\s*\(({formula_num_inner})\)\s*$"
    )
    mock_constants.FORMULA_TAG_PATTERN = re.compile(r"\\tag\s*\{([^}]+)\}")
    mock_constants.MAX_NUMBER_ELEMENT_GAP_PX = 400
    mock_constants.MIN_VERTICAL_OVERLAP_RATIO = 0.5

    # Mock document_ingestion_worker.document_parsing.structure_extractor
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

    # Force package initialization with real dependencies BEFORE mocking.
    # This caches document_ingestion_worker.document_parsing in sys.modules so __init__.py won't
    # re-execute (against mocked docling) when exec_module triggers
    # `from document_ingestion_worker.document_parsing.constants import ...`.
    from document_ingestion_worker import document_parsing  # noqa: E402, F401

    # Apply mocks to sys.modules
    sys.modules["surya"] = mock_surya
    sys.modules["surya.common"] = mock_surya_common
    sys.modules["surya.common.surya"] = mock_surya_common_surya
    sys.modules["surya.common.surya.schema"] = mock_surya_common_surya_schema
    sys.modules["surya.foundation"] = mock_surya_foundation
    sys.modules["surya.recognition"] = mock_surya_recognition
    sys.modules["docling"] = mock_docling
    sys.modules["docling.models"] = mock_docling_models
    sys.modules["docling.models.base_model"] = mock_base_model
    sys.modules["docling_core"] = mock_docling_core
    sys.modules["docling_core.types"] = mock_docling_core_types
    sys.modules["docling_core.types.doc"] = mock_docling_core_types_doc
    sys.modules["docling.datamodel"] = mock_docling_datamodel
    sys.modules["docling.datamodel.base_models"] = mock_docling_base_models
    sys.modules["docling.chunking"] = mock_docling_chunking
    sys.modules["docling.pipeline"] = mock_docling_pipeline
    sys.modules["docling.datamodel.pipeline_options"] = mock_docling_pipeline_options
    sys.modules["docling.pipeline.standard_pdf_pipeline"] = mock_docling_standard_pipeline
    sys.modules["document_ingestion_worker.document_parsing.split_formula_detector"] = (
        mock_split_formula_detector
    )
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


# Now we can safely import the module under test using absolute path
import importlib.util  # noqa: E402

_MODULE_PATH = (
    Path(__file__).parent.parent.parent.parent.parent
    / "packages"
    / "document_ingestion_worker"
    / "src"
    / "document_ingestion_worker"
    / "document_parsing"
    / "surya_enrichment_model.py"
)

_spec = importlib.util.spec_from_file_location(
    "document_ingestion_worker.document_parsing.surya_enrichment_model", _MODULE_PATH
)
_surya_enrichment_module = importlib.util.module_from_spec(_spec)
_surya_enrichment_module.__package__ = "document_ingestion_worker.document_parsing"
sys.modules["document_ingestion_worker.document_parsing.surya_enrichment_model"] = (
    _surya_enrichment_module
)
_spec.loader.exec_module(_surya_enrichment_module)

SuryaFormulaEnrichmentModel = _surya_enrichment_module.SuryaFormulaEnrichmentModel

# CRITICAL: Restore original modules IMMEDIATELY after importing the module under test
# This prevents mock pollution from affecting other test files during pytest collection
_restore_mock_modules()


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def enabled_model():
    """Create an enabled SuryaFormulaEnrichmentModel instance."""
    return SuryaFormulaEnrichmentModel(enabled=True)


@pytest.fixture
def disabled_model():
    """Create a disabled SuryaFormulaEnrichmentModel instance."""
    return SuryaFormulaEnrichmentModel(enabled=False)


@pytest.fixture
def formula_item():
    """Create a mock TextItem with FORMULA label."""
    return MockTextItem(label=MockDocItemLabel.FORMULA, text="")


@pytest.fixture
def text_item():
    """Create a mock TextItem with TEXT label."""
    return MockTextItem(label=MockDocItemLabel.TEXT, text="")


@pytest.fixture
def formula_element(formula_item):
    """Create a mock enrichment element with image."""
    element = Mock()
    element.item = formula_item
    element.image = Image.new("RGB", (100, 50), color="white")
    return element


@pytest.fixture
def mock_predictor():
    """Create a mock predictor that returns a simple result."""
    mock_text_line = Mock()
    mock_text_line.text = "E = mc^{2}"
    mock_result = Mock()
    mock_result.text_lines = [mock_text_line]

    predictor = Mock()
    predictor.return_value = [mock_result]
    return predictor


@pytest.fixture
def model_with_predictor(enabled_model, mock_predictor):
    """Create an enabled model with injected mock predictor."""
    enabled_model._predictor = mock_predictor
    enabled_model._task_name = MockTaskNames.block_without_boxes
    return enabled_model


# ============================================================================
# Test Classes
# ============================================================================


class TestSuryaFormulaEnrichmentModelProcessable:
    """Test suite for is_processable method filtering."""

    def test_is_processable_formula_item(self, enabled_model, formula_item):
        """Test FORMULA items are processable when enrichment is enabled."""
        assert enabled_model.is_processable(None, formula_item) is True

    def test_is_processable_non_formula_item(self, enabled_model, text_item):
        """Test non-FORMULA items are rejected."""
        assert enabled_model.is_processable(None, text_item) is False

    def test_is_processable_disabled(self, disabled_model, formula_item):
        """Test all items are rejected when enrichment is disabled."""
        assert disabled_model.is_processable(None, formula_item) is False

    def test_is_processable_handles_non_textitem(self, enabled_model):
        """Test graceful handling of non-TextItem elements."""
        element = Mock()
        element.label = MockDocItemLabel.FORMULA
        assert enabled_model.is_processable(None, element) is False


class TestSuryaFormulaEnrichmentModelCall:
    """Test suite for __call__ method that extracts LaTeX."""

    def test_call_extracts_latex(self, model_with_predictor, formula_element):
        """Test __call__ extracts LaTeX and updates item.text."""
        results = list(model_with_predictor(None, [formula_element]))

        assert len(results) == 1
        assert results[0].text.startswith("$")
        assert "E = mc^{2}" in results[0].text

    def test_call_handles_empty_batch(self, enabled_model):
        """Test __call__ returns empty when given empty batch."""
        results = list(enabled_model(None, []))
        assert len(results) == 0

    def test_call_disabled_yields_unchanged(self, disabled_model):
        """Test __call__ yields items unchanged when disabled."""
        mock_item = MockTextItem(label=MockDocItemLabel.FORMULA, text="original")
        mock_element = Mock()
        mock_element.item = mock_item
        mock_element.image = Image.new("RGB", (100, 50), color="white")

        results = list(disabled_model(None, [mock_element]))

        assert len(results) == 1
        assert results[0].text == "original"

    def test_call_converts_math_tags(self, enabled_model):
        """Test __call__ converts <math> tags to $ delimiters."""
        mock_text_line = Mock()
        mock_text_line.text = '<math display="block">x^2 + y^2 = z^2</math>'
        mock_result = Mock()
        mock_result.text_lines = [mock_text_line]

        mock_predictor = Mock()
        mock_predictor.return_value = [mock_result]

        enabled_model._predictor = mock_predictor
        enabled_model._task_name = MockTaskNames.block_without_boxes

        mock_item = MockTextItem(label=MockDocItemLabel.FORMULA, text="")
        mock_element = Mock()
        mock_element.item = mock_item
        mock_element.image = Image.new("RGB", (100, 50), color="white")

        results = list(enabled_model(None, [mock_element]))

        assert len(results) == 1
        assert "$$x^2 + y^2 = z^2$$" in results[0].text


class TestSuryaFormulaEnrichmentModelThreadSafety:
    """Test suite for thread safety features."""

    def test_model_has_lock(self, enabled_model):
        """Test model initializes with a threading lock."""
        assert hasattr(enabled_model, "_lock")
        assert isinstance(enabled_model._lock, type(threading.Lock()))

    def test_lazy_loading_uses_double_check_pattern(self, enabled_model):
        """Test lazy loading has double-check locking pattern."""
        # Verify the lock is used in _load_predictor
        import inspect

        source = inspect.getsource(enabled_model._load_predictor)
        assert "with self._lock" in source
        assert "if self._predictor is None" in source


class TestSuryaFormulaEnrichmentModelGpuOom:
    """Test suite for GPU out-of-memory handling."""

    def test_run_inference_propagates_oom(self, enabled_model):
        """Test _run_inference propagates GPU OOM to caller for batch halving."""
        mock_predictor = Mock()
        mock_predictor.side_effect = RuntimeError("CUDA out of memory")

        enabled_model._predictor = mock_predictor
        enabled_model._task_name = MockTaskNames.block_without_boxes

        image = Image.new("RGB", (100, 50), color="white")

        with pytest.raises(RuntimeError, match="CUDA out of memory"):
            enabled_model._run_inference([image])

    def test_run_inference_reraises_non_oom_errors(self, enabled_model):
        """Test _run_inference re-raises non-OOM RuntimeErrors."""
        mock_predictor = Mock()
        mock_predictor.side_effect = RuntimeError("Some other error")

        enabled_model._predictor = mock_predictor
        enabled_model._task_name = MockTaskNames.block_without_boxes

        image = Image.new("RGB", (100, 50), color="white")

        with pytest.raises(RuntimeError, match="Some other error"):
            enabled_model._run_inference([image])

    def test_process_images_in_batches_halves_on_oom(self, enabled_model):
        """Test _process_images_in_batches halves batch size on OOM and retries."""
        call_count = 0

        def mock_run_inference(images):
            nonlocal call_count
            call_count += 1
            if call_count == 1 and len(images) > 1:
                raise RuntimeError("CUDA out of memory")
            # Return a mock result per image
            return [Mock() for _ in images]

        enabled_model._run_inference = mock_run_inference
        enabled_model.batch_size = 4

        images = [Image.new("RGB", (100, 50), color="white") for _ in range(4)]
        results = enabled_model._process_images_in_batches(images)

        # Should have retried with smaller batch and completed
        assert len(results) == 4
        assert call_count > 1


class TestSuryaFormulaEnrichmentModelLazyLoading:
    """Test suite for lazy model loading behavior."""

    def test_lazy_loading_predictor_not_loaded_on_init(self, enabled_model):
        """Test predictor is NOT loaded during initialization."""
        assert enabled_model._predictor is None
        assert enabled_model._task_name is None

    def test_lazy_loading_not_loaded_when_disabled(self, disabled_model, formula_element):
        """Test predictor is never loaded when model is disabled."""
        list(disabled_model(None, [formula_element]))
        assert disabled_model._predictor is None


class TestSuryaFormulaEnrichmentModelErrorHandling:
    """Test suite for graceful error handling."""

    def test_call_handles_missing_image(self, enabled_model):
        """Test __call__ handles elements with missing image."""
        mock_item = MockTextItem(label=MockDocItemLabel.FORMULA, text="original")
        mock_element = Mock()
        mock_element.item = mock_item
        mock_element.image = None

        results = list(enabled_model(None, [mock_element]))

        assert len(results) == 1
        assert results[0].text == "original"


class TestSuryaFormulaEnrichmentModelConfiguration:
    """Test suite for model configuration options."""

    @pytest.mark.parametrize(
        ("batch_size", "images_scale", "upscale_factor"),
        [
            (4, 2.6, 2.0),
            (16, 3.0, 1.5),
            (1, 1.0, 3.0),
        ],
    )
    def test_custom_configuration(self, batch_size, images_scale, upscale_factor):
        """Test custom configuration values."""
        model = SuryaFormulaEnrichmentModel(
            enabled=True,
            batch_size=batch_size,
            images_scale=images_scale,
            upscale_factor=upscale_factor,
        )
        assert model.batch_size == batch_size
        assert model.images_scale == images_scale
        assert model.upscale_factor == upscale_factor

    def test_default_configuration(self):
        """Test default configuration values."""
        model = SuryaFormulaEnrichmentModel()
        assert model.enabled is True
        assert model.batch_size == 8
        assert model.images_scale == 2.6
        assert model.upscale_factor == 1.0
        assert model.expansion_factor_horizontal == 0.2
        assert model.expansion_factor_vertical == 0.0


class TestSuryaFormulaEnrichmentModelCleanup:
    """Test suite for cleanup method."""

    def test_cleanup_releases_predictor(self, enabled_model):
        """Test cleanup releases predictor resources."""
        enabled_model._predictor = Mock()
        enabled_model._task_name = MockTaskNames.block_without_boxes

        enabled_model.cleanup()

        assert enabled_model._predictor is None
        assert enabled_model._task_name is None

    def test_cleanup_handles_none_predictor(self, enabled_model):
        """Test cleanup handles case when predictor was never loaded."""
        enabled_model.cleanup()
        assert enabled_model._predictor is None

    def test_cleanup_clears_gpu_cache(self, enabled_model):
        """Test cleanup calls _clear_gpu_cache."""
        enabled_model._predictor = Mock()
        enabled_model._task_name = MockTaskNames.block_without_boxes

        # Track that _clear_gpu_cache is called
        original_clear = enabled_model._clear_gpu_cache
        clear_called = []
        enabled_model._clear_gpu_cache = lambda: clear_called.append(True) or original_clear()

        enabled_model.cleanup()

        assert len(clear_called) == 1

    def test_cleanup_is_idempotent(self, enabled_model):
        """Test cleanup can be called multiple times safely."""
        enabled_model._predictor = Mock()
        enabled_model._task_name = MockTaskNames.block_without_boxes

        # Call cleanup multiple times
        enabled_model.cleanup()
        enabled_model.cleanup()
        enabled_model.cleanup()

        assert enabled_model._predictor is None
        assert enabled_model._task_name is None


class TestSuryaFormulaEnrichmentModelExtractLatex:
    """Test suite for _extract_latex method."""

    def test_extract_latex_from_text_lines(self, enabled_model):
        """Test extraction from OCRResult with text_lines."""
        mock_line1 = Mock()
        mock_line1.text = "E = mc^2"
        mock_line2 = Mock()
        mock_line2.text = "+ c"

        mock_result = Mock()
        mock_result.text_lines = [mock_line1, mock_line2]

        latex = enabled_model._extract_latex(mock_result)
        assert latex == "E = mc^2 + c"

    @pytest.mark.parametrize(
        ("input_value", "expected"),
        [
            ("y = mx + b", "y = mx + b"),  # String input
            ({"text": "a^2 + b^2"}, "a^2 + b^2"),  # Dict with text key
            ({"latex": "x^2"}, "x^2"),  # Dict with latex key
        ],
    )
    def test_extract_latex_fallback_formats(self, enabled_model, input_value, expected):
        """Test extraction from various fallback formats."""
        latex = enabled_model._extract_latex(input_value)
        assert latex == expected

    def test_extract_latex_fallback_to_text_attr(self, enabled_model):
        """Test fallback to direct .text attribute."""
        mock_result = Mock(spec=["text"])
        mock_result.text = "x^2"

        latex = enabled_model._extract_latex(mock_result)
        assert latex == "x^2"


class TestSuryaFormulaEnrichmentModelConvertMathTags:
    """Test suite for _convert_math_tags method."""

    @pytest.mark.parametrize(
        ("input_text", "expected"),
        [
            ('<math display="block">x^2</math>', "$$x^2$$"),
            ("<math>y^2</math>", "$y^2$"),
            ('<math display="inline">z^2</math>', "$z^2$"),
            ("Plain text without formulas", "Plain text without formulas"),
        ],
    )
    def test_convert_math_tags(self, enabled_model, input_text, expected):
        """Test conversion of various math tag formats."""
        result = enabled_model._convert_math_tags(input_text)
        assert result == expected

    def test_convert_mixed_math(self, enabled_model):
        """Test conversion of mixed block and inline math."""
        text = 'The formula <math>E=mc^2</math> and <math display="block">F=ma</math>'
        result = enabled_model._convert_math_tags(text)

        assert "$E=mc^2$" in result
        assert "$$F=ma$$" in result


class TestSuryaFormulaEnrichmentModelHelpers:
    """Test suite for helper methods."""

    def test_collect_valid_images(self, enabled_model):
        """Test _collect_valid_images extracts images correctly."""
        element1 = Mock()
        element1.image = Image.new("RGB", (100, 50), color="white")
        element1.item = MockTextItem(label=MockDocItemLabel.FORMULA)

        element2 = Mock()
        element2.image = None
        element2.item = MockTextItem(label=MockDocItemLabel.FORMULA)

        element3 = Mock()
        element3.image = Image.new("RGB", (100, 50), color="white")
        element3.item = MockTextItem(label=MockDocItemLabel.FORMULA)

        images, valid_indices = enabled_model._collect_valid_images([element1, element2, element3])

        assert len(images) == 2
        assert valid_indices == [0, 2]

    def test_clear_gpu_cache_handles_no_torch(self, enabled_model):
        """Test _clear_gpu_cache handles missing torch gracefully."""
        # Should not raise even if torch is not available
        enabled_model._clear_gpu_cache()


class TestSuryaFormulaEnrichmentModelUpscaling:
    """Test suite for image upscaling functionality."""

    def test_upscale_factor_default(self):
        """Test default upscale_factor is 1.0 (no upscaling)."""
        model = SuryaFormulaEnrichmentModel()
        assert model.upscale_factor == 1.0

    def test_upscale_factor_custom(self):
        """Test custom upscale_factor configuration."""
        model = SuryaFormulaEnrichmentModel(upscale_factor=3.0)
        assert model.upscale_factor == 3.0

    def test_upscale_factor_disabled(self):
        """Test upscale_factor can be disabled with 1.0."""
        model = SuryaFormulaEnrichmentModel(upscale_factor=1.0)
        assert model.upscale_factor == 1.0

    def test_upscale_image_doubles_dimensions(self, enabled_model):
        """Test _upscale_image doubles image dimensions with factor 2.0."""
        enabled_model.upscale_factor = 2.0
        original = Image.new("RGB", (100, 50), color="white")

        upscaled = enabled_model._upscale_image(original)

        assert upscaled.width == 200
        assert upscaled.height == 100

    def test_upscale_image_triples_dimensions(self, enabled_model):
        """Test _upscale_image with factor 3.0."""
        enabled_model.upscale_factor = 3.0
        original = Image.new("RGB", (100, 50), color="white")

        upscaled = enabled_model._upscale_image(original)

        assert upscaled.width == 300
        assert upscaled.height == 150

    def test_upscale_image_noop_with_factor_one(self, enabled_model):
        """Test _upscale_image returns original when factor is 1.0."""
        enabled_model.upscale_factor = 1.0
        original = Image.new("RGB", (100, 50), color="white")

        result = enabled_model._upscale_image(original)

        # Should return same object when no upscaling needed
        assert result is original

    def test_upscale_image_noop_with_factor_below_one(self, enabled_model):
        """Test _upscale_image returns original when factor is < 1.0."""
        enabled_model.upscale_factor = 0.5
        original = Image.new("RGB", (100, 50), color="white")

        result = enabled_model._upscale_image(original)

        # Should return same object when factor <= 1.0
        assert result is original

    def test_collect_valid_images_applies_upscaling(self, enabled_model):
        """Test _collect_valid_images applies upscaling to images."""
        enabled_model.upscale_factor = 2.0

        element = Mock()
        element.image = Image.new("RGB", (100, 50), color="white")
        element.item = MockTextItem(label=MockDocItemLabel.FORMULA)

        images, valid_indices = enabled_model._collect_valid_images([element])

        assert len(images) == 1
        assert valid_indices == [0]
        # Image should be upscaled
        assert images[0].width == 200
        assert images[0].height == 100

    def test_collect_valid_images_no_upscaling_when_disabled(self, enabled_model):
        """Test _collect_valid_images doesn't upscale when factor is 1.0."""
        enabled_model.upscale_factor = 1.0

        element = Mock()
        element.image = Image.new("RGB", (100, 50), color="white")
        element.item = MockTextItem(label=MockDocItemLabel.FORMULA)

        images, valid_indices = enabled_model._collect_valid_images([element])

        assert len(images) == 1
        # Image should NOT be upscaled
        assert images[0].width == 100
        assert images[0].height == 50

    @pytest.mark.parametrize(
        ("upscale_factor", "expected_width", "expected_height"),
        [
            (1.0, 100, 50),
            (1.5, 150, 75),
            (2.0, 200, 100),
            (2.5, 250, 125),
            (3.0, 300, 150),
        ],
    )
    def test_upscale_image_various_factors(
        self, enabled_model, upscale_factor, expected_width, expected_height
    ):
        """Test _upscale_image with various upscale factors."""
        enabled_model.upscale_factor = upscale_factor
        original = Image.new("RGB", (100, 50), color="white")

        upscaled = enabled_model._upscale_image(original)

        assert upscaled.width == expected_width
        assert upscaled.height == expected_height


class TestDebugImageSaving:
    """Test suite for debug image export functionality."""

    def test_debug_image_params_default(self):
        """Test default debug image params are disabled."""
        model = SuryaFormulaEnrichmentModel()
        assert model.save_debug_images is False
        assert model.debug_images_dir is None

    def test_debug_image_params_custom(self, tmp_path):
        """Test custom debug image params."""
        model = SuryaFormulaEnrichmentModel(
            save_debug_images=True,
            debug_images_dir=tmp_path,
        )
        assert model.save_debug_images is True
        assert model.debug_images_dir == tmp_path

    def test_save_debug_images_creates_files(self, tmp_path, enabled_model):
        """Test _save_debug_images creates PNG files."""
        enabled_model.save_debug_images = True
        enabled_model.debug_images_dir = tmp_path
        enabled_model.upscale_factor = 1.0  # Disable upscaling for predictable sizes

        # Create mock elements with images
        mock_prov = Mock()
        mock_prov.page_no = 5

        element1 = Mock()
        element1.image = Image.new("RGB", (100, 50), color="white")
        element1.item = MockTextItem(label=MockDocItemLabel.FORMULA)
        element1.item.prov = [mock_prov]
        element1.item.self_ref = "#/texts/100"

        element2 = Mock()
        element2.image = Image.new("RGB", (80, 40), color="gray")
        element2.item = MockTextItem(label=MockDocItemLabel.FORMULA)
        element2.item.prov = [mock_prov]
        element2.item.self_ref = "#/texts/101"

        batch_items = [element1, element2]
        images, valid_indices = enabled_model._collect_valid_images(batch_items)

        # Call _save_debug_images
        enabled_model._save_debug_images(batch_items, images, valid_indices)

        # Verify files were created - naming convention: p<page_no>_formula_<element_id>.png
        saved_images = list(tmp_path.glob("p*_formula_*.png"))
        assert len(saved_images) == 2

        # Check naming convention
        expected_names = {"p5_formula_100.png", "p5_formula_101.png"}
        actual_names = {f.name for f in saved_images}
        assert actual_names == expected_names

    def test_save_debug_images_disabled_no_files(self, tmp_path, enabled_model):
        """Test no files created when save_debug_images is False."""
        enabled_model.save_debug_images = False
        enabled_model.debug_images_dir = tmp_path

        mock_prov = Mock()
        mock_prov.page_no = 1

        element = Mock()
        element.image = Image.new("RGB", (100, 50), color="white")
        element.item = MockTextItem(label=MockDocItemLabel.FORMULA)
        element.item.prov = [mock_prov]

        batch_items = [element]
        images, valid_indices = enabled_model._collect_valid_images(batch_items)

        enabled_model._save_debug_images(batch_items, images, valid_indices)

        saved_images = list(tmp_path.glob("formula_*.png"))
        assert len(saved_images) == 0

    def test_save_debug_images_no_dir_no_files(self, enabled_model):
        """Test no files created when debug_images_dir is None."""
        enabled_model.save_debug_images = True
        enabled_model.debug_images_dir = None

        mock_prov = Mock()
        mock_prov.page_no = 1

        element = Mock()
        element.image = Image.new("RGB", (100, 50), color="white")
        element.item = MockTextItem(label=MockDocItemLabel.FORMULA)
        element.item.prov = [mock_prov]

        batch_items = [element]
        images, valid_indices = enabled_model._collect_valid_images(batch_items)

        # Should not raise when dir is None
        enabled_model._save_debug_images(batch_items, images, valid_indices)

    def test_save_debug_images_handles_missing_prov(self, tmp_path, enabled_model):
        """Test _save_debug_images handles items without prov gracefully."""
        enabled_model.save_debug_images = True
        enabled_model.debug_images_dir = tmp_path
        enabled_model.upscale_factor = 1.0

        element = Mock()
        element.image = Image.new("RGB", (100, 50), color="white")
        element.item = MockTextItem(label=MockDocItemLabel.FORMULA)
        element.item.prov = []  # Empty prov
        element.item.self_ref = None  # No self_ref either

        batch_items = [element]
        images, valid_indices = enabled_model._collect_valid_images(batch_items)

        enabled_model._save_debug_images(batch_items, images, valid_indices)

        # Should create file with page 0 (default) and element_id 'unknown'
        saved_images = list(tmp_path.glob("p*_formula_*.png"))
        assert len(saved_images) == 1
        assert saved_images[0].name == "p0_formula_unknown.png"

    def test_save_debug_images_upscaled(self, tmp_path, enabled_model):
        """Test debug images are saved with upscaling applied."""
        enabled_model.save_debug_images = True
        enabled_model.debug_images_dir = tmp_path
        enabled_model.upscale_factor = 2.0

        mock_prov = Mock()
        mock_prov.page_no = 1

        element = Mock()
        element.image = Image.new("RGB", (100, 50), color="white")
        element.item = MockTextItem(label=MockDocItemLabel.FORMULA)
        element.item.prov = [mock_prov]
        element.item.self_ref = "#/texts/200"

        batch_items = [element]
        # Upscaling happens in _collect_valid_images
        images, valid_indices = enabled_model._collect_valid_images(batch_items)

        enabled_model._save_debug_images(batch_items, images, valid_indices)

        # Verify file was created - naming convention: p<page_no>_formula_<element_id>.png
        saved_images = list(tmp_path.glob("p*_formula_*.png"))
        assert len(saved_images) == 1

        # Verify image dimensions (should be upscaled)
        saved_image = Image.open(saved_images[0])
        assert saved_image.width == 200  # 100 * 2.0
        assert saved_image.height == 100  # 50 * 2.0


class TestDirectionalBboxExpansion:
    """Test suite for directional bounding box expansion."""

    def test_default_expansion_factors(self):
        """Test default expansion factors: horizontal=0.2, vertical=0.0."""
        model = SuryaFormulaEnrichmentModel(enabled=True)
        assert model.expansion_factor_horizontal == 0.2
        assert model.expansion_factor_vertical == 0.0

    def test_custom_horizontal_expansion(self):
        """Test custom horizontal expansion factor."""
        model = SuryaFormulaEnrichmentModel(
            enabled=True,
            expansion_factor_horizontal=0.3,
            expansion_factor_vertical=0.0,
        )
        assert model.expansion_factor_horizontal == 0.3
        assert model.expansion_factor_vertical == 0.0

    def test_custom_vertical_expansion(self):
        """Test custom vertical expansion factor."""
        model = SuryaFormulaEnrichmentModel(
            enabled=True,
            expansion_factor_horizontal=0.0,
            expansion_factor_vertical=0.1,
        )
        assert model.expansion_factor_horizontal == 0.0
        assert model.expansion_factor_vertical == 0.1

    def test_both_expansion_factors(self):
        """Test both expansion factors configured."""
        model = SuryaFormulaEnrichmentModel(
            enabled=True,
            expansion_factor_horizontal=0.2,
            expansion_factor_vertical=0.15,
        )
        assert model.expansion_factor_horizontal == 0.2
        assert model.expansion_factor_vertical == 0.15

    def test_zero_expansion_disables(self):
        """Test zero expansion factors disable expansion."""
        model = SuryaFormulaEnrichmentModel(
            enabled=True,
            expansion_factor_horizontal=0.0,
            expansion_factor_vertical=0.0,
        )
        assert model.expansion_factor_horizontal == 0.0
        assert model.expansion_factor_vertical == 0.0

    @pytest.mark.parametrize(
        ("h_factor", "v_factor"),
        [
            (0.0, 0.0),
            (0.1, 0.0),
            (0.2, 0.0),
            (0.3, 0.0),
            (0.0, 0.1),
            (0.2, 0.1),
            (0.5, 0.5),
        ],
    )
    def test_various_expansion_factors(self, h_factor, v_factor):
        """Test various expansion factor combinations."""
        model = SuryaFormulaEnrichmentModel(
            enabled=True,
            expansion_factor_horizontal=h_factor,
            expansion_factor_vertical=v_factor,
        )
        assert model.expansion_factor_horizontal == h_factor
        assert model.expansion_factor_vertical == v_factor


class TestRemoveDuplicateLines:
    """Test suite for _remove_duplicate_lines method (Surya hallucination fix)."""

    def test_remove_consecutive_duplicates_with_newlines(self, enabled_model):
        """Test removal of consecutive duplicate lines separated by newlines."""
        text = "$$a=b$$\n$$c=d$$\n$$c=d$$\n$$e=f$$"
        result = enabled_model._remove_duplicate_lines(text)
        assert result == "$$a=b$$\n$$c=d$$\n$$e=f$$"

    def test_no_duplicates_unchanged(self, enabled_model):
        """Test text without duplicates is unchanged."""
        text = "$$a=b$$\n$$c=d$$\n$$e=f$$"
        result = enabled_model._remove_duplicate_lines(text)
        assert result == "$$a=b$$\n$$c=d$$\n$$e=f$$"

    def test_duplicate_lines_at_boundary(self, enabled_model):
        """Test removal of duplicates at $$ boundaries without newlines."""
        text = "$$a=b$$$$c=d$$$$c=d$$"
        result = enabled_model._remove_duplicate_lines(text)
        assert result == "$$a=b$$$$c=d$$"

    def test_empty_string(self, enabled_model):
        """Test empty string returns empty."""
        assert enabled_model._remove_duplicate_lines("") == ""

    def test_none_handling(self, enabled_model):
        """Test None returns None."""
        assert enabled_model._remove_duplicate_lines(None) is None

    def test_single_line(self, enabled_model):
        """Test single line is preserved."""
        text = "$$E = mc^2$$"
        result = enabled_model._remove_duplicate_lines(text)
        assert result == "$$E = mc^2$$"

    def test_all_duplicates(self, enabled_model):
        """Test all duplicate lines reduces to one."""
        text = "$$x=1$$\n$$x=1$$\n$$x=1$$"
        result = enabled_model._remove_duplicate_lines(text)
        assert result == "$$x=1$$"

    def test_non_consecutive_duplicates_preserved(self, enabled_model):
        """Test non-consecutive duplicates are preserved."""
        text = "$$a=1$$\n$$b=2$$\n$$a=1$$"
        result = enabled_model._remove_duplicate_lines(text)
        assert result == "$$a=1$$\n$$b=2$$\n$$a=1$$"

    def test_real_world_example(self, enabled_model):
        """Test real-world Surya hallucination example from VCS-VM0042."""
        text = (
            "$$\\Delta CO2_{wp,t} = ...$$\n"
            "$$I(\\Delta CO2_{soilt}) = 1 \\text{ if }...$$\n"
            "$$I(\\Delta CO2_{soilt}) = -1 \\text{ if }... < 0$$\n"
            "$$I(\\Delta CO2_{soilt}) = -1 \\text{ if }... < 0$$"
        )
        result = enabled_model._remove_duplicate_lines(text)
        expected = (
            "$$\\Delta CO2_{wp,t} = ...$$\n"
            "$$I(\\Delta CO2_{soilt}) = 1 \\text{ if }...$$\n"
            "$$I(\\Delta CO2_{soilt}) = -1 \\text{ if }... < 0$$"
        )
        assert result == expected

    def test_whitespace_only_lines_ignored(self, enabled_model):
        """Test whitespace-only lines are not included in output."""
        text = "$$a=b$$\n   \n$$c=d$$"
        result = enabled_model._remove_duplicate_lines(text)
        assert result == "$$a=b$$\n$$c=d$$"

    def test_mixed_boundary_types(self, enabled_model):
        """Test mixed newline and $$ boundary handling.

        When text contains newlines, the result joins with newlines.
        The $$ boundary split still happens, but rejoining uses \n.
        """
        text = "$$a=b$$$$c=d$$\n$$e=f$$$$e=f$$"
        result = enabled_model._remove_duplicate_lines(text)
        # Original has newlines, so result joins with newlines
        assert result == "$$a=b$$\n$$c=d$$\n$$e=f$$"


class TestFormulaNumberNormalization:
    """Test suite for formula number normalization to \\tag{N} format."""

    def test_normalize_already_has_tag(self, enabled_model):
        """Test LaTeX with existing \\tag{N} is unchanged."""
        latex = r"$x = y \tag{5}$"
        result = enabled_model._normalize_formula_number(latex)
        assert result == latex

    def test_normalize_tag_with_space(self, enabled_model):
        """Test LaTeX with \\tag {N} (space) is detected."""
        latex = r"$x = y \tag {5}$"
        result = enabled_model._normalize_formula_number(latex)
        assert result == latex

    def test_normalize_paren_at_end_inline(self, enabled_model):
        """Test (N) at end of inline LaTeX content converts to \\tag{N}."""
        latex = "$x = y (5)$"
        result = enabled_model._normalize_formula_number(latex)
        assert result == r"$x = y \tag{5}$"

    def test_normalize_paren_at_end_display(self, enabled_model):
        """Test (N) at end of display LaTeX content converts to \\tag{N}."""
        latex = "$$x = y (5)$$"
        result = enabled_model._normalize_formula_number(latex)
        assert result == r"$$x = y \tag{5}$$"

    def test_normalize_paren_outside_inline(self, enabled_model):
        """Test (N) after closing $ delimiter."""
        latex = "$x = y$\n(5)"
        result = enabled_model._normalize_formula_number(latex)
        assert r"\tag{5}" in result
        assert result.endswith("$")
        assert "(5)" not in result

    def test_normalize_paren_outside_display(self, enabled_model):
        """Test (N) after closing $$ delimiter."""
        latex = "$$x = y$$\n(5)"
        result = enabled_model._normalize_formula_number(latex)
        assert r"\tag{5}" in result
        assert result.endswith("$$")
        assert "(5)" not in result

    def test_normalize_from_orig_text(self, enabled_model):
        """Test number extracted from orig_text when not in LaTeX."""
        latex = "$x = y$"
        orig_text = "Formula (5): x equals y"
        result = enabled_model._normalize_formula_number(latex, orig_text=orig_text)
        assert result == r"$x = y \tag{5}$"

    def test_normalize_from_adjacent_number(self, enabled_model):
        """Test number from adjacent element appended as \\tag{N}."""
        latex = "$x = y$"
        result = enabled_model._normalize_formula_number(latex, adjacent_number="5")
        assert result == r"$x = y \tag{5}$"

    def test_normalize_no_number_unchanged(self, enabled_model):
        """Test LaTeX without number is unchanged."""
        latex = "$x = y$"
        result = enabled_model._normalize_formula_number(latex)
        assert result == latex

    def test_normalize_priority_existing_tag_wins(self, enabled_model):
        """Test existing \\tag{N} takes priority over other sources."""
        latex = r"$x \tag{1}$"
        result = enabled_model._normalize_formula_number(
            latex, orig_text="(2)", adjacent_number="3"
        )
        assert result == latex  # Keep existing tag

    def test_normalize_priority_paren_over_orig(self, enabled_model):
        """Test (N) in LaTeX takes priority over orig_text."""
        latex = "$x = y (1)$"
        result = enabled_model._normalize_formula_number(latex, orig_text="Formula (2): x = y")
        assert r"\tag{1}" in result
        assert r"\tag{2}" not in result

    def test_normalize_priority_orig_over_adjacent(self, enabled_model):
        """Test orig_text takes priority over adjacent number."""
        latex = "$x = y$"
        result = enabled_model._normalize_formula_number(
            latex, orig_text="Equation (2)", adjacent_number="3"
        )
        assert r"\tag{2}" in result
        assert r"\tag{3}" not in result

    def test_normalize_decimal_number(self, enabled_model):
        """Test decimal formula number like (2.1)."""
        latex = "$x = y (2.1)$"
        result = enabled_model._normalize_formula_number(latex)
        assert result == r"$x = y \tag{2.1}$"

    def test_normalize_number_with_letter_suffix(self, enabled_model):
        """Test formula number with letter suffix like (5a)."""
        latex = "$$x = y (5a)$$"
        result = enabled_model._normalize_formula_number(latex)
        assert result == r"$$x = y \tag{5a}$$"

    def test_normalize_appendix_format_at_end(self, enabled_model):
        """Test appendix formula number like (A1.1) at end of LaTeX."""
        latex = "$x = y (A1.1)$"
        result = enabled_model._normalize_formula_number(latex)
        assert result == r"$x = y \tag{A1.1}$"

    def test_normalize_appendix_format_display(self, enabled_model):
        """Test appendix formula number in display math."""
        latex = "$$x = y (A6.1)$$"
        result = enabled_model._normalize_formula_number(latex)
        assert result == r"$$x = y \tag{A6.1}$$"

    def test_normalize_appendix_outside_delimiter(self, enabled_model):
        """Test appendix number (A2.3) after closing delimiter."""
        latex = "$$x = y$$\n(A2.3)"
        result = enabled_model._normalize_formula_number(latex)
        assert r"\tag{A2.3}" in result
        assert result.endswith("$$")
        assert "(A2.3)" not in result

    def test_normalize_appendix_simple_letter(self, enabled_model):
        """Test simple appendix letter like (A)."""
        latex = "$formula (A)$"
        result = enabled_model._normalize_formula_number(latex)
        assert result == r"$formula \tag{A}$"

    def test_normalize_appendix_from_orig_text(self, enabled_model):
        """Test appendix number extracted from orig_text."""
        latex = "$x = y$"
        orig_text = "Appendix formula (A3.2)"
        result = enabled_model._normalize_formula_number(latex, orig_text=orig_text)
        assert result == r"$x = y \tag{A3.2}$"

    def test_normalize_appendix_from_adjacent(self, enabled_model):
        """Test appendix number from adjacent element."""
        latex = "$x = y$"
        result = enabled_model._normalize_formula_number(latex, adjacent_number="A1.1")
        assert result == r"$x = y \tag{A1.1}$"

    def test_normalize_empty_latex(self, enabled_model):
        """Test empty LaTeX returns empty."""
        assert enabled_model._normalize_formula_number("") == ""

    def test_normalize_none_latex(self, enabled_model):
        """Test None LaTeX returns None."""
        assert enabled_model._normalize_formula_number(None) is None


class TestInsertTag:
    """Test suite for _insert_tag helper method."""

    def test_insert_tag_inline_math(self, enabled_model):
        """Test inserting tag into inline math."""
        latex = "$x = y$"
        result = enabled_model._insert_tag(latex, "5")
        assert result == r"$x = y \tag{5}$"

    def test_insert_tag_display_math(self, enabled_model):
        """Test inserting tag into display math."""
        latex = "$$x = y$$"
        result = enabled_model._insert_tag(latex, "5")
        assert result == r"$$x = y \tag{5}$$"

    def test_insert_tag_no_delimiter(self, enabled_model):
        """Test inserting tag when no delimiter present."""
        latex = "x = y"
        result = enabled_model._insert_tag(latex, "5")
        assert result == r"x = y \tag{5}"

    def test_insert_tag_trailing_whitespace(self, enabled_model):
        """Test tag insertion handles trailing whitespace."""
        latex = "$x = y$  "
        result = enabled_model._insert_tag(latex, "5")
        assert result == r"$x = y \tag{5}$"


class TestCaptureAdjacentNumbersConfig:
    """Test suite for capture_adjacent_numbers configuration."""

    def test_default_capture_adjacent_enabled(self):
        """Test capture_adjacent_numbers defaults to True."""
        model = SuryaFormulaEnrichmentModel()
        assert model.capture_adjacent_numbers is True

    def test_capture_adjacent_can_be_disabled(self):
        """Test capture_adjacent_numbers can be disabled."""
        model = SuryaFormulaEnrichmentModel(capture_adjacent_numbers=False)
        assert model.capture_adjacent_numbers is False


class TestNormalizeFormulaNumbersConfig:
    """Test suite for normalize_formula_numbers configuration."""

    def test_default_normalize_enabled(self):
        """Test normalize_formula_numbers defaults to True."""
        model = SuryaFormulaEnrichmentModel()
        assert model.normalize_formula_numbers is True

    def test_normalize_can_be_disabled(self):
        """Test normalize_formula_numbers can be disabled."""
        model = SuryaFormulaEnrichmentModel(normalize_formula_numbers=False)
        assert model.normalize_formula_numbers is False

    def test_enrichment_skips_normalization_when_disabled(self, enabled_model):
        """Test _enrich_item_with_latex skips normalization when disabled."""
        enabled_model.normalize_formula_numbers = False

        mock_text_line = Mock()
        mock_text_line.text = "E = mc^2 (5)"
        mock_result = Mock()
        mock_result.text_lines = [mock_text_line]

        mock_item = MockTextItem(label=MockDocItemLabel.FORMULA, text="")
        mock_item.orig = "Formula (5)"
        mock_element = Mock()
        mock_element.item = mock_item

        enabled_model._enrich_item_with_latex(mock_element, mock_result)

        # Should have (5) but NOT \tag{5}
        assert "(5)" in mock_element.item.text
        assert r"\tag{5}" not in mock_element.item.text


class TestCleanupAdjacentNumberState:
    """Test suite for cleanup of adjacent number detection state."""

    def test_cleanup_clears_adjacent_numbers(self, enabled_model):
        """Test cleanup clears _adjacent_numbers dict."""
        enabled_model._adjacent_numbers = {"#/texts/123": "5", "#/texts/456": "6"}
        enabled_model.cleanup()
        assert enabled_model._adjacent_numbers == {}

    def test_cleanup_clears_doc_reference(self, enabled_model):
        """Test cleanup clears _doc reference."""
        enabled_model._doc = Mock()
        enabled_model.cleanup()
        assert enabled_model._doc is None


class TestFindAdjacentNumberBbox:
    """Test suite for _find_adjacent_number_bbox method with right-side only detection."""

    def _create_mock_bbox(self, left, right, top, bottom):
        """Helper to create a mock bounding box."""
        bbox = Mock()
        bbox.l = left
        bbox.r = right
        bbox.t = top
        bbox.b = bottom
        bbox.coord_origin = "BOTTOMLEFT"
        return bbox

    def _create_mock_item(self, self_ref, label, page_no, bbox, text="", orig=""):
        """Helper to create a mock document item."""
        item = Mock()
        item.self_ref = self_ref
        item.label = Mock()
        item.label.value = label
        item.text = text
        item.orig = orig

        prov = Mock()
        prov.page_no = page_no
        prov.bbox = bbox
        item.prov = [prov]

        return item

    def test_finds_number_on_right_side(self, enabled_model):
        """Test finding adjacent number to the right of formula."""
        # Formula bbox: left=100, right=300
        formula_bbox = self._create_mock_bbox(100, 300, 500, 450)
        formula_prov = Mock()
        formula_prov.bbox = formula_bbox
        formula_prov.page_no = 1

        formula_item = self._create_mock_item(
            "#/texts/100", "formula", 1, formula_bbox, text="$E=mc^2$"
        )

        # Number element to the right: left=320, right=360 (gap = 20px)
        number_bbox = self._create_mock_bbox(320, 360, 500, 450)
        number_item = self._create_mock_item("#/texts/101", "text", 1, number_bbox, orig="(37)")

        # Set up mock document
        mock_doc = Mock()
        mock_doc.texts = [formula_item, number_item]
        enabled_model._doc = mock_doc

        # Call the method
        result_num, result_bbox = enabled_model._find_adjacent_number_bbox(
            formula_item, formula_prov
        )

        assert result_num == "37"
        assert result_bbox is not None

    def test_rejects_number_on_left_side(self, enabled_model):
        """Test that numbers to the left of formula are rejected (right-side only)."""
        # Formula bbox: left=200, right=500
        formula_bbox = self._create_mock_bbox(200, 500, 500, 450)
        formula_prov = Mock()
        formula_prov.bbox = formula_bbox
        formula_prov.page_no = 1

        formula_item = self._create_mock_item(
            "#/texts/100", "formula", 1, formula_bbox, text="$E=mc^2$"
        )

        # Number element to the left: left=100, right=150 (gap = 50px on left)
        number_bbox = self._create_mock_bbox(100, 150, 500, 450)
        number_item = self._create_mock_item("#/texts/99", "text", 1, number_bbox, orig="(5)")

        # Set up mock document
        mock_doc = Mock()
        mock_doc.texts = [formula_item, number_item]
        enabled_model._doc = mock_doc

        # Call the method - should NOT find the left-side number
        result_num, result_bbox = enabled_model._find_adjacent_number_bbox(
            formula_item, formula_prov
        )

        assert result_num is None
        assert result_bbox is None

    def test_prefers_closer_match(self, enabled_model):
        """Test that closer adjacent number is preferred."""
        formula_bbox = self._create_mock_bbox(200, 400, 500, 450)
        formula_prov = Mock()
        formula_prov.bbox = formula_bbox
        formula_prov.page_no = 1

        formula_item = self._create_mock_item(
            "#/texts/100", "formula", 1, formula_bbox, text="$x=y$"
        )

        # Farther number on right (gap = 50px)
        far_bbox = self._create_mock_bbox(450, 480, 500, 450)
        far_item = self._create_mock_item("#/texts/102", "text", 1, far_bbox, orig="(99)")

        # Closer number on right (gap = 20px)
        close_bbox = self._create_mock_bbox(420, 450, 500, 450)
        close_item = self._create_mock_item("#/texts/101", "text", 1, close_bbox, orig="(42)")

        mock_doc = Mock()
        mock_doc.texts = [formula_item, far_item, close_item]
        enabled_model._doc = mock_doc

        result_num, result_bbox = enabled_model._find_adjacent_number_bbox(
            formula_item, formula_prov
        )

        # Should find the closer one (42)
        assert result_num == "42"

    def test_rejects_element_too_far(self, enabled_model):
        """Test that elements beyond MAX_NUMBER_ELEMENT_GAP_PX are rejected."""
        formula_bbox = self._create_mock_bbox(100, 300, 500, 450)
        formula_prov = Mock()
        formula_prov.bbox = formula_bbox
        formula_prov.page_no = 1

        formula_item = self._create_mock_item("#/texts/100", "formula", 1, formula_bbox, text="$x$")

        # Number element too far away (gap = 450px > MAX_NUMBER_ELEMENT_GAP_PX=400)
        far_bbox = self._create_mock_bbox(750, 780, 500, 450)
        far_item = self._create_mock_item("#/texts/101", "text", 1, far_bbox, orig="(5)")

        mock_doc = Mock()
        mock_doc.texts = [formula_item, far_item]
        enabled_model._doc = mock_doc

        result_num, result_bbox = enabled_model._find_adjacent_number_bbox(
            formula_item, formula_prov
        )

        assert result_num is None
        assert result_bbox is None

    def test_rejects_low_vertical_overlap(self, enabled_model):
        """Test that elements with low vertical overlap are rejected."""
        formula_bbox = self._create_mock_bbox(100, 300, 500, 450)  # height=50
        formula_prov = Mock()
        formula_prov.bbox = formula_bbox
        formula_prov.page_no = 1

        formula_item = self._create_mock_item("#/texts/100", "formula", 1, formula_bbox, text="$x$")

        # Number element with almost no overlap (only 10px overlap vs 50px height = 20%)
        low_overlap_bbox = self._create_mock_bbox(320, 360, 460, 410)
        low_item = self._create_mock_item("#/texts/101", "text", 1, low_overlap_bbox, orig="(5)")

        mock_doc = Mock()
        mock_doc.texts = [formula_item, low_item]
        enabled_model._doc = mock_doc

        result_num, result_bbox = enabled_model._find_adjacent_number_bbox(
            formula_item, formula_prov
        )

        assert result_num is None
        assert result_bbox is None

    def test_rejects_content_not_matching_pattern(self, enabled_model):
        """Test that elements with non-matching content are rejected."""
        formula_bbox = self._create_mock_bbox(100, 300, 500, 450)
        formula_prov = Mock()
        formula_prov.bbox = formula_bbox
        formula_prov.page_no = 1

        formula_item = self._create_mock_item("#/texts/100", "formula", 1, formula_bbox, text="$x$")

        # Adjacent element but content is not a formula number
        non_number_bbox = self._create_mock_bbox(320, 400, 500, 450)
        non_number_item = self._create_mock_item(
            "#/texts/101", "text", 1, non_number_bbox, orig="where x > 0"
        )

        mock_doc = Mock()
        mock_doc.texts = [formula_item, non_number_item]
        enabled_model._doc = mock_doc

        result_num, result_bbox = enabled_model._find_adjacent_number_bbox(
            formula_item, formula_prov
        )

        assert result_num is None
        assert result_bbox is None

    def test_finds_formula_element_with_dollar_signs(self, enabled_model):
        """Test finding number from formula element with $(N)$ format."""
        formula_bbox = self._create_mock_bbox(100, 400, 500, 450)
        formula_prov = Mock()
        formula_prov.bbox = formula_bbox
        formula_prov.page_no = 1

        formula_item = self._create_mock_item(
            "#/texts/100", "formula", 1, formula_bbox, text="$E=mc^2$"
        )

        # Number as formula element with $ delimiters
        number_bbox = self._create_mock_bbox(420, 480, 500, 450)
        number_item = self._create_mock_item(
            "#/texts/101", "formula", 1, number_bbox, text="$(37)$"
        )

        mock_doc = Mock()
        mock_doc.texts = [formula_item, number_item]
        enabled_model._doc = mock_doc

        result_num, result_bbox = enabled_model._find_adjacent_number_bbox(
            formula_item, formula_prov
        )

        assert result_num == "37"

    def test_returns_none_when_doc_is_none(self, enabled_model):
        """Test returns None when _doc is None."""
        enabled_model._doc = None

        formula_bbox = Mock()
        formula_prov = Mock()
        formula_prov.bbox = formula_bbox

        formula_item = Mock()
        formula_item.self_ref = "#/texts/100"

        result_num, result_bbox = enabled_model._find_adjacent_number_bbox(
            formula_item, formula_prov
        )

        assert result_num is None
        assert result_bbox is None

    def test_skips_same_page_check(self, enabled_model):
        """Test that elements on different pages are ignored."""
        formula_bbox = self._create_mock_bbox(100, 300, 500, 450)
        formula_prov = Mock()
        formula_prov.bbox = formula_bbox
        formula_prov.page_no = 1

        formula_item = self._create_mock_item("#/texts/100", "formula", 1, formula_bbox, text="$x$")

        # Number element on different page
        other_page_bbox = self._create_mock_bbox(320, 360, 500, 450)
        other_page_item = self._create_mock_item(
            "#/texts/101",
            "text",
            2,
            other_page_bbox,
            orig="(5)",  # page 2 instead of 1
        )

        mock_doc = Mock()
        mock_doc.texts = [formula_item, other_page_item]
        enabled_model._doc = mock_doc

        result_num, result_bbox = enabled_model._find_adjacent_number_bbox(
            formula_item, formula_prov
        )

        assert result_num is None
        assert result_bbox is None

    def test_appendix_format_numbers(self, enabled_model):
        """Test finding appendix format numbers like (A1.1)."""
        formula_bbox = self._create_mock_bbox(100, 300, 500, 450)
        formula_prov = Mock()
        formula_prov.bbox = formula_bbox
        formula_prov.page_no = 1

        formula_item = self._create_mock_item("#/texts/100", "formula", 1, formula_bbox, text="$x$")

        # Appendix format number
        number_bbox = self._create_mock_bbox(320, 380, 500, 450)
        number_item = self._create_mock_item("#/texts/101", "text", 1, number_bbox, orig="(A6.1)")

        mock_doc = Mock()
        mock_doc.texts = [formula_item, number_item]
        enabled_model._doc = mock_doc

        result_num, result_bbox = enabled_model._find_adjacent_number_bbox(
            formula_item, formula_prov
        )

        assert result_num == "A6.1"


class TestClusterFormulaNumberNormalization:
    """Test suite for cluster_formula_number parameter in normalization."""

    def test_cluster_number_used_as_fallback(self, enabled_model):
        """Test cluster formula number is used when no other source has a number."""
        latex = "$x = y$"
        result = enabled_model._normalize_formula_number(
            latex, orig_text=None, adjacent_number=None, cluster_formula_number="37"
        )
        assert result == r"$x = y \tag{37}$"

    def test_cluster_number_lowest_priority(self, enabled_model):
        """Test cluster number has lowest priority - orig_text wins."""
        latex = "$x = y$"
        result = enabled_model._normalize_formula_number(
            latex, orig_text="Formula (5)", adjacent_number=None, cluster_formula_number="37"
        )
        # orig_text (5) should win over cluster (37)
        assert r"\tag{5}" in result
        assert r"\tag{37}" not in result

    def test_adjacent_number_wins_over_cluster(self, enabled_model):
        """Test adjacent number has priority over cluster number."""
        latex = "$x = y$"
        result = enabled_model._normalize_formula_number(
            latex, orig_text=None, adjacent_number="10", cluster_formula_number="37"
        )
        # adjacent (10) should win over cluster (37)
        assert r"\tag{10}" in result
        assert r"\tag{37}" not in result

    def test_inline_number_wins_over_all(self, enabled_model):
        """Test (N) in LaTeX takes priority over all external sources."""
        latex = "$x = y (1)$"
        result = enabled_model._normalize_formula_number(
            latex, orig_text="Formula (5)", adjacent_number="10", cluster_formula_number="37"
        )
        # Inline (1) should win
        assert r"\tag{1}" in result
        assert r"\tag{5}" not in result
        assert r"\tag{10}" not in result
        assert r"\tag{37}" not in result

    def test_existing_tag_preserved_with_cluster_number(self, enabled_model):
        """Test existing \\tag{N} preserved even with cluster number."""
        latex = r"$x = y \tag{99}$"
        result = enabled_model._normalize_formula_number(
            latex, orig_text=None, adjacent_number=None, cluster_formula_number="37"
        )
        assert result == latex
        assert r"\tag{37}" not in result

    def test_cluster_number_none_no_effect(self, enabled_model):
        """Test None cluster number has no effect."""
        latex = "$x = y$"
        result = enabled_model._normalize_formula_number(
            latex, orig_text=None, adjacent_number=None, cluster_formula_number=None
        )
        assert result == latex
        assert r"\tag" not in result

    def test_cluster_number_with_display_math(self, enabled_model):
        """Test cluster number works with display math $$...$$."""
        latex = "$$x = y$$"
        result = enabled_model._normalize_formula_number(
            latex, orig_text=None, adjacent_number=None, cluster_formula_number="42"
        )
        assert result == r"$$x = y \tag{42}$$"

    def test_cluster_number_appendix_format(self, enabled_model):
        """Test cluster number with appendix format like A6.1."""
        latex = "$formula$"
        result = enabled_model._normalize_formula_number(
            latex, orig_text=None, adjacent_number=None, cluster_formula_number="A6.1"
        )
        assert result == r"$formula \tag{A6.1}$"

    def test_cluster_number_decimal_format(self, enabled_model):
        """Test cluster number with decimal format like 2.1."""
        latex = "$formula$"
        result = enabled_model._normalize_formula_number(
            latex, orig_text=None, adjacent_number=None, cluster_formula_number="2.1"
        )
        assert result == r"$formula \tag{2.1}$"


class TestEnrichItemWithClusterNumber:
    """Test suite for _enrich_item_with_latex with cluster formula number."""

    def test_enrich_uses_cluster_formula_number(self, enabled_model):
        """Test _enrich_item_with_latex uses cluster formula number as fallback."""
        # Create a mock cluster with extracted_formula_number
        mock_cluster = Mock()
        mock_cluster.is_split = True
        mock_cluster.extracted_formula_number = "37"

        # Set up the model's cluster lookup
        enabled_model._cluster_by_ref = {"#/texts/100": mock_cluster}
        enabled_model.normalize_formula_numbers = True
        enabled_model._adjacent_numbers = {}

        # Create mock result with LaTeX (no number)
        mock_text_line = Mock()
        mock_text_line.text = "E = mc^2"
        mock_result = Mock()
        mock_result.text_lines = [mock_text_line]

        # Create mock element
        mock_item = MockTextItem(label=MockDocItemLabel.FORMULA, text="")
        mock_item.orig = None  # No orig_text
        mock_item.self_ref = "#/texts/100"
        mock_element = Mock()
        mock_element.item = mock_item

        # Enrich the item
        enabled_model._enrich_item_with_latex(mock_element, mock_result)

        # Should have \tag{37} from cluster
        assert r"\tag{37}" in mock_element.item.text

    def test_enrich_skips_cluster_for_non_split(self, enabled_model):
        """Test _enrich_item_with_latex doesn't use cluster number for non-split."""
        mock_cluster = Mock()
        mock_cluster.is_split = False  # Not a split cluster
        mock_cluster.extracted_formula_number = "37"

        enabled_model._cluster_by_ref = {"#/texts/100": mock_cluster}
        enabled_model.normalize_formula_numbers = True
        enabled_model._adjacent_numbers = {}

        mock_text_line = Mock()
        mock_text_line.text = "E = mc^2"
        mock_result = Mock()
        mock_result.text_lines = [mock_text_line]

        mock_item = MockTextItem(label=MockDocItemLabel.FORMULA, text="")
        mock_item.orig = None
        mock_item.self_ref = "#/texts/100"
        mock_element = Mock()
        mock_element.item = mock_item

        enabled_model._enrich_item_with_latex(mock_element, mock_result)

        # Should NOT have \tag{37} since cluster is not split
        assert r"\tag{37}" not in mock_element.item.text

    def test_enrich_skips_cluster_when_no_extracted_number(self, enabled_model):
        """Test _enrich_item_with_latex handles cluster without extracted number."""
        mock_cluster = Mock()
        mock_cluster.is_split = True
        mock_cluster.extracted_formula_number = None  # No extracted number

        enabled_model._cluster_by_ref = {"#/texts/100": mock_cluster}
        enabled_model.normalize_formula_numbers = True
        enabled_model._adjacent_numbers = {}

        mock_text_line = Mock()
        mock_text_line.text = "E = mc^2"
        mock_result = Mock()
        mock_result.text_lines = [mock_text_line]

        mock_item = MockTextItem(label=MockDocItemLabel.FORMULA, text="")
        mock_item.orig = None
        mock_item.self_ref = "#/texts/100"
        mock_element = Mock()
        mock_element.item = mock_item

        enabled_model._enrich_item_with_latex(mock_element, mock_result)

        # Should NOT have any \tag since cluster has no number
        assert r"\tag" not in mock_element.item.text

    def test_enrich_adjacent_number_wins_over_cluster(self, enabled_model):
        """Test adjacent number takes priority over cluster formula number."""
        mock_cluster = Mock()
        mock_cluster.is_split = True
        mock_cluster.extracted_formula_number = "37"

        enabled_model._cluster_by_ref = {"#/texts/100": mock_cluster}
        enabled_model.normalize_formula_numbers = True
        enabled_model._adjacent_numbers = {"#/texts/100": "10"}  # Adjacent number

        mock_text_line = Mock()
        mock_text_line.text = "E = mc^2"
        mock_result = Mock()
        mock_result.text_lines = [mock_text_line]

        mock_item = MockTextItem(label=MockDocItemLabel.FORMULA, text="")
        mock_item.orig = None
        mock_item.self_ref = "#/texts/100"
        mock_element = Mock()
        mock_element.item = mock_item

        enabled_model._enrich_item_with_latex(mock_element, mock_result)

        # Adjacent (10) should win over cluster (37)
        assert r"\tag{10}" in mock_element.item.text
        assert r"\tag{37}" not in mock_element.item.text

    def test_enrich_element_not_in_cluster_lookup(self, enabled_model):
        """Test _enrich_item_with_latex handles element not in cluster lookup."""
        enabled_model._cluster_by_ref = {}  # Empty lookup
        enabled_model.normalize_formula_numbers = True
        enabled_model._adjacent_numbers = {}

        mock_text_line = Mock()
        mock_text_line.text = "E = mc^2"
        mock_result = Mock()
        mock_result.text_lines = [mock_text_line]

        mock_item = MockTextItem(label=MockDocItemLabel.FORMULA, text="")
        mock_item.orig = None
        mock_item.self_ref = "#/texts/100"
        mock_element = Mock()
        mock_element.item = mock_item

        # Should not raise error
        enabled_model._enrich_item_with_latex(mock_element, mock_result)

        # Should have no tag
        assert r"\tag" not in mock_element.item.text


class TestSequentialDocumentProcessing:
    """Test suite for sequential document processing state isolation."""

    def _create_mock_conv_res(self, doc_id: int, element_id: str):
        """Create a mock ConversionResult with formula element."""
        # Create mock document with unique id
        mock_doc = Mock()
        mock_doc.texts = []

        # Create mock page
        mock_page = Mock()
        mock_page.page_no = 1
        mock_page.get_image = Mock(return_value=Image.new("RGB", (100, 50), color="white"))

        # Create mock conv_res
        mock_conv_res = Mock()
        mock_conv_res.document = mock_doc
        mock_conv_res.pages = [mock_page]

        # Override id() behavior by using a custom object
        # We'll use a different Mock object each time to get different ids
        return mock_conv_res

    def test_state_reset_between_documents(self, enabled_model):
        """Test that cluster state is reset when processing a new document.

        This is the critical test for the state leakage bug. Without proper
        reset, cluster mappings from document 1 could affect document 2.
        """
        # Setup model with cluster state from "document 1"
        enabled_model._cluster_by_ref = {"#/texts/100": Mock()}
        enabled_model._merged_into = {"#/texts/101": "#/texts/100"}
        enabled_model._adjacent_numbers = {"#/texts/100": "5"}
        enabled_model._current_doc_id = 12345  # ID of "document 1"

        # Create a mock conv_res for "document 2" (different document)
        doc2 = Mock()
        doc2.texts = []

        mock_page = Mock()
        mock_page.page_no = 1
        mock_page.get_image = Mock(return_value=Image.new("RGB", (100, 50), color="white"))

        mock_conv_res = Mock()
        mock_conv_res.document = doc2
        mock_conv_res.pages = [mock_page]

        # Create a formula element
        mock_bbox = Mock()
        mock_bbox.l = 100
        mock_bbox.r = 300
        mock_bbox.t = 500
        mock_bbox.b = 450
        mock_bbox.coord_origin = "BOTTOMLEFT"

        mock_prov = Mock()
        mock_prov.bbox = mock_bbox
        mock_prov.page_no = 1

        element = MockTextItem(label=MockDocItemLabel.FORMULA, text="")
        element.prov = [mock_prov]
        element.self_ref = "#/texts/200"

        # Process element from document 2
        # Since doc2 has a different id than 12345, state should be reset
        enabled_model.prepare_element(mock_conv_res, element)

        # Verify state was reset (cluster state should be cleared)
        assert enabled_model._cluster_by_ref == {}
        assert enabled_model._merged_into == {}
        assert enabled_model._adjacent_numbers == {}
        # Current doc ID should be updated
        assert enabled_model._current_doc_id == id(doc2)

    def test_state_preserved_within_same_document(self, enabled_model):
        """Test that cluster state is preserved when processing same document."""
        # Create a mock document
        doc = Mock()
        doc.texts = []

        mock_page = Mock()
        mock_page.page_no = 1
        mock_page.get_image = Mock(return_value=Image.new("RGB", (100, 50), color="white"))

        mock_conv_res = Mock()
        mock_conv_res.document = doc
        mock_conv_res.pages = [mock_page]

        # Create formula element
        mock_bbox = Mock()
        mock_bbox.l = 100
        mock_bbox.r = 300
        mock_bbox.t = 500
        mock_bbox.b = 450
        mock_bbox.coord_origin = "BOTTOMLEFT"

        mock_prov = Mock()
        mock_prov.bbox = mock_bbox
        mock_prov.page_no = 1

        element1 = MockTextItem(label=MockDocItemLabel.FORMULA, text="")
        element1.prov = [mock_prov]
        element1.self_ref = "#/texts/100"

        # Process first element
        enabled_model.prepare_element(mock_conv_res, element1)
        doc_id_after_first = enabled_model._current_doc_id

        # Set some state that should be preserved
        enabled_model._cluster_by_ref = {"#/texts/100": Mock()}
        enabled_model._adjacent_numbers = {"#/texts/100": "5"}

        # Create second element
        element2 = MockTextItem(label=MockDocItemLabel.FORMULA, text="")
        element2.prov = [mock_prov]
        element2.self_ref = "#/texts/101"

        # Process second element from SAME document
        enabled_model.prepare_element(mock_conv_res, element2)

        # State should be preserved (same document ID)
        assert enabled_model._current_doc_id == doc_id_after_first
        assert "#/texts/100" in enabled_model._cluster_by_ref
        assert enabled_model._adjacent_numbers.get("#/texts/100") == "5"

    def test_cleanup_resets_current_doc_id(self, enabled_model):
        """Test that cleanup() resets _current_doc_id."""
        enabled_model._current_doc_id = 12345
        enabled_model._cluster_by_ref = {"#/texts/100": Mock()}
        enabled_model._adjacent_numbers = {"#/texts/100": "5"}

        enabled_model.cleanup()

        assert enabled_model._current_doc_id is None
        assert enabled_model._cluster_by_ref == {}
        assert enabled_model._adjacent_numbers == {}

    def test_first_document_no_reset(self, enabled_model):
        """Test that first document doesn't trigger reset (no previous doc)."""
        # Ensure no previous doc ID
        enabled_model._current_doc_id = None
        enabled_model._cluster_by_ref = {}

        # Create mock conv_res
        doc = Mock()
        doc.texts = []

        mock_page = Mock()
        mock_page.page_no = 1
        mock_page.get_image = Mock(return_value=Image.new("RGB", (100, 50), color="white"))

        mock_conv_res = Mock()
        mock_conv_res.document = doc
        mock_conv_res.pages = [mock_page]

        # Create formula element
        mock_bbox = Mock()
        mock_bbox.l = 100
        mock_bbox.r = 300
        mock_bbox.t = 500
        mock_bbox.b = 450
        mock_bbox.coord_origin = "BOTTOMLEFT"

        mock_prov = Mock()
        mock_prov.bbox = mock_bbox
        mock_prov.page_no = 1

        element = MockTextItem(label=MockDocItemLabel.FORMULA, text="")
        element.prov = [mock_prov]
        element.self_ref = "#/texts/100"

        # Process first element
        result = enabled_model.prepare_element(mock_conv_res, element)

        # Should succeed without any reset issues
        assert enabled_model._current_doc_id == id(doc)
        assert result is not None
