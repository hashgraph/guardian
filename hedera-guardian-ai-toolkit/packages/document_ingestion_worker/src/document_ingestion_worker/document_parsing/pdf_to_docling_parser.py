"""
Simplified PDF parser using Docling with dependency injection pattern.

This module provides a streamlined API where PdfPipelineOptions are configured
externally and injected into the parser. If no options are provided, defaults
to Tesseract OCR configuration.
"""

import gc
import importlib.util
import json
import logging
import uuid
from pathlib import Path
from typing import TYPE_CHECKING, Any, Literal

if TYPE_CHECKING:
    from docling.datamodel.document import ConversionResult

from docling.backend.docling_parse_v2_backend import (
    DoclingParseV2DocumentBackend as DoclingParseBackend,
)

# TODO(docling>=2.74.0): When bumping docling pin, this class is replaced by the
# PdfBackend.DOCLING_PARSE enum. Do NOT fall back to DoclingParseDocumentBackend
# (different, older backend). See docling 2.74.0 changelog.
from docling.datamodel.base_models import InputFormat
from docling.datamodel.document import DoclingDocument
from docling.datamodel.pipeline_options import (
    LayoutOptions,
    PdfPipelineOptions,
    TableFormerMode,
    TesseractCliOcrOptions,
)
from docling.document_converter import DocumentConverter, PdfFormatOption

from .base import CleanupMixin
from .orphan_list_detector import fix_orphaned_list_items
from .table_processing import (
    detect_and_merge_split_tables,
    recover_type2_split_tables,
)

# Check if docling-hierarchical-pdf is available for TOC-based hierarchy correction
HIERARCHICAL_PDF_AVAILABLE = importlib.util.find_spec("hierarchical") is not None

# Import custom fallback postprocessor if available
if HIERARCHICAL_PDF_AVAILABLE:
    from .hierarchy_postprocessor import (
        FallbackResultPostprocessor,  # noqa: E402
    )

logger = logging.getLogger(__name__)


