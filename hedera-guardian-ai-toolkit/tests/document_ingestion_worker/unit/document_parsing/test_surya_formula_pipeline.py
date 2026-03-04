"""
Unit tests for SuryaFormulaPipeline.

Tests the custom PDF pipeline that uses Surya for formula LaTeX extraction.
All dependencies are mocked to allow testing without docling or surya-ocr installed.
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock

# ============================================================================
# Module-level mocking - Must happen BEFORE any imports from document_ingestion_worker.document_parsing
# ============================================================================

# Save original modules BEFORE mocking to restore after importing module under test
# This prevents mock pollution affecting other test files
# NOTE: Only restore modules that could cause cross-test pollution. The docling and surya
# mocks should remain in place for this file's tests.
_MODULES_TO_RESTORE = [
    # All mocked modules must be restored to prevent pollution in other test files
    "surya",
    "surya.texify",
    "docling",
    "docling.models",
    "docling.models.base_model",
    "docling_core",
    "docling_core.types",
    "docling_core.types.doc",
    "docling.datamodel",
    "docling.datamodel.base_models",
    "docling.datamodel.pipeline_options",
    "docling.chunking",
    "docling.pipeline",
    "docling.pipeline.standard_pdf_pipeline",
    "document_ingestion_worker.document_parsing.split_formula_detector",
]
_original_modules = {key: sys.modules.get(key) for key in _MODULES_TO_RESTORE}


# Mock docling types
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


class MockPdfPipelineOptions:
    """Mock PdfPipelineOptions class."""

    def __init__(self, **kwargs):
        self.do_formula_enrichment = kwargs.get("do_formula_enrichment", False)
        self.do_ocr = kwargs.get("do_ocr", True)
        self.do_table_structure = kwargs.get("do_table_structure", True)
        for key, value in kwargs.items():
            setattr(self, key, value)


class MockThreadedPdfPipelineOptions(MockPdfPipelineOptions):
    """Mock ThreadedPdfPipelineOptions class with batch size fields."""

    def __init__(self, **kwargs):
        # Set batch size defaults before parent init (which handles remaining kwargs)
        self.ocr_batch_size = kwargs.pop("ocr_batch_size", 4)
        self.layout_batch_size = kwargs.pop("layout_batch_size", 4)
        self.table_batch_size = kwargs.pop("table_batch_size", 4)
        super().__init__(**kwargs)


class MockStandardPdfPipeline:
    """Mock StandardPdfPipeline class."""

    def __init__(self, pipeline_options):
        self.pipeline_options = pipeline_options
        self.enrichment_pipe = []
        self.keep_backend = False


# Create all mock modules
_mock_surya = MagicMock()
_mock_texify = MagicMock()
_mock_predictor_class = MagicMock()
_mock_surya.texify = _mock_texify
_mock_texify.TexifyPredictor = _mock_predictor_class

_mock_docling = MagicMock()
_mock_docling_models = MagicMock()
_mock_base_model = MagicMock()
_mock_base_model.BaseItemAndImageEnrichmentModel = MockBaseItemAndImageEnrichmentModel
_mock_docling_models.base_model = _mock_base_model

_mock_docling_core = MagicMock()
_mock_docling_core_types = MagicMock()
_mock_docling_core_types_doc = MagicMock()
_mock_docling_core_types_doc.DocItemLabel = MockDocItemLabel
_mock_docling_core_types_doc.DoclingDocument = MagicMock
_mock_docling_core_types_doc.NodeItem = MagicMock
_mock_docling_core_types_doc.TextItem = MockTextItem

_mock_docling_datamodel = MagicMock()
_mock_docling_base_models = MagicMock()
_mock_docling_chunking = MagicMock()

_mock_pipeline_module = MagicMock()
_mock_pipeline_module.PdfPipelineOptions = MockPdfPipelineOptions
_mock_pipeline_module.ThreadedPdfPipelineOptions = MockThreadedPdfPipelineOptions

_mock_docling_pipeline = MagicMock()
_mock_docling_standard_pipeline = MagicMock()
_mock_docling_standard_pipeline.StandardPdfPipeline = MockStandardPdfPipeline

# Mock split_formula_detector module (needed by surya_enrichment_model)
_mock_split_formula_detector = MagicMock()
_mock_split_formula_detector.FormulaCluster = MagicMock()
_mock_split_formula_detector.build_cluster_lookup = MagicMock(return_value=({}, {}))
_mock_split_formula_detector.detect_split_formula_clusters = MagicMock(return_value=[])

# Force package initialization with real dependencies BEFORE mocking.
# This caches document_ingestion_worker.document_parsing in sys.modules so __init__.py won't
# re-execute (against mocked docling) when exec_module triggers
# `from document_ingestion_worker.document_parsing.constants import ...`.
from document_ingestion_worker import document_parsing  # noqa: E402, F401

# Apply mocks to sys.modules BEFORE importing
sys.modules["surya"] = _mock_surya
sys.modules["surya.texify"] = _mock_texify
sys.modules["docling"] = _mock_docling
sys.modules["docling.models"] = _mock_docling_models
sys.modules["docling.models.base_model"] = _mock_base_model
sys.modules["docling_core"] = _mock_docling_core
sys.modules["docling_core.types"] = _mock_docling_core_types
sys.modules["docling_core.types.doc"] = _mock_docling_core_types_doc
sys.modules["docling.datamodel"] = _mock_docling_datamodel
sys.modules["docling.datamodel.base_models"] = _mock_docling_base_models
sys.modules["docling.datamodel.pipeline_options"] = _mock_pipeline_module
sys.modules["docling.chunking"] = _mock_docling_chunking
sys.modules["docling.pipeline"] = _mock_docling_pipeline
sys.modules["docling.pipeline.standard_pdf_pipeline"] = _mock_docling_standard_pipeline
sys.modules["document_ingestion_worker.document_parsing.split_formula_detector"] = (
    _mock_split_formula_detector
)

# Now we can safely import the modules under test using importlib
import importlib.util  # noqa: E402

# Calculate absolute paths from test file location
_TEST_DIR = Path(__file__).parent
_REPO_ROOT = _TEST_DIR.parent.parent.parent.parent
_SRC_DIR = (
    _REPO_ROOT
    / "packages"
    / "document_ingestion_worker"
    / "src"
    / "document_ingestion_worker"
    / "document_parsing"
)

# First load the enrichment model (it's a dependency of the pipeline)
_spec_enrichment = importlib.util.spec_from_file_location(
    "document_ingestion_worker.document_parsing.surya_enrichment_model",
    _SRC_DIR / "surya_enrichment_model.py",
)
_surya_enrichment_module = importlib.util.module_from_spec(_spec_enrichment)
_surya_enrichment_module.__package__ = "document_ingestion_worker.document_parsing"
sys.modules["document_ingestion_worker.document_parsing.surya_enrichment_model"] = (
    _surya_enrichment_module
)
_spec_enrichment.loader.exec_module(_surya_enrichment_module)

# Now load the pipeline module
_spec_pipeline = importlib.util.spec_from_file_location(
    "document_ingestion_worker.document_parsing.surya_formula_pipeline",
    _SRC_DIR / "surya_formula_pipeline.py",
)
_surya_pipeline_module = importlib.util.module_from_spec(_spec_pipeline)
_surya_pipeline_module.__package__ = "document_ingestion_worker.document_parsing"
sys.modules["document_ingestion_worker.document_parsing.surya_formula_pipeline"] = (
    _surya_pipeline_module
)
_spec_pipeline.loader.exec_module(_surya_pipeline_module)

SuryaFormulaPipelineOptions = _surya_pipeline_module.SuryaFormulaPipelineOptions
SuryaFormulaPipeline = _surya_pipeline_module.SuryaFormulaPipeline


def _restore_mock_modules():
    """Restore original modules to prevent mock pollution affecting other test files."""
    for key in _MODULES_TO_RESTORE:
        orig = _original_modules.get(key)
        if orig is None:
            sys.modules.pop(key, None)
        else:
            sys.modules[key] = orig


# CRITICAL: Restore original modules IMMEDIATELY after importing the module under test
# This prevents mock pollution from affecting other test files during pytest collection
_restore_mock_modules()


# ============================================================================
# Test Classes
# ============================================================================


class TestSuryaFormulaPipelineOptions:
    """Test suite for SuryaFormulaPipelineOptions."""

    def test_options_defaults(self):
        """Test default option values."""
        options = SuryaFormulaPipelineOptions()

        assert options.do_formula_enrichment is False
        assert options.do_surya_formula_enrichment is True
        assert options.surya_batch_size == 8
        assert options.surya_images_scale == 2.6
        assert options.surya_upscale_factor == 2.0
        assert options.save_debug_images is False
        assert options.debug_images_dir is None

    def test_options_custom_values(self):
        """Test custom option values."""
        options = SuryaFormulaPipelineOptions(
            do_surya_formula_enrichment=False,
            surya_batch_size=16,
            surya_images_scale=3.0,
            surya_upscale_factor=3.0,
        )

        assert options.do_surya_formula_enrichment is False
        assert options.surya_batch_size == 16
        assert options.surya_images_scale == 3.0
        assert options.surya_upscale_factor == 3.0

    def test_options_upscale_factor_disabled(self):
        """Test upscale_factor can be set to 1.0 to disable upscaling."""
        options = SuryaFormulaPipelineOptions(surya_upscale_factor=1.0)

        assert options.surya_upscale_factor == 1.0

    def test_options_debug_images_enabled(self):
        """Test debug images options can be configured."""
        from pathlib import Path

        test_path = Path("/tmp/debug_images")
        options = SuryaFormulaPipelineOptions(
            save_debug_images=True,
            debug_images_dir=test_path,
        )

        assert options.save_debug_images is True
        assert options.debug_images_dir == test_path

    def test_options_expansion_factors_default(self):
        """Test default expansion factors."""
        options = SuryaFormulaPipelineOptions()

        assert options.surya_expansion_factor_horizontal == 0.2
        assert options.surya_expansion_factor_vertical == 0.0

    def test_options_expansion_factors_custom(self):
        """Test custom expansion factors."""
        options = SuryaFormulaPipelineOptions(
            surya_expansion_factor_horizontal=0.3,
            surya_expansion_factor_vertical=0.15,
        )

        assert options.surya_expansion_factor_horizontal == 0.3
        assert options.surya_expansion_factor_vertical == 0.15

    def test_options_expansion_disabled(self):
        """Test expansion can be disabled with 0.0."""
        options = SuryaFormulaPipelineOptions(
            surya_expansion_factor_horizontal=0.0,
            surya_expansion_factor_vertical=0.0,
        )

        assert options.surya_expansion_factor_horizontal == 0.0
        assert options.surya_expansion_factor_vertical == 0.0

    def test_options_has_batch_size_fields(self):
        """Test that batch size fields are available (inherited from ThreadedPdfPipelineOptions)."""
        options = SuryaFormulaPipelineOptions()

        assert hasattr(options, "ocr_batch_size")
        assert hasattr(options, "layout_batch_size")
        assert hasattr(options, "table_batch_size")

    def test_options_batch_sizes_custom(self):
        """Test that custom batch sizes can be set."""
        options = SuryaFormulaPipelineOptions(
            ocr_batch_size=32,
            layout_batch_size=32,
            table_batch_size=4,
        )

        assert options.ocr_batch_size == 32
        assert options.layout_batch_size == 32
        assert options.table_batch_size == 4


class TestSuryaFormulaPipeline:
    """Test suite for SuryaFormulaPipeline."""

    def test_pipeline_disables_docling_formula_enrichment(self):
        """Test that Docling's formula enrichment is disabled."""
        options = SuryaFormulaPipelineOptions()
        options.do_formula_enrichment = True  # Try to enable it

        pipeline = SuryaFormulaPipeline(options)

        # Should be forced to False
        assert pipeline.pipeline_options.do_formula_enrichment is False

    def test_pipeline_adds_enrichment_model(self):
        """Test that Surya enrichment model is added to pipeline."""
        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=True)

        pipeline = SuryaFormulaPipeline(options)

        # Should have enrichment model in pipe
        assert len(pipeline.enrichment_pipe) > 0

    def test_pipeline_sets_keep_backend(self):
        """Test that keep_backend is set for image cropping."""
        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=True)

        pipeline = SuryaFormulaPipeline(options)

        assert pipeline.keep_backend is True

    def test_pipeline_skips_enrichment_when_disabled(self):
        """Test that enrichment is skipped when disabled."""
        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=False)

        pipeline = SuryaFormulaPipeline(options)

        # Should have no enrichment models
        assert len(pipeline.enrichment_pipe) == 0
        # keep_backend should remain False
        assert pipeline.keep_backend is False

    def test_get_default_options(self):
        """Test get_default_options returns correct type."""
        options = SuryaFormulaPipeline.get_default_options()

        assert isinstance(options, SuryaFormulaPipelineOptions)

    def test_pipeline_stores_surya_model_reference(self):
        """Test that Surya enrichment model reference is stored for cleanup."""
        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=True)

        pipeline = SuryaFormulaPipeline(options)

        # Should store reference to Surya model
        assert hasattr(pipeline, "_surya_enrichment_model")
        assert pipeline._surya_enrichment_model is not None

    def test_pipeline_stores_none_when_disabled(self):
        """Test that _surya_enrichment_model is None when disabled."""
        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=False)

        pipeline = SuryaFormulaPipeline(options)

        assert hasattr(pipeline, "_surya_enrichment_model")
        assert pipeline._surya_enrichment_model is None


