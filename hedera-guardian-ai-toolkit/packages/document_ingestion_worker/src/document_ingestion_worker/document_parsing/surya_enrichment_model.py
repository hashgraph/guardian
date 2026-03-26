"""
Custom formula enrichment model using Surya for LaTeX extraction.

This module provides an alternative to Docling's built-in formula enrichment
by using Surya's RecognitionPredictor for LaTeX recognition from formula images.

Features:
- Batch processing with configurable batch size
- Image upscaling for better subscript/superscript recognition
- Directional bbox expansion to capture edge content
- Split formula detection and merged bbox cropping

Requirements:
    - surya-ocr >= 0.17 (install with: poetry install --extras surya)
"""

from __future__ import annotations

import contextlib
import logging
import re
import threading
from collections.abc import Iterable
from pathlib import Path
from typing import TYPE_CHECKING, Any

from docling.models.base_model import BaseItemAndImageEnrichmentModel
from docling_core.types.doc import BoundingBox, DocItemLabel, DoclingDocument, NodeItem, TextItem

from .constants import (
    FORMULA_NUMBER_ONLY_PATTERN,
    FORMULA_PAREN_END_PATTERN,
    FORMULA_PAREN_OUTSIDE_LATEX,
    FORMULA_TAG_PATTERN,
    MAX_NUMBER_ELEMENT_GAP_PX,
    MIN_VERTICAL_OVERLAP_RATIO,
)
from .split_formula_detector import (
    FormulaCluster,
    build_cluster_lookup,
    detect_split_formula_clusters,
)

if TYPE_CHECKING:
    from docling.datamodel.base_models import ItemAndImageEnrichmentElement
    from docling.datamodel.document import ConversionResult
    from PIL import Image

logger = logging.getLogger(__name__)

# Prevent PIL from loading images that would exhaust memory
# 100 megapixels ~= 400MB per image (RGBA)
# Safe for: A4 at 288 DPI (8 MP), formula crops at 4x + 2x upscale (64 MP)
try:
    from PIL import Image as PILImage  # noqa: PLC0415

    PILImage.MAX_IMAGE_PIXELS = 100_000_000
    _DecompressionBombError = PILImage.DecompressionBombError
except (ImportError, AttributeError):
    _DecompressionBombError = Exception  # type: ignore[assignment, misc]

# Constants
LOG_TRUNCATE_LENGTH = 100