class PdfParser(CleanupMixin):
    """
    PDF parser using Docling with dependency injection.

    Configure PdfPipelineOptions externally and inject them, or use default
    Tesseract OCR configuration.

    Note:
        The DocumentConverter is created lazily on first call to convert_pdf(),
        not during __init__(). This allows configuration options like debug_images_dir
        to be set based on the output directory before the converter pipeline is
        initialized. Do not access self.converter before calling convert_pdf().

    Example with custom options:
        >>> from docling.datamodel.pipeline_options import (
        ...     PdfPipelineOptions,
        ...     TesseractCliOcrOptions,
        ... )
        >>> pipeline_options = PdfPipelineOptions()
        >>> pipeline_options.do_ocr = True
        >>> pipeline_options.ocr_options = TesseractCliOcrOptions(
        ...     force_full_page_ocr=True, lang=["eng"]
        ... )
        >>> parser = PdfParser(pipeline_options=pipeline_options)

    Example with defaults:
        >>> parser = PdfParser()  # Uses Tesseract with English
    """

    def __init__(
        self,
        pipeline_options: PdfPipelineOptions | None = None,
        apply_hierarchy_postprocessing: bool = True,
        enable_orphan_fix: bool = False,
        merge_split_tables: bool = False,
        split_table_bottom_threshold: float = 120.0,
        split_table_top_threshold: float = 700.0,
        save_intermediate_results: bool = False,
        backend: Literal["dlparse_v1", "dlparse_v2"] = "dlparse_v1",
        pdf_images_scale: float = 1.0,
        layout_model: str | None = None,
        use_surya_formula_pipeline: bool = False,
        surya_batch_size: int = 8,
        surya_upscale_factor: float = 1.0,
        surya_expansion_factor_horizontal: float = 0.2,
        surya_expansion_factor_vertical: float = 0.0,
    ) -> None:
        """
        Initialize the PDF parser.

        Args:
            pipeline_options: Pre-configured PdfPipelineOptions. If None, uses
                            default Tesseract OCR configuration with English language,
                            table structure extraction, and formula enrichment.
            apply_hierarchy_postprocessing: If True and docling-hierarchical-pdf is
                            installed, applies hierarchy correction based on PDF TOC.
                            Defaults to True.
            enable_orphan_fix: If True, detects and fixes list items that were
                            misclassified as section_headers due to page boundaries.
                            Defaults to False.
            merge_split_tables: If True, detects and merges tables split across
                            page boundaries. Handles Type 1 splits where both parts
                            are recognized as TABLE objects. Defaults to False.
            split_table_bottom_threshold: Max bbox.b value for a table to be considered
                            "near page bottom". Defaults to 120.0.
            split_table_top_threshold: Min bbox.t value for a table to be considered
                            "near page top". Defaults to 700.0.
            save_intermediate_results: If True, saves parsing results at each processing
                            stage for debugging. Creates files with suffixes:
                            _01_docling_raw.json, _02_after_hierarchy.json, _03_final.json
                            Defaults to False.
            backend: PDF parsing backend. 'dlparse_v1' (default) supports OCR.
                    'dlparse_v2' uses faster C++ parser (~10x speedup) but does not
                    support OCR. Defaults to 'dlparse_v1'.
            pdf_images_scale: Scale factor for Docling page rendering. Higher values
                         render pages at higher resolution, improving formula recognition
                         quality at the cost of memory. Default 1.0 renders at PDF native
                         resolution. Set to 2.0 for double resolution. Applied to both
                         default and Surya pipeline options.
            layout_model: Layout analysis model name. Only used when pipeline_options
                         is None. Supported: 'heron', 'heron-101', 'egret-m', 'egret-l',
                         'egret-x'. Default: 'heron' (77.6% mAP, 42.9M params).
            use_surya_formula_pipeline: If True, uses Surya's RecognitionPredictor for
                         formula enrichment instead of Docling's built-in model.
                         Requires surya-ocr package to be installed. Defaults to False.
            surya_batch_size: Batch size for Surya formula processing. Only used when
                         use_surya_formula_pipeline=True. Defaults to 8.
            surya_upscale_factor: Upscale factor for formula images before Surya
                         inference. Higher values improve subscript/superscript
                         recognition. Only used when use_surya_formula_pipeline=True.
                         Defaults to 1.0.
            surya_expansion_factor_horizontal: Horizontal expansion factor for formula
                         bounding boxes. Expands by this proportion on each side
                         (e.g., 0.2 = 20% left + 20% right). Helps capture subscripts/
                         superscripts at edges. Only used when use_surya_formula_pipeline=True.
                         Defaults to 0.2.
            surya_expansion_factor_vertical: Vertical expansion factor for formula
                         bounding boxes. Expands by this proportion on top and bottom.
                         Only used when use_surya_formula_pipeline=True.
                         Defaults to 0.0 (disabled).
        """
        # Store pdf_images_scale for use in pipeline options
        self.pdf_images_scale = pdf_images_scale

        if pipeline_options is not None:
            self.pipeline_options = pipeline_options
        else:
            # Default: Tesseract OCR with comprehensive document processing
            self.pipeline_options = self._create_default_pipeline_options(layout_model)

        self.apply_hierarchy_postprocessing = apply_hierarchy_postprocessing
        self.fix_orphaned_list_items_enabled = enable_orphan_fix
        self.merge_split_tables_enabled = merge_split_tables
        self.split_table_bottom_threshold = split_table_bottom_threshold
        self.split_table_top_threshold = split_table_top_threshold
        self.save_intermediate_results = save_intermediate_results
        self.backend = backend
        self._intermediate_output_dir: Path | None = None

        # Surya formula enrichment settings
        self.use_surya_formula_pipeline = use_surya_formula_pipeline
        self.surya_batch_size = surya_batch_size
        self.surya_upscale_factor = surya_upscale_factor
        self.surya_expansion_factor_horizontal = surya_expansion_factor_horizontal
        self.surya_expansion_factor_vertical = surya_expansion_factor_vertical

        self._debug_images_dir: Path | None = None  # Set in convert_pdf when saving intermediate

        # Unique instance ID for tracing parallel processing issues
        self._instance_id = str(uuid.uuid4())[:8]
        logger.debug(f"[PdfParser-{self._instance_id}] Created new parser instance")

        # Log postprocessor settings
        if self.save_intermediate_results:
            logger.info("Intermediate results saving enabled")
        if self.apply_hierarchy_postprocessing:
            if HIERARCHICAL_PDF_AVAILABLE:
                logger.info("Hierarchy postprocessing enabled (docling-hierarchical-pdf)")
            else:
                logger.debug(
                    "Hierarchy postprocessing requested but docling-hierarchical-pdf not installed"
                )

        if self.fix_orphaned_list_items_enabled:
            logger.info("Orphaned list item detection enabled")

        if self.merge_split_tables_enabled:
            logger.info("Split table detection and merging enabled")

        # Lazy converter creation - created in convert_pdf() when output_dir is known
        # This allows debug_images_dir to be set BEFORE pipeline initialization
        self.converter: DocumentConverter | None = None

        # Track cleanup state to prevent reuse after cleanup
        self._is_cleaned = False

    def get_formula_stats(self) -> dict[str, int] | None:
        """Get formula processing statistics from the Surya enrichment model.

        Returns:
            Dictionary with keys total, enriched, skipped, failed_oom
            or None if Surya enrichment is not enabled or stats unavailable.
        """
        if not self.use_surya_formula_pipeline or self.converter is None:
            return None

        pipelines = getattr(self.converter, "_initialized_pipelines", None)
        if pipelines is None:
            return None

        for pipeline in pipelines.values():
            surya_model = getattr(pipeline, "_surya_enrichment_model", None)
            if surya_model is not None and hasattr(surya_model, "get_formula_stats"):
                return surya_model.get_formula_stats()

        return None

    def _do_cleanup(self) -> None:
        """Release resources held by the parser.

        Called by CleanupMixin.cleanup() to free memory. The parser holds ML models
        (layout, table structure, OCR) that can consume 500MB-2GB of memory.
        """
        # Clean custom pipeline's enrichment models BEFORE deleting converter
        # This releases GPU memory held by Surya models
        if self.converter is not None and self.use_surya_formula_pipeline:
            self._cleanup_converter_pipelines()

        if self.converter is not None:
            del self.converter
            self.converter = None

        # Clear pipeline options reference (may hold model configs)
        self.pipeline_options = None  # type: ignore[assignment]

        # Clear GPU cache if torch is available
        # Use synchronize() before empty_cache() to ensure async ops complete
        try:
            import torch  # noqa: PLC0415

            if torch.cuda.is_available():
                torch.cuda.synchronize()  # Wait for async ops to complete
                torch.cuda.empty_cache()
        except ImportError:
            pass

        logger.debug(f"[PdfParser-{self._instance_id}] Resources released")

    def _cleanup_converter_pipelines(self) -> None:
        """Clean enrichment models in converter's pipelines.

        DocumentConverter stores initialized pipelines in _initialized_pipelines dict.
        This method iterates through them and calls cleanup() on pipelines that
        support it (like SuryaFormulaPipeline) to release GPU memory.

        This prevents GPU memory leaks of 700MB-2GB per document when Surya
        formula enrichment is enabled.

        Memory Management:
            After calling cleanup() on each pipeline, we also clear the
            _initialized_pipelines dict to release all references. This ensures
            the pipelines can be garbage collected.
        """
        cleaned_count = 0
        try:
            # DocumentConverter stores pipelines in _initialized_pipelines dict
            # Key is (pipeline_class, options_hash)
            pipelines = getattr(self.converter, "_initialized_pipelines", None)

            # Fallback: if _initialized_pipelines doesn't exist, try alternative attributes
            if pipelines is None:
                logger.debug(
                    f"[PdfParser-{self._instance_id}] "
                    "_initialized_pipelines not found, trying alternative cleanup"
                )
                # Try direct pipeline attribute if present
                for attr_name in ["_pipeline", "pipeline", "_pdf_pipeline"]:
                    pipeline = getattr(self.converter, attr_name, None)
                    if pipeline is not None and hasattr(pipeline, "cleanup"):
                        try:
                            pipeline.cleanup()
                            cleaned_count += 1
                            logger.debug(
                                f"[PdfParser-{self._instance_id}] "
                                f"Cleaned up {attr_name}: {type(pipeline).__name__}"
                            )
                        except Exception as e:
                            logger.warning(
                                f"[PdfParser-{self._instance_id}] {attr_name} cleanup failed: {e}"
                            )
                return

            # Clean up each pipeline in the dict
            for _key, pipeline in list(pipelines.items()):
                if hasattr(pipeline, "cleanup") and callable(pipeline.cleanup):
                    try:
                        pipeline.cleanup()
                        cleaned_count += 1
                        logger.debug(
                            f"[PdfParser-{self._instance_id}] "
                            f"Cleaned up pipeline: {type(pipeline).__name__}"
                        )
                    except Exception as e:
                        logger.warning(
                            f"[PdfParser-{self._instance_id}] "
                            f"Pipeline cleanup failed for {type(pipeline).__name__}: {e}"
                        )

            # Clear the dict to release all references (allows GC to collect pipelines)
            if hasattr(self.converter, "_initialized_pipelines"):
                try:
                    self.converter._initialized_pipelines.clear()
                    logger.debug(
                        f"[PdfParser-{self._instance_id}] Cleared _initialized_pipelines dict"
                    )
                except Exception as e:
                    logger.warning(
                        f"[PdfParser-{self._instance_id}] "
                        f"Failed to clear _initialized_pipelines: {e}"
                    )

        except Exception as e:
            logger.warning(f"[PdfParser-{self._instance_id}] Pipeline cleanup failed: {e}")

        if cleaned_count > 0:
            logger.debug(
                f"[PdfParser-{self._instance_id}] "
                f"Pipeline cleanup complete: {cleaned_count} pipelines cleaned"
            )

    def _create_default_pipeline_options(
        self, layout_model: str | None = None
    ) -> PdfPipelineOptions:
        """
        Create default pipeline options optimized for digital PDFs.

        Args:
            layout_model: Optional layout model name. Supported: 'heron', 'heron-101',
                         'egret-m', 'egret-l', 'egret-x'. Default: 'heron'.

        Configuration prioritizes accuracy for complex tables and formulas:
        - OCR enabled with Tesseract (for scanned documents)
        - TableFormer ACCURATE mode for complex tables with merged cells
        - Cell matching for accurate table content extraction
        - Formula enrichment for LaTeX equation extraction
        - Layout model: heron for balanced performance (default)

        Note: For digital PDFs, the worker defaults OCR to OFF since text
        is already embedded. Tables and formulas are extracted by ML models,
        not OCR. This default is for standalone parser usage.

        Returns:
            Configured PdfPipelineOptions with best accuracy settings
        """
        pipeline_options = PdfPipelineOptions()

        # OCR settings (Tesseract CLI only - other engines removed)
        pipeline_options.do_ocr = True
        ocr_options = TesseractCliOcrOptions(
            force_full_page_ocr=True,
            lang=["eng"],
        )
        pipeline_options.ocr_options = ocr_options

        # Table structure with ACCURATE mode for complex tables
        pipeline_options.do_table_structure = True
        pipeline_options.table_structure_options.mode = TableFormerMode.ACCURATE
        pipeline_options.table_structure_options.do_cell_matching = True

        # Formula enrichment for LaTeX extraction
        pipeline_options.do_formula_enrichment = True

        # Page rendering scale (for higher resolution formula crops)
        pipeline_options.images_scale = self.pdf_images_scale

        # Layout model configuration (heron default for balanced performance)
        effective_model = layout_model or "heron"
        try:
            model_spec = self._get_layout_model_spec(effective_model)
            pipeline_options.layout_options = LayoutOptions(model_spec=model_spec)
            logger.info(f"Using layout model: {effective_model}")
        except (ImportError, KeyError) as e:
            logger.warning(f"Could not configure layout model '{effective_model}': {e}")
            logger.debug("Using Docling's default layout model")

        return pipeline_options

    def _get_layout_model_spec(self, layout_model: str):
        """Get the Docling layout model spec for a model name.

        Args:
            layout_model: Model name ('heron', 'heron-101', 'egret-m', 'egret-l', 'egret-x')

        Returns:
            The appropriate DOCLING_LAYOUT_* constant

        Raises:
            ImportError: If layout_model_specs module is not available
            KeyError: If layout_model is not a valid model name
        """
        from docling.datamodel.layout_model_specs import (  # noqa: PLC0415
            DOCLING_LAYOUT_EGRET_LARGE,
            DOCLING_LAYOUT_EGRET_MEDIUM,
            DOCLING_LAYOUT_EGRET_XLARGE,
            DOCLING_LAYOUT_HERON,
            DOCLING_LAYOUT_HERON_101,
        )

        model_map = {
            "heron": DOCLING_LAYOUT_HERON,
            "heron-101": DOCLING_LAYOUT_HERON_101,
            "egret-x": DOCLING_LAYOUT_EGRET_XLARGE,
            "egret-l": DOCLING_LAYOUT_EGRET_LARGE,
            "egret-m": DOCLING_LAYOUT_EGRET_MEDIUM,
        }

        return model_map[layout_model]

    def _create_converter(self) -> DocumentConverter:
        """
        Create a DocumentConverter with configured pipeline options.

        When use_surya_formula_pipeline is True, creates a converter using
        SuryaFormulaPipeline for formula enrichment instead of Docling's built-in.

        Returns:
            Configured DocumentConverter instance
        """
        # Check if Surya formula pipeline should be used
        if self.use_surya_formula_pipeline:
            return self._create_surya_converter()

        # Create PDF format option with appropriate backend
        # dlparse_v2 uses DoclingParseBackend (C++ parser, ~10x faster, no OCR)
        # dlparse_v1 uses default backend (omit parameter to use Docling's default)
        if self.backend == "dlparse_v2":
            logger.info("Using DoclingParse backend (C++ parser, faster, no OCR)")
            pdf_format_option = PdfFormatOption(
                pipeline_options=self.pipeline_options,
                backend=DoclingParseBackend,
            )
        else:
            logger.info("Using default Docling backend (dlparse_v1, supports OCR)")
            # For dlparse_v1, don't specify backend to use Docling's default
            pdf_format_option = PdfFormatOption(
                pipeline_options=self.pipeline_options,
            )

        format_options = {InputFormat.PDF: pdf_format_option}
        return DocumentConverter(format_options=format_options)

    def _create_surya_converter(self) -> DocumentConverter:
        """
        Create a DocumentConverter using Surya formula enrichment pipeline.

        Copies relevant settings from self.pipeline_options to SuryaFormulaPipelineOptions
        and creates a converter using SuryaFormulaPipeline.

        Returns:
            DocumentConverter configured with Surya formula enrichment.

        Raises:
            ImportError: If surya-ocr package is not installed.
        """
        try:
            from .surya_formula_pipeline import (  # noqa: PLC0415
                SuryaFormulaPipeline,
                SuryaFormulaPipelineOptions,
            )
        except ImportError as e:
            raise ImportError(
                "surya-ocr is required for Surya formula enrichment. "
                "Install it with: pip install surya-ocr"
            ) from e

        logger.info("Using Surya formula enrichment pipeline")

        # Create Surya pipeline options with copied settings from base options
        # Debug images are enabled when save_intermediate_results=True and _debug_images_dir is set
        save_debug = self.save_intermediate_results and self._debug_images_dir is not None
        surya_options = SuryaFormulaPipelineOptions(
            # Copy base pipeline options
            do_ocr=self.pipeline_options.do_ocr,
            do_table_structure=self.pipeline_options.do_table_structure,
            # Surya handles formula enrichment, disable Docling's built-in
            do_formula_enrichment=False,
            # Surya-specific settings
            do_surya_formula_enrichment=True,
            surya_batch_size=self.surya_batch_size,
            surya_images_scale=self.pdf_images_scale,
            surya_upscale_factor=self.surya_upscale_factor,
            surya_expansion_factor_horizontal=self.surya_expansion_factor_horizontal,
            surya_expansion_factor_vertical=self.surya_expansion_factor_vertical,
            # Debug image saving - now correctly set at pipeline creation time
            save_debug_images=save_debug,
            debug_images_dir=self._debug_images_dir,
        )
        if save_debug:
            logger.info(
                f"[PdfParser-{self._instance_id}] Debug images enabled: {self._debug_images_dir}"
            )

        # Copy images_scale for page rendering (affects formula crop source quality)
        surya_options.images_scale = self.pdf_images_scale

        # Copy OCR options if available
        if hasattr(self.pipeline_options, "ocr_options") and self.pipeline_options.ocr_options:
            surya_options.ocr_options = self.pipeline_options.ocr_options

        # Copy table structure options if available
        if (
            hasattr(self.pipeline_options, "table_structure_options")
            and self.pipeline_options.table_structure_options
        ):
            surya_options.table_structure_options = self.pipeline_options.table_structure_options

        # Copy layout options if available
        if (
            hasattr(self.pipeline_options, "layout_options")
            and self.pipeline_options.layout_options
        ):
            surya_options.layout_options = self.pipeline_options.layout_options

        # Copy accelerator options if available
        if (
            hasattr(self.pipeline_options, "accelerator_options")
            and self.pipeline_options.accelerator_options
        ):
            surya_options.accelerator_options = self.pipeline_options.accelerator_options

        # Copy batch sizes from ThreadedPdfPipelineOptions
        for attr in ("ocr_batch_size", "layout_batch_size", "table_batch_size"):
            if hasattr(self.pipeline_options, attr):
                setattr(surya_options, attr, getattr(self.pipeline_options, attr))

        # Create PDF format option with Surya pipeline
        if self.backend == "dlparse_v2":
            logger.info("Using DoclingParse backend with Surya formula enrichment")
            pdf_format_option = PdfFormatOption(
                pipeline_options=surya_options,
                pipeline_cls=SuryaFormulaPipeline,
                backend=DoclingParseBackend,
            )
        else:
            logger.info("Using default Docling backend with Surya formula enrichment")
            pdf_format_option = PdfFormatOption(
                pipeline_options=surya_options,
                pipeline_cls=SuryaFormulaPipeline,
            )

        format_options = {InputFormat.PDF: pdf_format_option}
        return DocumentConverter(format_options=format_options)

    def _save_intermediate(self, doc: DoclingDocument, stage: str, pdf_stem: str) -> None:
        """
        Save intermediate parsing result for debugging.

        Args:
            doc: DoclingDocument to save
            stage: Stage identifier (e.g., "01_docling_raw")
            pdf_stem: Original PDF filename stem
        """
        if not self.save_intermediate_results or self._intermediate_output_dir is None:
            return

        output_file = self._intermediate_output_dir / f"{pdf_stem}_{stage}.json"
        logger.debug(
            f"[PdfParser-{self._instance_id}] _save_intermediate: "
            f"stage={stage}, pdf_stem={pdf_stem}, "
            f"dir={self._intermediate_output_dir}, file={output_file.name}"
        )
        try:
            doc_dict = doc.export_to_dict()
            with output_file.open("w", encoding="utf-8") as f:
                json.dump(doc_dict, f, ensure_ascii=False, indent=2)
            logger.info(f"[PdfParser-{self._instance_id}] Saved intermediate result: {output_file}")
        except Exception as e:
            logger.warning(
                f"[PdfParser-{self._instance_id}] Failed to save intermediate result {stage}: {e}"
            )

    def _apply_hierarchy_postprocessing(self, convert_result: Any, _pdf_path: Path) -> Any:
        """Apply hierarchy postprocessing in fallback mode.

        Uses FallbackResultPostprocessor to force fallback mode, which:
        - Uses Docling's visual header detection
        - Ignores potentially incomplete PDF bookmark metadata
        - Preserves all legitimate headers
        - Improves hierarchy nesting

        This solves the issue where PDFs with incomplete bookmarks have
        legitimate headers demoted to plain text (e.g., 85 of 102 headers
        lost in VM0050).

        Args:
            convert_result: The ConversionResult from Docling
            _pdf_path: Path to the source PDF (unused in fallback mode)

        Returns:
            Modified ConversionResult with corrected hierarchy
        """
        if not HIERARCHICAL_PDF_AVAILABLE:
            return convert_result

        try:
            # Use fallback postprocessor to force safe mode
            postprocessor = FallbackResultPostprocessor(convert_result)
            postprocessor.process()
            logger.info(
                "Applied hierarchy postprocessing in fallback mode "
                "(using Docling header detection, ignoring PDF bookmarks)"
            )
        except Exception as e:
            logger.warning(f"Hierarchy postprocessing failed: {e}")

        return convert_result

    def _fix_orphaned_list_items(self, convert_result: Any) -> Any:
        """
        Fix orphaned list items that span page boundaries.

        Args:
            convert_result: The ConversionResult from Docling

        Returns:
            Modified ConversionResult with fixed list items
        """
        try:
            doc_dict = convert_result.document.export_to_dict()
            fixed_dict, count = fix_orphaned_list_items(doc_dict)

            if count > 0:
                logger.info(f"Fixed {count} orphaned list item(s)")
                # Reconstruct the document from the fixed dictionary
                convert_result.document = DoclingDocument.model_validate(fixed_dict)
        except Exception as e:
            logger.warning(f"Orphaned list item fix failed: {e}")

        return convert_result

    def _merge_split_tables(self, convert_result: Any) -> Any:
        """
        Merge tables split across page boundaries.

        Runs two passes:
        1. Type 1 — both parts recognized as TABLE objects
        2. Type 2 — continuation misclassified as text/section_header

        Args:
            convert_result: The ConversionResult from Docling

        Returns:
            Modified ConversionResult with merged split tables
        """
        try:
            doc_dict = convert_result.document.export_to_dict()

            # Type 1: both parts are TABLE objects
            fixed_dict, type1_count = detect_and_merge_split_tables(
                doc_dict,
                bottom_threshold=self.split_table_bottom_threshold,
                top_threshold=self.split_table_top_threshold,
            )

            # Type 2: continuation misclassified as text elements
            fixed_dict, type2_count = recover_type2_split_tables(
                fixed_dict,
                bottom_threshold=self.split_table_bottom_threshold,
                top_threshold=self.split_table_top_threshold,
            )

            total = type1_count + type2_count
            if total > 0:
                logger.info(
                    f"Split table recovery: {type1_count} Type 1 merges, "
                    f"{type2_count} Type 2 recoveries"
                )
                convert_result.document = DoclingDocument.model_validate(fixed_dict)
        except Exception as e:
            logger.warning(f"Split table merge failed: {e}")

        return convert_result

    def _clear_conversion_result(self, conv_res: "ConversionResult") -> None:
        r"""
        Clear heavy resources from ConversionResult after document extraction.

        ConversionResult holds significant memory in:
        - pages[].\_backend: PDF page data structures (~10-50MB per page)
        - pages[].\_image_cache: Rendered page images (~50-200MB per page)
        - input.\_backend: PDF file backend (~100-200MB)

        This method releases these resources after the document has been
        extracted, preventing memory from being retained until GC runs.

        Memory Impact:
            For a 20-page document at images_scale=2.0:
            - Page backends: ~400MB
            - Image caches: ~2GB
            - Input backend: ~100MB
            - Total: ~2.5GB freed per document

        Args:
            conv_res: The ConversionResult to clear resources from.
        """
        pages_cleared = 0
        try:
            # Clear page backends and image caches
            for page in conv_res.pages:
                if hasattr(page, "_backend") and page._backend is not None:
                    try:
                        page._backend.unload()
                    except Exception as e:
                        logger.debug(f"Page backend unload warning: {e}")
                    page._backend = None

                if hasattr(page, "_image_cache"):
                    page._image_cache = {}

                pages_cleared += 1

            # Clear input backend (PDF file handle and structures)
            if (
                hasattr(conv_res, "input")
                and hasattr(conv_res.input, "_backend")
                and conv_res.input._backend is not None
            ):
                try:
                    conv_res.input._backend.unload()
                except Exception as e:
                    logger.debug(f"Input backend unload warning: {e}")
                conv_res.input._backend = None

            # Clear pages list to release references
            conv_res.pages = []

            # Force garbage collection to reclaim memory immediately
            gc.collect()

            logger.debug(
                f"[PdfParser-{self._instance_id}] ConversionResult resources cleared "
                f"({pages_cleared} pages)"
            )
        except Exception as e:
            logger.warning(f"[PdfParser-{self._instance_id}] ConversionResult cleanup failed: {e}")

    def convert_pdf(
        self, pdf_path: str | Path, output_dir: str | Path | None = None
    ) -> DoclingDocument:
        """
        Convert a PDF file to DoclingDocument format.

        Args:
            pdf_path: Path to the PDF file
            output_dir: Optional directory for intermediate results. If save_intermediate_results
                       is True and output_dir is provided, intermediate files will be saved there.

        Returns:
            DoclingDocument containing the parsed document structure

        Raises:
            FileNotFoundError: If the PDF file doesn't exist
            RuntimeError: If the parser has been cleaned up
        """
        self._check_not_cleaned("convert_pdf")

        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        pdf_stem = pdf_path.stem

        logger.debug(
            f"[PdfParser-{self._instance_id}] convert_pdf called: "
            f"pdf={pdf_path.name}, output_dir={output_dir}"
        )

        # Set up intermediate output directory BEFORE creating converter
        # This allows debug_images_dir to be set correctly when converter is created
        if output_dir is not None:
            self._intermediate_output_dir = Path(output_dir)
            self._intermediate_output_dir.mkdir(parents=True, exist_ok=True)
            logger.debug(
                f"[PdfParser-{self._instance_id}] Set _intermediate_output_dir to "
                f"{self._intermediate_output_dir}"
            )

            # Create images subdirectory for debug formula images
            if self.save_intermediate_results and self.use_surya_formula_pipeline:
                self._debug_images_dir = self._intermediate_output_dir / "images"
                self._debug_images_dir.mkdir(exist_ok=True)
                logger.debug(
                    f"[PdfParser-{self._instance_id}] Created debug images dir: "
                    f"{self._debug_images_dir}"
                )

        # Create converter NOW with correct debug images path
        # (lazy creation ensures _debug_images_dir is set before pipeline initialization)
        if self.converter is None:
            self.converter = self._create_converter()

        # Stage 1: Raw Docling conversion
        convert_result = self.converter.convert(source=str(pdf_path))
        self._save_intermediate(convert_result.document, "01_docling_raw", pdf_stem)

        # Stage 2: Apply hierarchy postprocessing if enabled and available
        if self.apply_hierarchy_postprocessing and HIERARCHICAL_PDF_AVAILABLE:
            convert_result = self._apply_hierarchy_postprocessing(convert_result, pdf_path)
            self._save_intermediate(convert_result.document, "02_after_hierarchy", pdf_stem)

        # Stage 3: Apply orphaned list item fix if enabled
        if self.fix_orphaned_list_items_enabled:
            convert_result = self._fix_orphaned_list_items(convert_result)
            self._save_intermediate(convert_result.document, "03_after_orphan_fix", pdf_stem)

        # Stage 4: Merge split tables if enabled
        if self.merge_split_tables_enabled:
            convert_result = self._merge_split_tables(convert_result)
            self._save_intermediate(convert_result.document, "04_after_split_tables", pdf_stem)

        # Extract document reference before clearing ConversionResult resources
        # The document is a separate object and remains valid after clearing
        document = convert_result.document

        # Clear heavy resources from ConversionResult to free memory immediately
        # This releases page backends, image caches, and input backend (~2-3GB per doc)
        self._clear_conversion_result(convert_result)

        return document

    def convert_and_save(self, pdf_path: str | Path, output_path: str | Path) -> dict[str, Any]:
        """
        Convert a PDF and save the result as JSON.

        Args:
            pdf_path: Path to the PDF file
            output_path: Path where the JSON output should be saved

        Returns:
            Dictionary containing conversion statistics with keys:
                - source: Path to source PDF
                - output: Path to output JSON
                - success: Boolean indicating success

        Raises:
            FileNotFoundError: If the PDF file doesn't exist
        """
        pdf_path = Path(pdf_path)
        output_path = Path(output_path)

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Convert PDF (pass output directory for intermediate results)
        doc = self.convert_pdf(pdf_path, output_dir=output_path.parent)

        # Export to dictionary
        doc_dict = doc.export_to_dict()

        # Save to JSON
        with output_path.open("w", encoding="utf-8") as f:
            json.dump(doc_dict, f, ensure_ascii=False, indent=2)

        return {
            "source": str(pdf_path),
            "output": str(output_path),
            "success": True,
        }

    @staticmethod
    def load_docling_document(json_path: str | Path) -> DoclingDocument:
        """
        Load a DoclingDocument from a saved JSON file.

        Args:
            json_path: Path to the JSON file containing DoclingDocument data

        Returns:
            Deserialized DoclingDocument

        Raises:
            FileNotFoundError: If the JSON file doesn't exist
        """
        json_path = Path(json_path)
        if not json_path.exists():
            raise FileNotFoundError(f"JSON file not found: {json_path}")

        with json_path.open("r", encoding="utf-8") as f:
            json_data = json.load(f)

        return DoclingDocument.model_validate(json_data)


def log_document_structure(doc: DoclingDocument, max_depth: int = 3) -> None:
    """
    Log the document structure tree for debugging.

    Args:
        doc: DoclingDocument to log
        max_depth: Maximum depth to display (default: 3)
    """
    doc_dict = doc.export_to_dict()
    texts = doc_dict.get("texts", [])

    # Find section headers and their levels
    headers = [(i, item) for i, item in enumerate(texts) if item.get("label") == "section_header"]

    if not headers:
        logger.info("Document structure: No section headers found")
        return

    logger.info(f"Document structure ({len(headers)} section headers):")

    for _idx, header in headers:
        level = header.get("level", 1)
        text = header.get("text", "")[:60]
        prov = header.get("prov", [{}])
        page = prov[0].get("page_no", "?") if prov else "?"

        if level <= max_depth:
            indent = "  " + "  " * (level - 1) + ("├── " if level > 1 else "")
            logger.info(f"{indent}{text} (p.{page})")
