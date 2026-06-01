"""
Custom PDF pipeline with Surya formula enrichment.

This module provides a custom Docling pipeline that uses Surya's RecognitionPredictor
for formula recognition instead of Docling's built-in formula enrichment model.

The pipeline extends StandardPdfPipeline and replaces the enrichment_pipe
with SuryaFormulaEnrichmentModel.

Features:
- Surya RecognitionPredictor for LaTeX extraction
- Split formula detection and merged bbox cropping
- Configurable batch size, scaling, and expansion factors

Requirements:
    - surya-ocr >= 0.17 (optional dependency, install with: pip install surya-ocr)
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING, Any

from docling.datamodel.pipeline_options import ThreadedPdfPipelineOptions
from docling.pipeline.standard_pdf_pipeline import StandardPdfPipeline
from docling_core.types.doc import DocItemLabel

from .surya_enrichment_model import SuryaFormulaEnrichmentModel

if TYPE_CHECKING:
    from docling.datamodel.document import ConversionResult

logger = logging.getLogger(__name__)


class SuryaFormulaPipelineOptions(ThreadedPdfPipelineOptions):
    """
    Pipeline options for Surya formula enrichment.

    Extends ThreadedPdfPipelineOptions with Surya-specific configuration options.
    The built-in do_formula_enrichment is disabled to avoid duplicate processing.

    Attributes:
        do_surya_formula_enrichment: Enable Surya-based formula recognition.
                                    Default: True.
        surya_batch_size: Number of formulas to process per batch. Higher values
                         use more memory but may be faster on GPU. Default: 8.
        surya_images_scale: Scale factor for cropping formula images. Higher values
                           produce larger crops for better recognition. Default: 2.6.
        surya_upscale_factor: Upscale factor for formula images before Surya inference.
                             Higher values improve subscript/superscript recognition
                             at the cost of more memory. Default: 2.0.
        surya_expansion_factor_horizontal: Horizontal expansion factor for formula
                                          bounding boxes. Expands by this proportion
                                          on each side (e.g., 0.2 = 20% left + 20% right).
                                          Helps capture subscripts/superscripts at edges.
                                          Default: 0.2.
        surya_expansion_factor_vertical: Vertical expansion factor for formula bounding
                                        boxes. Expands by this proportion on top and bottom.
                                        Default: 0.0 (disabled).
        save_debug_images: Whether to save formula images for debugging. When True,
                          saves PNG images of formulas to debug_images_dir. Default: False.
        debug_images_dir: Directory to save debug formula images. Only used when
                         save_debug_images is True. Default: None.
        detect_split_formulas: Whether to detect and merge split multi-line formulas.
                              When enabled, formulas that were split during layout
                              detection are identified and processed as a single unit
                              using merged bounding boxes. Default: True.
        split_vertical_gap_threshold: Maximum vertical gap (pixels) between formula
                                     bboxes to consider as potential split. Negative
                                     values indicate overlap. Default: 10.0.
        split_horizontal_overlap_ratio: Minimum horizontal overlap ratio (0.0-1.0)
                                       required for vertical splits. Default: 0.3.

    Example:
        >>> options = SuryaFormulaPipelineOptions()
        >>> options.do_surya_formula_enrichment = True
        >>> options.surya_batch_size = 16
        >>> options.surya_images_scale = 3.0
        >>> options.surya_upscale_factor = 2.0
        >>> # Disable split detection for simple documents
        >>> options.detect_split_formulas = False
    """

    # Surya-specific options
    do_surya_formula_enrichment: bool = True
    surya_batch_size: int = 8  # Must be > 0
    surya_images_scale: float = 2.6  # Must be > 0
    surya_upscale_factor: float = 2.0  # Must be > 0
    surya_expansion_factor_horizontal: float = 0.2  # Must be >= 0.0
    surya_expansion_factor_vertical: float = 0.0  # Must be >= 0.0
    save_debug_images: bool = False
    debug_images_dir: Path | None = None
    # Split formula detection options
    detect_split_formulas: bool = True
    split_vertical_gap_threshold: float = 10.0
    split_horizontal_overlap_ratio: float = 0.3  # Must be in [0.0, 1.0]

    def __init__(self, **data: Any) -> None:
        """
        Initialize pipeline options with Surya defaults.

        Automatically disables Docling's built-in formula enrichment
        to avoid duplicate processing.

        Args:
            **data: Keyword arguments passed to parent ThreadedPdfPipelineOptions.
        """
        # Disable built-in formula enrichment by default when using Surya
        if "do_formula_enrichment" not in data:
            data["do_formula_enrichment"] = False

        super().__init__(**data)


class SuryaFormulaPipeline(StandardPdfPipeline):
    """
    Custom PDF pipeline using Surya for formula enrichment.

    This pipeline extends StandardPdfPipeline and configures:
    1. Disables Docling's built-in formula enrichment
    2. Adds SuryaFormulaEnrichmentModel to enrichment_pipe
    3. Sets keep_backend=True to retain images for enrichment

    Example:
        >>> from docling.document_converter import DocumentConverter, PdfFormatOption
        >>> from docling.datamodel.base_models import InputFormat
        >>>
        >>> options = SuryaFormulaPipelineOptions()
        >>> options.do_surya_formula_enrichment = True
        >>>
        >>> converter = DocumentConverter(
        ...     format_options={
        ...         InputFormat.PDF: PdfFormatOption(
        ...             pipeline_options=options,
        ...             pipeline_cls=SuryaFormulaPipeline,
        ...         )
        ...     }
        ... )
        >>> result = converter.convert("document.pdf")
    """

    def __init__(self, pipeline_options: SuryaFormulaPipelineOptions) -> None:
        """
        Initialize the Surya formula pipeline.

        Args:
            pipeline_options: Pipeline configuration options. Must be a
                            SuryaFormulaPipelineOptions instance.

        Note:
            Sets keep_backend=True to ensure formula images are available
            for the enrichment model to process.
        """
        # Ensure do_formula_enrichment is disabled to avoid duplicate processing
        pipeline_options.do_formula_enrichment = False

        # Call parent constructor
        super().__init__(pipeline_options)

        # Set keep_backend to retain images for enrichment
        if pipeline_options.do_surya_formula_enrichment:
            self.keep_backend = True
            logger.debug("SuryaFormulaPipeline: keep_backend set to True for image access")

        # Configure enrichment pipeline with Surya model
        self._configure_enrichment_pipe(pipeline_options)

        logger.info(
            f"SuryaFormulaPipeline initialized: "
            f"surya_enabled={pipeline_options.do_surya_formula_enrichment}, "
            f"batch_size={pipeline_options.surya_batch_size}, "
            f"images_scale={pipeline_options.surya_images_scale}, "
            f"upscale_factor={pipeline_options.surya_upscale_factor}, "
            f"expansion_h={pipeline_options.surya_expansion_factor_horizontal}, "
            f"expansion_v={pipeline_options.surya_expansion_factor_vertical}"
        )

    def _configure_enrichment_pipe(self, pipeline_options: SuryaFormulaPipelineOptions) -> None:
        """
        Configure the enrichment pipeline with Surya formula model.

        Replaces the default enrichment_pipe with SuryaFormulaEnrichmentModel
        when Surya formula enrichment is enabled.

        Args:
            pipeline_options: Pipeline configuration options.
        """
        if pipeline_options.do_surya_formula_enrichment:
            surya_model = SuryaFormulaEnrichmentModel(
                enabled=True,
                batch_size=pipeline_options.surya_batch_size,
                images_scale=pipeline_options.surya_images_scale,
                upscale_factor=pipeline_options.surya_upscale_factor,
                expansion_factor_horizontal=pipeline_options.surya_expansion_factor_horizontal,
                expansion_factor_vertical=pipeline_options.surya_expansion_factor_vertical,
                save_debug_images=pipeline_options.save_debug_images,
                debug_images_dir=pipeline_options.debug_images_dir,
                detect_split_formulas=pipeline_options.detect_split_formulas,
                split_vertical_gap_threshold=pipeline_options.split_vertical_gap_threshold,
                split_horizontal_overlap_ratio=pipeline_options.split_horizontal_overlap_ratio,
            )

            # Store reference for cleanup and split detection
            self._surya_enrichment_model = surya_model

            # Replace enrichment_pipe with Surya model
            # Keep any other enrichment models that might be configured
            existing_enrichments = [
                model
                for model in self.enrichment_pipe
                if not self._is_formula_enrichment_model(model)
            ]

            self.enrichment_pipe = existing_enrichments + [surya_model]
            logger.debug(f"Enrichment pipe configured with {len(self.enrichment_pipe)} models")
        else:
            self._surya_enrichment_model = None
            logger.debug("Surya formula enrichment disabled, using default enrichment")

    def _is_formula_enrichment_model(self, model: Any) -> bool:
        """
        Check if a model is a formula enrichment model.

        Used to filter out Docling's built-in formula enrichment when
        replacing with Surya model.

        Args:
            model: Enrichment model to check.

        Returns:
            True if the model is a formula enrichment model.
        """
        model_name = type(model).__name__.lower()
        return "formula" in model_name

    def _run_split_detection(self, conv_res: ConversionResult) -> None:
        """
        Run split formula detection before enrichment processing.

        Extracts all formula items from the document and runs the split
        detection algorithm to identify multi-line formulas that were
        split during layout detection. The results are stored in the
        enrichment model for use during prepare_element and __call__.

        Args:
            conv_res: The ConversionResult containing the document.
        """
        if not self._surya_enrichment_model:
            return

        if not self._surya_enrichment_model.detect_split_formulas:
            return

        # Extract formula items from the document
        doc = conv_res.document
        if not doc:
            return

        # Use iterate_items with traverse_pictures=True to include formulas inside pictures
        if not hasattr(doc, "iterate_items"):
            # Fallback for non-DoclingDocument objects (e.g., mocks)
            if not hasattr(doc, "texts"):
                return
            formula_items = [
                item
                for item in doc.texts
                if hasattr(item, "label")
                and item.label is not None
                and (item.label.value if hasattr(item.label, "value") else str(item.label))
                == DocItemLabel.FORMULA.value
            ]
        else:
            # Filter to formula items using iterate_items with picture traversal
            formula_items = [
                item
                for item, _level in doc.iterate_items(traverse_pictures=True)
                if hasattr(item, "label")
                and item.label is not None
                and (item.label.value if hasattr(item.label, "value") else str(item.label))
                == DocItemLabel.FORMULA.value
            ]

        if not formula_items:
            logger.debug("No formula items found for split detection")
            return

        logger.debug(
            "Running split detection on %d formula items",
            len(formula_items),
        )

        # Run detection and store results in the model
        self._surya_enrichment_model.detect_split_clusters(formula_items)

    def _enrich_document(self, conv_res: ConversionResult) -> ConversionResult:
        """
        Run document enrichment with split formula detection and picture traversal.

        Overrides parent _enrich_document to:
        1. Run split detection before enrichment
        2. Use traverse_pictures=True to include formulas inside pictures
        3. Manually unload page backends after enrichment (since keep_backend=True)

        Docling's default iterate_items() has traverse_pictures=False, which skips
        formula elements that are children of picture elements. This override
        ensures all formulas are processed for enrichment.

        Memory Management:
            Since keep_backend=True is set to retain images for Surya enrichment,
            Docling does NOT automatically unload page backends after processing.
            We manually unload them here after enrichment completes to release
            ~100-300MB per page (2-3GB for a typical 20-page document).

        Args:
            conv_res: The ConversionResult to enrich.

        Returns:
            The enriched ConversionResult.
        """
        from docling.utils.profiling import ProfilingScope, TimeRecorder  # noqa: PLC0415
        from docling.utils.utils import chunkify  # noqa: PLC0415

        # Run split detection before enrichment
        self._run_split_detection(conv_res)

        def _prepare_elements(conv_res: ConversionResult, model: Any) -> Any:
            """Yield prepared elements with traverse_pictures=True."""
            # Use traverse_pictures=True to include formulas inside pictures
            for doc_element, _level in conv_res.document.iterate_items(traverse_pictures=True):
                prepared_element = model.prepare_element(conv_res=conv_res, element=doc_element)
                if prepared_element is not None:
                    yield prepared_element

        with TimeRecorder(conv_res, "doc_enrich", scope=ProfilingScope.DOCUMENT):
            for model in self.enrichment_pipe:
                for element_batch in chunkify(
                    _prepare_elements(conv_res, model),
                    model.elements_batch_size,
                ):
                    for _element in model(doc=conv_res.document, element_batch=element_batch):
                        pass

        # After enrichment, manually unload page backends since keep_backend=True
        # This is critical for memory management - prevents 2-3GB leak per document
        self._unload_page_backends(conv_res)

        return conv_res

    def _unload_page_backends(self, conv_res: ConversionResult) -> None:
        """
        Manually unload page backends and clear image caches.

        Since keep_backend=True is set for Surya enrichment, Docling skips
        automatic page backend unloading. This method releases the memory
        after enrichment is complete.

        Memory released per page:
            - Page backend: ~10-50MB (PDF page data structures)
            - Image cache: ~50-200MB (rendered page images at images_scale)
            - Total: ~100-300MB per page

        Args:
            conv_res: The ConversionResult containing pages to clean.
        """
        pages_cleaned = 0
        try:
            for page in conv_res.pages:
                # Unload the page backend (PDF data structures)
                if hasattr(page, "_backend") and page._backend is not None:
                    try:
                        page._backend.unload()
                    except Exception as e:
                        logger.debug(f"Page backend unload warning: {e}")
                    page._backend = None

                # Clear the image cache (rendered page images)
                if hasattr(page, "_image_cache"):
                    page._image_cache = {}

                pages_cleaned += 1

            if pages_cleaned > 0:
                logger.debug(
                    f"SuryaFormulaPipeline: Unloaded {pages_cleaned} page backends after enrichment"
                )
        except Exception as e:
            logger.warning(f"Failed to unload page backends: {e}")

    def cleanup(self) -> None:
        """
        Release resources held by enrichment models and parent pipeline.

        Iterates through all models in enrichment_pipe and calls their cleanup()
        method if available. This releases GPU memory held by predictors like
        Surya's RecognitionPredictor and FoundationPredictor.

        Also calls parent class cleanup() to release Docling's resources:
        - Input backend (PDF file handles, ~100-200MB)
        - Preprocessing models
        - Layout models
        - Any remaining page resources

        Should be called when the pipeline is no longer needed to prevent
        GPU memory leaks (700MB-2GB per document when Surya is enabled).
        """
        # Clean enrichment models first (Surya predictors)
        for model in self.enrichment_pipe:
            if hasattr(model, "cleanup") and callable(model.cleanup):
                try:
                    model.cleanup()
                except Exception as e:
                    logger.warning(f"Enrichment model cleanup failed: {e}")

        # Clear the enrichment pipe after cleanup
        self.enrichment_pipe = []
        self._surya_enrichment_model = None
        logger.debug("SuryaFormulaPipeline enrichment models cleaned up")

        # Call parent cleanup to release Docling resources
        # This is critical - parent cleanup handles input backend unload,
        # preprocessing model cleanup, and other pipeline resources
        try:
            super().cleanup()
            logger.debug("SuryaFormulaPipeline parent cleanup completed")
        except Exception as e:
            logger.warning(f"Parent pipeline cleanup failed: {e}")

    @classmethod
    def get_default_options(cls) -> SuryaFormulaPipelineOptions:
        """
        Get default pipeline options for this pipeline.

        Returns:
            SuryaFormulaPipelineOptions with default settings.
        """
        return SuryaFormulaPipelineOptions()