class SuryaFormulaEnrichmentModel(BaseItemAndImageEnrichmentModel):
    """
    Custom enrichment model that uses Surya RecognitionPredictor for formula recognition.

    This model processes detected FORMULA elements by:
    1. Cropping the formula region from the PDF page image
    2. Optionally upscaling the cropped image for better subscript recognition
    3. Using Surya RecognitionPredictor with block_without_boxes task to convert to LaTeX
    4. Updating the item.text field with the extracted LaTeX wrapped in $...$

    Attributes:
        enabled: Whether the model is enabled for processing.
        batch_size: Number of formulas to process in a single batch (default: 8).
        images_scale: Scale factor for cropping formula images (default: 2.6).
                     Higher values produce larger crops for better recognition.
        upscale_factor: Upscale factor for formula images before Surya inference
                       (default: 1.0). Higher values improve subscript/superscript
                       recognition at the cost of more memory.

    Thread Safety:
        This class uses a threading lock for lazy predictor initialization.
        However, the parallel pipeline should create per-document instances
        since Docling's enrichment models are not designed for concurrent use.

    Example:
        >>> from document_ingestion_worker.document_parsing.surya_enrichment_model import SuryaFormulaEnrichmentModel
        >>> model = SuryaFormulaEnrichmentModel(enabled=True, batch_size=16, upscale_factor=2.0)
        >>> # Model is used within a pipeline's enrichment_pipe

    Note:
        RecognitionPredictor is lazily loaded on first use to avoid loading ML models
        when the enrichment is disabled.
    """

    def __init__(
        self,
        enabled: bool = True,
        batch_size: int = 8,
        images_scale: float = 2.6,
        upscale_factor: float = 1.0,
        expansion_factor_horizontal: float = 0.2,
        expansion_factor_vertical: float = 0.0,
        save_debug_images: bool = False,
        debug_images_dir: Path | None = None,
        detect_split_formulas: bool = True,
        split_vertical_gap_threshold: float = 10.0,
        split_horizontal_overlap_ratio: float = 0.3,
        capture_adjacent_numbers: bool = True,
        normalize_formula_numbers: bool = True,
    ) -> None:
        """
        Initialize the Surya formula enrichment model.

        Args:
            enabled: Whether to enable formula enrichment. If False, formulas
                    pass through unchanged.
            batch_size: Number of formula images to process per batch. Higher values
                       use more memory but may be faster on GPU. Default: 8.
            images_scale: Scale factor for cropping formula images. Higher values
                         produce larger crops which may improve recognition quality.
                         Default: 2.6 (matches Docling's default).
            upscale_factor: Upscale factor for formula images before Surya inference.
                           Higher values improve subscript/superscript recognition
                           at the cost of more memory. Default: 2.0.
                           Set to 1.0 to disable upscaling.
            expansion_factor_horizontal: Horizontal expansion factor for formula
                                        bounding boxes. Expands by this proportion
                                        on each side (e.g., 0.2 = 20% left + 20% right).
                                        Helps capture subscripts/superscripts at edges.
                                        Default: 0.2.
            expansion_factor_vertical: Vertical expansion factor for formula bounding
                                      boxes. Expands by this proportion on top and bottom.
                                      Default: 0.0 (disabled).
            save_debug_images: Whether to save formula images for debugging.
                              When True, saves PNG images of formulas (after upscaling)
                              to debug_images_dir. Default: False.
            debug_images_dir: Directory to save debug formula images. Only used when
                             save_debug_images is True. Default: None.
            detect_split_formulas: Whether to detect and merge split multi-line
                                  formulas. When enabled, formulas that were split
                                  during layout detection are identified and processed
                                  as a single unit using merged bounding boxes.
                                  Default: True.
            split_vertical_gap_threshold: Maximum vertical gap (pixels) between
                                         formula bboxes to consider as potential split.
                                         Negative values indicate overlap. Default: 10.0.
            split_horizontal_overlap_ratio: Minimum horizontal overlap ratio (0.0-1.0)
                                           required for vertical splits. Default: 0.3.
            capture_adjacent_numbers: Whether to extend bbox to capture adjacent
                                     formula number text elements. When True, looks
                                     for (N) elements to the right of formulas and
                                     includes them in the cropped region. Default: True.
            normalize_formula_numbers: Whether to normalize all formula numbers to
                                      \\tag{N} format. When True, converts (N) patterns
                                      and adjacent numbers to consistent \\tag{N}.
                                      Default: True.
        """
        self.enabled = enabled
        self.batch_size = batch_size
        self.images_scale = images_scale
        self.upscale_factor = upscale_factor
        self.expansion_factor_horizontal = expansion_factor_horizontal
        self.expansion_factor_vertical = expansion_factor_vertical
        self.save_debug_images = save_debug_images
        self.debug_images_dir = debug_images_dir
        self.detect_split_formulas = detect_split_formulas
        self.split_vertical_gap_threshold = split_vertical_gap_threshold
        self.split_horizontal_overlap_ratio = split_horizontal_overlap_ratio
        self.capture_adjacent_numbers = capture_adjacent_numbers
        self.normalize_formula_numbers = normalize_formula_numbers
        self._predictor = None  # Lazy loading - RecognitionPredictor instance
        self._task_name = None  # TaskNames.block_without_boxes
        self._lock = threading.Lock()  # Thread-safe lazy loading
        # Split formula detection state (set during batch processing)
        self._cluster_by_ref: dict[str, FormulaCluster] = {}
        self._merged_into: dict[str, str] = {}
        # Adjacent number detection state
        self._adjacent_numbers: dict[str, str] = {}  # self_ref -> formula number
        # Document reference for adjacent number detection
        self._doc: DoclingDocument | None = None
        # Track current document ID for state reset detection
        self._current_doc_id: int | None = None
        # Formula processing counters (reset per document via _reset_document_state)
        self.formulas_total: int = 0
        self.formulas_enriched: int = 0
        self.formulas_skipped: int = 0
        self.formulas_failed_oom: int = 0

    def _reset_document_state(self) -> None:
        """
        Reset all document-specific state for processing a new document.

        This method must be called when switching to a new document to prevent
        state leakage between documents. State that is reset includes:
        - Split formula cluster lookups
        - Merged element mappings
        - Adjacent number detections
        - Formula processing counters

        Note:
            The predictor is NOT reset here as it can be reused across documents.
            Call cleanup() to release predictor resources.
        """
        self._cluster_by_ref = {}
        self._merged_into = {}
        self._adjacent_numbers = {}
        self.formulas_total = 0
        self.formulas_enriched = 0
        self.formulas_skipped = 0
        self.formulas_failed_oom = 0
        logger.debug("Document state reset for new document processing")

    def _load_predictor(self) -> None:
        """
        Lazily load the Surya RecognitionPredictor with thread-safe initialization.

        Uses double-checked locking pattern to ensure thread safety while
        minimizing lock contention after initialization.

        In surya-ocr 0.17.0, LaTeX formula recognition uses RecognitionPredictor
        with the TaskNames.block_without_boxes task, not a separate TexifyPredictor.

        Raises:
            ImportError: If surya-ocr is not installed.
        """
        if self._predictor is None:
            with self._lock:
                # Double-check after acquiring lock
                if self._predictor is None:
                    try:
                        from surya.common.surya.schema import TaskNames  # noqa: PLC0415
                        from surya.foundation import FoundationPredictor  # noqa: PLC0415
                        from surya.recognition import RecognitionPredictor  # noqa: PLC0415

                        logger.info("Loading Surya RecognitionPredictor for formula enrichment...")
                        foundation_predictor = FoundationPredictor()
                        self._predictor = RecognitionPredictor(foundation_predictor)
                        self._task_name = TaskNames.block_without_boxes
                        logger.info("Surya RecognitionPredictor loaded successfully")
                    except ImportError as e:
                        raise ImportError(
                            "surya-ocr is required for formula enrichment. "
                            "Install it with: poetry install --extras surya"
                        ) from e

    def is_processable(
        self,
        doc: DoclingDocument,  # noqa: ARG002
        element: NodeItem,
    ) -> bool:
        """
        Check if an element should be processed by this enrichment model.

        Only TextItem elements with FORMULA label are processed when enabled.

        Args:
            doc: The DoclingDocument being processed (unused, required by interface).
            element: The document element to check.

        Returns:
            True if the element is a formula that should be processed.
        """
        return (
            self.enabled and isinstance(element, TextItem) and element.label == DocItemLabel.FORMULA
        )

    def detect_split_clusters(self, formula_items: list[NodeItem]) -> None:
        """
        Detect split formula clusters from formula items.

        This method should be called before processing formulas to identify
        multi-line formulas that were split during layout detection. The
        detection results are stored internally and used during prepare_element
        to provide merged bboxes for clustered formulas.

        Args:
            formula_items: List of formula TextItem elements to analyze
        """
        if not self.detect_split_formulas:
            logger.debug("Split formula detection disabled")
            self._cluster_by_ref = {}
            self._merged_into = {}
            return

        if not formula_items:
            logger.debug("No formula items provided for split detection")
            self._cluster_by_ref = {}
            self._merged_into = {}
            return

        logger.info(
            "Running split formula detection on %d formula items (v_gap=%.1f, h_overlap=%.2f)",
            len(formula_items),
            self.split_vertical_gap_threshold,
            self.split_horizontal_overlap_ratio,
        )

        clusters = detect_split_formula_clusters(
            formula_items,
            vertical_gap_threshold=self.split_vertical_gap_threshold,
            horizontal_overlap_ratio=self.split_horizontal_overlap_ratio,
        )

        self._cluster_by_ref, self._merged_into = build_cluster_lookup(clusters)

        split_count = sum(1 for c in clusters if c.is_split)
        logger.info(
            "Split formula detection complete: %d clusters, %d splits found",
            len(clusters),
            split_count,
        )

    def _expand_bbox(self, bbox: BoundingBox) -> BoundingBox:
        """Apply expansion factors to a bounding box.

        Args:
            bbox: Original bounding box

        Returns:
            Expanded bounding box with horizontal and vertical expansion applied
        """
        width = bbox.r - bbox.l
        height = bbox.t - bbox.b
        return BoundingBox(
            l=bbox.l - width * self.expansion_factor_horizontal,
            r=bbox.r + width * self.expansion_factor_horizontal,
            t=bbox.t + height * self.expansion_factor_vertical,
            b=bbox.b - height * self.expansion_factor_vertical,
            coord_origin=bbox.coord_origin,
        )

    def _find_adjacent_number_bbox(
        self,
        element: NodeItem,
        element_prov: Any,
    ) -> tuple[str | None, BoundingBox | None]:
        """
        Find formula number element to the right of formula and compute extended bbox.

        Searches both text and formula elements to the RIGHT of the formula for
        number-only patterns. Formula numbers may be parsed as separate formula
        elements (e.g., "$(37)$") rather than text elements.

        Note: Only right-side detection is performed because formula numbers in
        VCS methodologies (e.g., VM0042) appear at the right page margin.

        Detection criteria:
        1. Same page as formula
        2. To the right of formula bbox (gap < MAX_NUMBER_ELEMENT_GAP_PX)
        3. Vertical bbox overlap > MIN_VERTICAL_OVERLAP_RATIO
        4. Text OR formula element matching FORMULA_NUMBER_ONLY_PATTERN

        Args:
            element: Formula element to find adjacent number for
            element_prov: The element's provenance info containing bbox

        Returns:
            Tuple of (formula_number, extended_bbox) if found,
            (None, None) otherwise. extended_bbox covers both the formula
            and the number element.
        """
        if self._doc is None:
            return None, None

        formula_bbox = element_prov.bbox
        formula_page = element_prov.page_no
        formula_self_ref = getattr(element, "self_ref", None)

        if formula_bbox is None or formula_page is None:
            return None, None

        # Search all text items (includes both text and formula labels)
        texts = getattr(self._doc, "texts", None)
        if not texts:
            return None, None

        # Convert to list to enable counting and iteration
        texts_list = list(texts)
        logger.debug(
            "Adjacent search: formula=%s page=%s, searching %d texts, bbox l=%.1f r=%.1f t=%.1f b=%.1f",
            formula_self_ref,
            formula_page,
            len(texts_list),
            formula_bbox.l,
            formula_bbox.r,
            formula_bbox.t,
            formula_bbox.b,
        )

        best_match: tuple[str, BoundingBox, float] | None = None  # (number, bbox, gap)

        for item in texts_list:
            # Skip self
            item_ref = getattr(item, "self_ref", None)
            if item_ref == formula_self_ref:
                continue

            # Check if this is a text or formula element
            label = getattr(item, "label", None)
            if label is None:
                continue
            label_value = label.value if hasattr(label, "value") else str(label)
            if label_value not in ("text", "formula"):
                continue

            # Get item bbox
            item_prov = getattr(item, "prov", None)
            if not item_prov or not isinstance(item_prov, list | tuple) or len(item_prov) == 0:
                continue
            item_prov_first = item_prov[0]
            item_page = getattr(item_prov_first, "page_no", None)
            item_bbox = getattr(item_prov_first, "bbox", None)

            if item_page != formula_page or item_bbox is None:
                continue

            # Log all elements on the same page for debugging formula 74 issue
            item_orig = getattr(item, "orig", None) or getattr(item, "text", "") or ""
            logger.debug(
                "  Same page %s: label=%s, orig=%r, bbox l=%.1f r=%.1f t=%.1f b=%.1f",
                item_ref,
                label_value,
                item_orig[:40] if item_orig else "",
                item_bbox.l,
                item_bbox.r,
                item_bbox.t,
                item_bbox.b,
            )

            # Check if item is to the right of formula (right-side only detection)
            horizontal_gap = item_bbox.l - formula_bbox.r

            if horizontal_gap < 0:
                # Item is not to the right of formula - skip
                logger.debug(
                    "  %s: rejected - not to the right (gap=%.1f)",
                    item_ref,
                    horizontal_gap,
                )
                continue

            if horizontal_gap > MAX_NUMBER_ELEMENT_GAP_PX:
                logger.debug(
                    "  %s: rejected - too far (gap=%.1f > %d)",
                    item_ref,
                    horizontal_gap,
                    MAX_NUMBER_ELEMENT_GAP_PX,
                )
                continue

            # Check vertical overlap
            formula_height = formula_bbox.t - formula_bbox.b
            item_height = item_bbox.t - item_bbox.b
            if formula_height <= 0 or item_height <= 0:
                continue

            # Calculate overlap (considering coord_origin)
            overlap_top = min(formula_bbox.t, item_bbox.t)
            overlap_bottom = max(formula_bbox.b, item_bbox.b)
            overlap_height = overlap_top - overlap_bottom

            if overlap_height <= 0:
                logger.debug(
                    "  %s: rejected - no vertical overlap (formula t=%.1f b=%.1f, item t=%.1f b=%.1f)",
                    item_ref,
                    formula_bbox.t,
                    formula_bbox.b,
                    item_bbox.t,
                    item_bbox.b,
                )
                continue

            # Use smaller element's height for ratio calculation
            reference_height = min(formula_height, item_height)
            overlap_ratio = overlap_height / reference_height

            if overlap_ratio < MIN_VERTICAL_OVERLAP_RATIO:
                logger.debug(
                    "  %s: rejected - low overlap (%.2f < %.2f)",
                    item_ref,
                    overlap_ratio,
                    MIN_VERTICAL_OVERLAP_RATIO,
                )
                continue

            # Check if content is a formula number
            # For formula elements, check text field; for text elements, check orig or text
            if label_value == "formula":
                content = getattr(item, "text", "") or ""
            else:
                content = getattr(item, "orig", None) or getattr(item, "text", "") or ""

            match = FORMULA_NUMBER_ONLY_PATTERN.match(content)
            if not match:
                logger.debug(
                    "  %s: rejected - content doesn't match pattern: %r",
                    item_ref,
                    content[:50] if content else "",
                )
                continue

            formula_number = match.group(1)

            # Keep the closest match (smallest gap)
            if best_match is None or horizontal_gap < best_match[2]:
                # Create extended bbox covering formula and number element (right-side only)
                extended_bbox = BoundingBox(
                    l=formula_bbox.l,
                    r=item_bbox.r,
                    t=max(formula_bbox.t, item_bbox.t),
                    b=min(formula_bbox.b, item_bbox.b),
                    coord_origin=formula_bbox.coord_origin,
                )
                best_match = (formula_number, extended_bbox, horizontal_gap)
                logger.debug(
                    "  %s: MATCH - found '%s' on right (gap=%.1fpx, overlap=%.2f)",
                    item_ref,
                    formula_number,
                    horizontal_gap,
                    overlap_ratio,
                )

        if best_match:
            logger.info(
                "Found adjacent number '%s' for formula %s (right side, gap=%.1fpx)",
                best_match[0],
                formula_self_ref,
                best_match[2],
            )
            return best_match[0], best_match[1]

        logger.debug("No adjacent number found for formula %s", formula_self_ref)
        return None, None

    def _get_effective_bbox(self, element: NodeItem, element_prov: Any) -> tuple[BoundingBox, bool]:
        """
        Get the effective bounding box for a formula element.

        For split formula clusters, returns the merged bbox covering all
        elements in the cluster. Also checks for adjacent formula number
        elements and extends bbox to include them.

        Args:
            element: The formula element
            element_prov: The element's provenance info

        Returns:
            Tuple of (effective_bbox, is_merged) where is_merged indicates
            if this is a merged bbox from a split cluster or adjacent number
        """
        bbox = element_prov.bbox
        self_ref = getattr(element, "self_ref", None)

        # Check if this element is part of a split cluster
        if self_ref and self_ref in self._cluster_by_ref:
            cluster = self._cluster_by_ref[self_ref]
            # Check if this is a split cluster and this element is the primary
            is_primary = (
                cluster.is_split
                and cluster.merged_bbox
                and cluster.primary_element
                and cluster.primary_element.self_ref == self_ref
            )
            if is_primary:
                # Use merged bbox for primary element
                merged = cluster.merged_bbox
                merged_bbox = BoundingBox(
                    l=merged.left,
                    r=merged.right,
                    t=merged.top,
                    b=merged.bottom,
                    coord_origin=bbox.coord_origin,
                )

                # Also check for adjacent number using merged bbox
                if self.capture_adjacent_numbers:

                    class MergedProv:
                        """Temporary provenance-like object for merged bbox."""

                        def __init__(self, bbox: BoundingBox, page_no: int) -> None:
                            self.bbox = bbox
                            self.page_no = page_no

                    merged_prov = MergedProv(merged_bbox, element_prov.page_no)
                    adjacent_number, extended_bbox = self._find_adjacent_number_bbox(
                        element, merged_prov
                    )
                    if adjacent_number and extended_bbox:
                        self._adjacent_numbers[self_ref] = adjacent_number
                        return self._expand_bbox(extended_bbox), True

                return self._expand_bbox(merged_bbox), True

        # Check for adjacent formula number element
        if self.capture_adjacent_numbers and self_ref:
            adjacent_number, extended_bbox = self._find_adjacent_number_bbox(element, element_prov)
            if adjacent_number and extended_bbox:
                # Store the number for later use in normalization
                self._adjacent_numbers[self_ref] = adjacent_number
                return self._expand_bbox(extended_bbox), True

        # Standard path: apply expansion to original bbox
        return self._expand_bbox(bbox), False

    def _is_secondary_element(self, element: NodeItem) -> bool:
        """
        Check if an element is a secondary (non-primary) in a split cluster.

        Secondary elements should be skipped during enrichment as their
        content is captured by the primary element's merged bbox.

        Args:
            element: The formula element to check

        Returns:
            True if this is a secondary element that should be skipped
        """
        self_ref = getattr(element, "self_ref", None)
        return self_ref is not None and self_ref in self._merged_into

    def prepare_element(  # noqa: PLR0911
        self, conv_res: ConversionResult, element: NodeItem
    ) -> ItemAndImageEnrichmentElement | None:
        """
        Prepare formula element with directional bbox expansion.

        Overrides the default prepare_element to apply separate horizontal and vertical
        expansion factors to the formula bounding box before cropping. This helps
        capture subscripts and superscripts that may extend beyond the detected bbox.

        For split formula clusters:
        - Primary elements get a merged bbox covering all cluster elements
        - Secondary elements return None (skipped, will be marked with merged_into)

        The expansion is applied as follows:
        - Horizontal: bbox width * expansion_factor_horizontal on each side
        - Vertical: bbox height * expansion_factor_vertical on top and bottom

        With default settings (horizontal=0.2, vertical=0.0), a 100px wide formula
        becomes 140px wide (20% added to each side), with no vertical change.

        Args:
            conv_res: The ConversionResult containing page images.
            element: The formula element to prepare.

        Returns:
            ItemAndImageEnrichmentElement with the cropped (expanded) image,
            or None if the element is not processable or is a secondary split element.
        """
        from docling.datamodel.base_models import ItemAndImageEnrichmentElement  # noqa: PLC0415

        if not self.is_processable(doc=conv_res.document, element=element):
            return None

        # Detect document change and reset state to prevent leakage between documents
        doc_id = id(conv_res.document)
        if self._current_doc_id is not None and self._current_doc_id != doc_id:
            self._reset_document_state()
        self._current_doc_id = doc_id

        # Always use current document for adjacent number detection
        self._doc = conv_res.document

        # Check if this is a secondary element in a split cluster
        if self._is_secondary_element(element):
            from docling.datamodel.base_models import ItemAndImageEnrichmentElement  # noqa: PLC0415
            from PIL import Image as PILImage  # noqa: PLC0415

            self_ref = getattr(element, "self_ref", "")
            primary_ref = self._merged_into.get(self_ref, "")
            logger.debug(
                "Including secondary split element %s (merged into %s) for marking",
                self_ref,
                primary_ref,
            )
            # Return element with placeholder image - will be marked in __call__
            # Use 1x1 placeholder since Pydantic requires a valid Image
            placeholder = PILImage.new("RGB", (1, 1), color=(0, 0, 0))
            return ItemAndImageEnrichmentElement(item=element, image=placeholder)

        # Get element provenance and bounding box
        if not element.prov:
            logger.warning(f"Formula element has no provenance, skipping: {element}")
            return None

        element_prov = element.prov[0]
        bbox = element_prov.bbox

        if bbox is None:
            logger.warning(f"Formula element has no bounding box, skipping: {element}")
            return None

        # Get effective bbox (may be merged for split clusters)
        effective_bbox, is_merged = self._get_effective_bbox(element, element_prov)

        if is_merged:
            self_ref = getattr(element, "self_ref", "")
            logger.debug(
                "Using merged bbox for split cluster primary element %s",
                self_ref,
            )

        # Get the page index (pages are 1-indexed in prov, 0-indexed in conv_res.pages)
        page_no = element_prov.page_no
        first_page_no = conv_res.pages[0].page_no if conv_res.pages else 1
        page_ix = page_no - first_page_no

        if page_ix < 0 or page_ix >= len(conv_res.pages):
            logger.warning(
                f"Formula element page {page_no} out of range "
                f"(pages: {first_page_no}-{first_page_no + len(conv_res.pages) - 1}), skipping"
            )
            return None

        # Crop the expanded region from the page image
        try:
            cropped_image = conv_res.pages[page_ix].get_image(
                scale=self.images_scale, cropbox=effective_bbox
            )
        except _DecompressionBombError as e:
            # Log at ERROR level so users know formulas are being skipped due to size
            logger.error(
                f"Formula image exceeds 100MP limit and will be skipped. "
                f"Consider reducing pdf_images_scale or surya_upscale_factor. Error: {e}"
            )
            return None
        except Exception as e:
            logger.warning(f"Failed to crop formula image: {e}")
            return None

        return ItemAndImageEnrichmentElement(item=element, image=cropped_image)

    def _run_inference(self, images: list[Image.Image]) -> list[Any]:
        """
        Run Surya inference on a batch of formula images.

        Uses torch.inference_mode() for 15-20% memory reduction compared to
        torch.no_grad(). GPU OOM errors are NOT caught here — they propagate
        to _process_images_in_batches() where the retry/batch-halving logic lives.

        Args:
            images: List of PIL Images containing formula crops.

        Returns:
            List of OCRResult objects from Surya.

        Raises:
            RuntimeError: On GPU out-of-memory or other torch errors.
        """
        # Create task names and bboxes for each image
        # Each image needs a task name and a bbox covering the entire image
        task_names = [self._task_name] * len(images)
        bboxes = [[[0, 0, img.width, img.height]] for img in images]

        import torch  # noqa: PLC0415

        with torch.inference_mode():
            return self._predictor(images, task_names, bboxes=bboxes)

    def _clear_gpu_cache(self) -> None:
        """Clear GPU memory cache if CUDA is available.

        Uses torch.cuda.synchronize() before empty_cache() to ensure all
        asynchronous GPU operations complete before clearing memory. This
        prevents releasing memory that's still in use by pending operations.
        """
        try:
            import torch  # noqa: PLC0415

            if torch.cuda.is_available():
                torch.cuda.synchronize()  # Wait for async ops to complete
                torch.cuda.empty_cache()
        except ImportError:
            pass

    def _upscale_image(self, image: Image.Image) -> Image.Image:
        """
        Upscale a formula image for better subscript/superscript recognition.

        Uses high-quality LANCZOS resampling to upscale images before Surya inference.
        This improves recognition of small characters like subscripts and superscripts
        which may be only 8-12 pixels tall at lower resolutions.

        Args:
            image: PIL Image to upscale.

        Returns:
            Upscaled PIL Image, or original image if upscale_factor <= 1.0.
        """
        if self.upscale_factor <= 1.0:
            return image

        new_width = int(image.width * self.upscale_factor)
        new_height = int(image.height * self.upscale_factor)

        # Guard against decompression bomb: PIL.Image.MAX_IMAGE_PIXELS protects
        # Image.open() but NOT Image.resize(). Check before upscaling.
        max_pixels = 100_000_000  # Matches PIL.Image.MAX_IMAGE_PIXELS set at module level
        if new_width * new_height > max_pixels:
            logger.warning(
                f"Upscale would exceed {max_pixels} pixel limit "
                f"({new_width}x{new_height}={new_width * new_height}), skipping"
            )
            return image

        # Import Image.Resampling for LANCZOS (Pillow 9+)
        try:
            from PIL import Image as PILImage  # noqa: PLC0415

            resampling = PILImage.Resampling.LANCZOS
        except AttributeError:
            # Fallback for older Pillow versions
            from PIL import Image as PILImage  # noqa: PLC0415

            resampling = PILImage.LANCZOS

        return image.resize((new_width, new_height), resampling)

    def _collect_valid_images(
        self, batch_items: list[ItemAndImageEnrichmentElement]
    ) -> tuple[list[Image.Image], list[int]]:
        """
        Collect valid images from batch elements and apply upscaling.

        Images are upscaled by upscale_factor to improve subscript/superscript
        recognition. With default settings (images_scale=2.6, upscale_factor=2.0),
        the effective resolution is 5.2x the original.

        Args:
            batch_items: List of enrichment elements to process.

        Returns:
            Tuple of (upscaled images list, valid indices list).
        """
        images = []
        valid_indices = []

        for i, enrich_element in enumerate(batch_items):
            # Skip secondary split elements (they have placeholder images)
            if self._is_secondary_element(enrich_element.item):
                continue
            if enrich_element.image is not None:
                # Apply upscaling for better subscript recognition
                upscaled_image = self._upscale_image(enrich_element.image)
                images.append(upscaled_image)
                valid_indices.append(i)
            else:
                logger.warning(f"Formula element has no image, skipping: {enrich_element.item}")

        if images and self.upscale_factor > 1.0:
            logger.debug(f"Upscaled {len(images)} formula images by factor {self.upscale_factor}")

        return images, valid_indices

    def _save_debug_images(
        self,
        batch_items: list[ItemAndImageEnrichmentElement],
        upscaled_images: list[Image.Image],
        valid_indices: list[int],
    ) -> None:
        """
        Save formula images for debugging.

        Saves upscaled formula images to the debug directory with naming convention:
        p<page_no>_formula_<element_id>.png

        Args:
            batch_items: List of enrichment elements being processed.
            upscaled_images: List of upscaled images (what Surya receives).
            valid_indices: Indices in batch_items that correspond to upscaled_images.
        """
        if not self.save_debug_images or self.debug_images_dir is None:
            return

        for img_idx, batch_idx in enumerate(valid_indices):
            enrich_element = batch_items[batch_idx]
            upscaled_image = upscaled_images[img_idx]

            # Extract page number from provenance
            page_no = 0
            if hasattr(enrich_element.item, "prov") and enrich_element.item.prov:
                page_no = enrich_element.item.prov[0].page_no

            # Extract element ID from self_ref (e.g., "#/texts/758" -> "758")
            element_id = "unknown"
            self_ref = getattr(enrich_element.item, "self_ref", None)
            if self_ref:
                element_id = self_ref.split("/")[-1]

            # Generate filename: p<page_no>_formula_<element_id>.png
            filename = f"p{page_no}_formula_{element_id}.png"
            filepath = self.debug_images_dir / filename

            try:
                upscaled_image.save(filepath, "PNG")
                logger.debug(f"Saved debug formula image: {filename}")
            except Exception as e:
                logger.warning(f"Failed to save debug formula image {filename}: {e}")

    def _process_images_in_batches(self, images: list[Image.Image]) -> list[Any]:
        """
        Process images in sub-batches with simple OOM recovery.

        On GPU out-of-memory error, clears cache and retries with half batch size.
        This captures most memory pressure scenarios without complex state machines.

        Args:
            images: List of PIL Images to process.

        Returns:
            List of all results from processing.
        """
        all_results = []
        batch_size = self.batch_size
        i = 0

        while i < len(images):
            batch_images = images[i : i + batch_size]

            logger.debug(
                f"Processing formula batch {i}-{i + len(batch_images)} of {len(images)} "
                f"(batch_size={batch_size})"
            )

            try:
                results = self._run_inference(batch_images)
                all_results.extend(results)
                i += len(batch_images)

            except RuntimeError as e:
                if "out of memory" not in str(e).lower():
                    raise

                # OOM: cleanup and retry with half batch size
                logger.warning(
                    f"GPU OOM with batch_size={batch_size}, retrying with {batch_size // 2}"
                )
                self._clear_gpu_cache()

                if batch_size <= 1:
                    logger.error("OOM even with batch_size=1, skipping remaining formulas")
                    break

                batch_size = max(1, batch_size // 2)
                # Don't increment i - retry same position with smaller batch

        return all_results

    def _insert_tag(self, latex: str, number: str) -> str:
        """
        Insert \\tag{N} before closing $ or $$ delimiter.

        Places the tag at the end of the LaTeX content, immediately before
        the closing math delimiter. This matches the standard position for
        equation numbers in LaTeX.

        Args:
            latex: LaTeX string with $ or $$ delimiters
            number: Formula number to insert (without parentheses)

        Returns:
            LaTeX with \\tag{N} inserted before closing delimiter
        """
        latex_stripped = latex.rstrip()

        # Handle $$...$$ (display math)
        if latex_stripped.endswith("$$"):
            return latex_stripped[:-2] + f" \\tag{{{number}}}$$"

        # Handle $...$ (inline math)
        if latex_stripped.endswith("$"):
            return latex_stripped[:-1] + f" \\tag{{{number}}}$"

        # No delimiter, just append
        return f"{latex} \\tag{{{number}}}"

    def _normalize_formula_number(  # noqa: PLR0911
        self,
        latex: str,
        orig_text: str | None = None,
        adjacent_number: str | None = None,
        cluster_formula_number: str | None = None,
    ) -> str:
        """
        Normalize formula number to consistent \\tag{N} format.

        Ensures all formulas with numbers use the same format for consistency
        in downstream processing and search. Priority order:
        1. Existing \\tag{N} in LaTeX (keep as-is)
        2. (N) pattern at end of LaTeX content → convert to \\tag{N}
        3. (N) pattern after closing delimiter → extract and convert
        4. Number from orig_text → append as \\tag{N}
        5. Number from adjacent element → append as \\tag{N}
        6. Number from cluster extraction → append as \\tag{N}

        Args:
            latex: LaTeX string from Surya (may contain $ delimiters)
            orig_text: Original text from Docling (may contain formula number)
            adjacent_number: Number found from adjacent text/formula element
            cluster_formula_number: Number extracted from split formula cluster elements

        Returns:
            LaTeX with normalized \\tag{N} format, or unchanged if no number found
        """
        if not latex:
            return latex

        # Check for existing \tag{N} - already normalized
        if FORMULA_TAG_PATTERN.search(latex):
            return latex

        # Check for (N) after closing delimiter (e.g., "$$...$$\n(5)")
        outside_match = FORMULA_PAREN_OUTSIDE_LATEX.search(latex)
        if outside_match:
            return self._handle_paren_outside_latex(latex, outside_match)

        # Check for (N) at end of LaTeX content (inside delimiters)
        result = self._handle_paren_inside_latex(latex)
        if result:
            return result

        # Try orig_text for formula number
        if orig_text:
            from .structure_extractor import (  # noqa: PLC0415
                extract_formula_number,
            )

            number = extract_formula_number(orig_text, latex)
            if number:
                return self._insert_tag(latex, number)

        # Try adjacent number
        if adjacent_number:
            return self._insert_tag(latex, adjacent_number)

        # Try cluster formula number (lowest priority fallback for split formulas)
        if cluster_formula_number:
            return self._insert_tag(latex, cluster_formula_number)

        return latex

    def _handle_paren_outside_latex(self, latex: str, match: re.Match) -> str:
        """Handle (N) appearing after closing $ or $$ delimiter."""
        delimiter = match.group(1)
        number = match.group(2)
        latex_content = FORMULA_PAREN_OUTSIDE_LATEX.sub("", latex).rstrip()

        if delimiter == "$$":
            if latex_content.endswith("$$"):
                return latex_content[:-2] + f" \\tag{{{number}}}$$"
            return latex_content + f" \\tag{{{number}}}$$"

        # Single $
        if latex_content.endswith("$"):
            return latex_content[:-1] + f" \\tag{{{number}}}$"
        return latex_content + f" \\tag{{{number}}}$"

    def _handle_paren_inside_latex(self, latex: str) -> str | None:
        """Handle (N) at end of LaTeX content inside delimiters.

        Returns normalized LaTeX if pattern found, None otherwise.
        """
        content = latex
        prefix = ""
        suffix = ""

        if latex.startswith("$$") and "$$" in latex[2:]:
            end_idx = latex.rfind("$$")
            if end_idx > 1:
                prefix = "$$"
                suffix = "$$"
                content = latex[2:end_idx]
        elif latex.startswith("$") and "$" in latex[1:]:
            end_idx = latex.rfind("$")
            if end_idx > 0:
                prefix = "$"
                suffix = "$"
                content = latex[1:end_idx]

        paren_match = FORMULA_PAREN_END_PATTERN.search(content)
        if paren_match:
            number = paren_match.group(1)
            content_without_paren = FORMULA_PAREN_END_PATTERN.sub("", content).rstrip()
            return f"{prefix}{content_without_paren} \\tag{{{number}}}{suffix}"

        return None

    def _enrich_item_with_latex(
        self, enrich_element: ItemAndImageEnrichmentElement, result: Any
    ) -> None:
        """
        Enrich a single item with extracted LaTeX.

        Args:
            enrich_element: The element to enrich.
            result: OCR result from Surya.
        """
        latex_text = self._extract_latex(result)

        if latex_text:
            # Convert <math> tags to $ delimiters
            latex_text = self._convert_math_tags(latex_text)
            # Remove consecutive duplicate lines (Surya hallucination fix)
            latex_text = self._remove_duplicate_lines(latex_text)
            # Wrap in $...$ if not already wrapped
            if not latex_text.startswith("$"):
                latex_text = f"${latex_text}$"

            # Normalize formula number to \tag{N} format
            if self.normalize_formula_numbers:
                orig_text = getattr(enrich_element.item, "orig", None)
                self_ref = getattr(enrich_element.item, "self_ref", "")
                adjacent_number = self._adjacent_numbers.get(self_ref)

                # Get cluster formula number as fallback for split clusters
                cluster_formula_number = None
                if self_ref and self_ref in self._cluster_by_ref:
                    cluster = self._cluster_by_ref[self_ref]
                    if cluster.is_split and cluster.extracted_formula_number:
                        cluster_formula_number = cluster.extracted_formula_number

                latex_text = self._normalize_formula_number(
                    latex_text, orig_text, adjacent_number, cluster_formula_number
                )

            enrich_element.item.text = latex_text
            logger.debug(f"Formula enriched with Surya: {latex_text[:LOG_TRUNCATE_LENGTH]}...")

    def _mark_secondary_element(self, item: NodeItem) -> None:
        """
        Mark a secondary element in a split cluster with merged_into metadata.

        Secondary elements are formula fragments that were part of a multi-line
        formula split during layout detection. They are marked with metadata
        pointing to the primary element that contains the complete LaTeX.

        Args:
            item: The secondary formula element to mark
        """
        self_ref = getattr(item, "self_ref", None)
        if not self_ref or self_ref not in self._merged_into:
            return

        primary_ref = self._merged_into[self_ref]

        # Clear the text since this element's content is in the primary
        # Keep orig for reference
        item.text = ""

        # Add metadata marker if the item supports it
        # Note: TextItem may not have a metadata field by default,
        # but we can use a custom attribute pattern
        if not hasattr(item, "_split_formula_metadata"):
            item._split_formula_metadata = {}  # type: ignore[attr-defined]
        item._split_formula_metadata["merged_into"] = primary_ref  # type: ignore[attr-defined]
        item._split_formula_metadata["is_secondary"] = True  # type: ignore[attr-defined]

        logger.debug(
            "Marked secondary element %s as merged into %s",
            self_ref,
            primary_ref,
        )

    def __call__(
        self,
        doc: DoclingDocument,  # noqa: ARG002
        element_batch: Iterable[ItemAndImageEnrichmentElement],
    ) -> Iterable[NodeItem]:
        """
        Process a batch of formula elements with Surya RecognitionPredictor.

        This method receives formula elements with their cropped images and
        uses Surya to extract LaTeX representations. The extracted LaTeX is
        wrapped in $...$ delimiters to match Docling's convention.

        For split formula clusters:
        - Primary elements receive the LaTeX from merged bbox cropping
        - Secondary elements are marked with merged_into metadata and cleared text

        Args:
            doc: The DoclingDocument being processed.
            element_batch: Iterable of ItemAndImageEnrichmentElement objects,
                          each containing .item (TextItem) and .image (PIL Image).

        Yields:
            NodeItem: The processed items with updated text fields.

        Note:
            If processing fails for an item, it yields the item unchanged
            with a warning logged.
        """
        # Early return for disabled model
        if not self.enabled:
            yield from (e.item for e in element_batch)
            return

        batch_items = list(element_batch)
        if not batch_items:
            return

        # Collect valid images (excludes secondary split elements which have placeholder images)
        images, valid_indices = self._collect_valid_images(batch_items)

        # Track secondary elements that need marking (have placeholder images)
        secondary_indices: list[int] = []
        for i, enrich_element in enumerate(batch_items):
            if self._is_secondary_element(enrich_element.item):
                secondary_indices.append(i)

        # Count primary (non-secondary) formulas in this batch
        primary_count = len(batch_items) - len(secondary_indices)
        self.formulas_total += primary_count

        if not images:
            # Only secondary elements or no valid images
            self.formulas_skipped += primary_count
            for i, enrich_element in enumerate(batch_items):
                if i in secondary_indices:
                    self._mark_secondary_element(enrich_element.item)
                yield enrich_element.item
            return

        # Save debug images before Surya processing
        self._save_debug_images(batch_items, images, valid_indices)

        try:
            self._load_predictor()
            all_results = self._process_images_in_batches(images)

            # Track OOM-skipped formulas (images submitted but no result returned)
            oom_skipped = len(images) - len(all_results)
            if oom_skipped > 0:
                self.formulas_failed_oom += oom_skipped

            # Map results back to items
            result_map = dict(zip(valid_indices, all_results, strict=False))

            for i, enrich_element in enumerate(batch_items):
                if i in result_map:
                    self._enrich_item_with_latex(enrich_element, result_map[i])
                    self.formulas_enriched += 1
                elif i in secondary_indices:
                    self._mark_secondary_element(enrich_element.item)
                else:
                    self.formulas_skipped += 1

                # Clear image reference after processing to allow GC to reclaim memory
                enrich_element.image = None

                yield enrich_element.item

        except Exception as e:
            logger.error(f"Surya formula enrichment failed: {e}", exc_info=True)
            self.formulas_skipped += primary_count
            yield from (elem.item for elem in batch_items)
        finally:
            # Clear local image references to allow GC to reclaim memory.
            # With upscale_factor=2.0, formula images are 4x larger (~50-200MB spike).
            # The local 'images' list persists until function exit without this cleanup.
            images.clear()
            valid_indices.clear()

            # Clear document reference after batch processing to prevent memory leaks.
            # The _doc reference holds the entire DoclingDocument (~1-3 GiB for complex PDFs).
            # Without this, memory grows with each processed document.
            self._doc = None

    def _extract_latex(self, result: Any) -> str | None:
        """
        Extract LaTeX text from Surya RecognitionPredictor result.

        In surya-ocr 0.17.0, the result is an OCRResult object with text_lines.
        Each text_line has a .text attribute containing the recognized text.

        Args:
            result: OCRResult object from RecognitionPredictor.

        Returns:
            Extracted LaTeX string, or None if extraction failed.
        """
        # surya-ocr 0.17.0 returns OCRResult with text_lines
        if hasattr(result, "text_lines") and result.text_lines:
            texts = [line.text for line in result.text_lines if hasattr(line, "text") and line.text]
            if texts:
                return " ".join(texts)

        # Fallback: try common attribute names
        for attr in ("text", "latex"):
            if hasattr(result, attr) and (value := getattr(result, attr)):
                return value

        # Fallback: handle primitive types
        if isinstance(result, str):
            return result
        if isinstance(result, dict):
            return result.get("text") or result.get("latex")

        logger.warning(f"Unknown Surya result format: {type(result)}")
        return None

    def _convert_math_tags(self, text: str) -> str:
        """
        Convert Surya's <math> tags to standard LaTeX $ delimiters.

        Surya outputs LaTeX with <math display="block">...</math> for block equations
        and <math>...</math> for inline equations.

        Args:
            text: Text containing <math> tags.

        Returns:
            Text with $ delimiters instead of <math> tags.
        """
        # Convert block math: <math display="block">...</math> -> $$...$$
        text = re.sub(r'<math display="block">(.*?)</math>', r"$$\1$$", text, flags=re.DOTALL)
        # Convert inline math: <math>...</math> or <math display="inline">...</math> -> $...$
        text = re.sub(r'<math display="inline">(.*?)</math>', r"$\1$", text, flags=re.DOTALL)
        return re.sub(r"<math>(.*?)</math>", r"$\1$", text, flags=re.DOTALL)

    def _remove_duplicate_lines(self, text: str) -> str:
        """
        Remove consecutive duplicate lines from LaTeX output.

        Surya OCR can hallucinate duplicate lines when processing formulas
        with repetitive patterns. This removes consecutive duplicates while
        preserving all unique content.

        Args:
            text: LaTeX text possibly containing duplicate lines.

        Returns:
            Text with consecutive duplicate lines removed.
        """
        if not text:
            return text

        # Split on newlines and $$ boundaries (which often separate formula lines)
        # Pattern: split on \n or on $$ that's followed by another $$
        lines = re.split(r"\n|(?<=\$\$)(?=\$\$)", text)

        result = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            # Only add if different from the previous line
            if not result or stripped != result[-1].strip():
                result.append(line)

        # Rejoin - use newline if original had newlines, otherwise direct concatenation
        if "\n" in text:
            return "\n".join(result)
        return "".join(result)

    def get_formula_stats(self) -> dict[str, int]:
        """Return formula processing statistics for the current document.

        Returns:
            Dictionary with keys: total, enriched, skipped, failed_oom
        """
        return {
            "total": self.formulas_total,
            "enriched": self.formulas_enriched,
            "skipped": self.formulas_skipped,
            "failed_oom": self.formulas_failed_oom,
        }

    def cleanup(self) -> None:
        """
        Release resources held by the Surya RecognitionPredictor.

        Call this method when the model is no longer needed to free GPU memory.
        Also clears split formula detection state and adjacent number state.

        Memory Management:
            The RecognitionPredictor wraps a FoundationPredictor which loads heavy
            ML models (~500MB-1GB). We explicitly clean up the foundation_predictor
            to ensure the underlying PyTorch tensors are released.
        """
        if self._predictor is not None:
            # Explicitly clean up FoundationPredictor before deleting RecognitionPredictor.
            # RecognitionPredictor wraps FoundationPredictor, and simply deleting
            # the wrapper may not release the underlying model weights.
            try:
                if hasattr(self._predictor, "foundation_predictor"):
                    foundation = getattr(self._predictor, "foundation_predictor", None)
                    if foundation is not None:
                        # Clear model reference if present
                        if hasattr(foundation, "model"):
                            del foundation.model
                        # Clear the foundation predictor itself
                        del foundation
                        logger.debug("FoundationPredictor resources released")
            except Exception as e:
                logger.warning(f"FoundationPredictor cleanup failed: {e}")

            del self._predictor
            self._predictor = None
            self._task_name = None
            self._clear_gpu_cache()
            logger.debug("Surya RecognitionPredictor resources released")

        # Clear split detection state
        self._cluster_by_ref = {}
        self._merged_into = {}

        # Clear adjacent number detection state
        self._adjacent_numbers = {}
        self._doc = None
        self._current_doc_id = None

        # Reset counters
        self.formulas_total = 0
        self.formulas_enriched = 0
        self.formulas_skipped = 0
        self.formulas_failed_oom = 0

    def __del__(self) -> None:
        """Ensure cleanup on garbage collection.

        This destructor ensures that the RecognitionPredictor (~700MB-1GB) is
        released even if cleanup() was not called explicitly. This prevents
        delayed memory release when instances are garbage collected.

        Note:
            Exceptions are suppressed during GC to prevent issues with Python's
            object finalization process.
        """
        with contextlib.suppress(Exception):
            self.cleanup()