class TestSuryaFormulaPipelineCleanup:
    """Test suite for SuryaFormulaPipeline cleanup method."""

    def test_cleanup_calls_enrichment_model_cleanup(self):
        """Test cleanup() calls cleanup on enrichment models."""
        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=True)
        pipeline = SuryaFormulaPipeline(options)

        # Replace enrichment model with a mock to track cleanup calls
        mock_model = MagicMock()
        mock_model.cleanup = MagicMock()
        pipeline.enrichment_pipe = [mock_model]

        pipeline.cleanup()

        mock_model.cleanup.assert_called_once()

    def test_cleanup_clears_enrichment_pipe(self):
        """Test cleanup() clears the enrichment_pipe list."""
        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=True)
        pipeline = SuryaFormulaPipeline(options)

        assert len(pipeline.enrichment_pipe) > 0

        pipeline.cleanup()

        assert len(pipeline.enrichment_pipe) == 0

    def test_cleanup_clears_surya_model_reference(self):
        """Test cleanup() clears _surya_enrichment_model reference."""
        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=True)
        pipeline = SuryaFormulaPipeline(options)

        assert pipeline._surya_enrichment_model is not None

        pipeline.cleanup()

        assert pipeline._surya_enrichment_model is None

    def test_cleanup_handles_model_without_cleanup(self):
        """Test cleanup() handles models that don't have cleanup method."""
        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=True)
        pipeline = SuryaFormulaPipeline(options)

        # Add a model without cleanup method
        mock_model = MagicMock(spec=[])  # Empty spec = no cleanup method
        pipeline.enrichment_pipe = [mock_model]

        # Should not raise
        pipeline.cleanup()

        assert len(pipeline.enrichment_pipe) == 0

    def test_cleanup_handles_cleanup_exception(self):
        """Test cleanup() handles exceptions from model cleanup gracefully."""
        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=True)
        pipeline = SuryaFormulaPipeline(options)

        # Add a model that raises on cleanup
        mock_model = MagicMock()
        mock_model.cleanup.side_effect = RuntimeError("Cleanup failed")
        pipeline.enrichment_pipe = [mock_model]

        # Should not raise
        pipeline.cleanup()

        # Should still clear the pipe
        assert len(pipeline.enrichment_pipe) == 0

    def test_cleanup_on_empty_pipeline(self):
        """Test cleanup() works on pipeline with no enrichment models."""
        options = SuryaFormulaPipelineOptions(do_surya_formula_enrichment=False)
        pipeline = SuryaFormulaPipeline(options)

        # Should not raise
        pipeline.cleanup()

        assert len(pipeline.enrichment_pipe) == 0
