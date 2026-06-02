"""
This module provides functionality for parsing documents and extracting structure.

Includes:
- PDF parsing via Docling
- DOCX parsing via Docling
- Document format detection and routing
- Document chunking
- Structure extraction (TOC and font-based)
- Chunk-to-structure mapping
- Optional Surya-based formula enrichment
"""

from . import constants
from .base import CleanupMixin
from .docling_chunker import DoclingChunker
from .document_parser_factory import (
    DocumentParserFactory,
    SupportedFormat,
)
from .docx_to_docling_parser import DocxParser
from .orphan_list_detector import (
    OrphanedItem,
    detect_orphaned_list_items,
    fix_orphaned_list_items,
)
from .pdf_to_docling_parser import PdfParser, log_document_structure
from .split_formula_detector import (
    FormulaBbox,
    FormulaCluster,
    FormulaElement,
    build_cluster_lookup,
    detect_split_formula_clusters,
)
from .structure_extractor import (
    build_formula_ref_map,
    collect_all_formula_declarations,
    detect_formula_references,
    enhance_embedding_with_formula_numbers,
    extract_formula_number,
    extract_formulas_from_doc_items,
)
from .subscript_serializer import (
    ScriptAwareFallbackSerializer,
    ScriptAwareSerializerProvider,
    SubscriptConfig,
    postprocess_chunk_text,
)
from .table_processing import (
    TableIsolatedHybridChunker,
    detect_and_merge_split_tables,
    recover_type2_split_tables,
)

# Conditional imports for Surya formula enrichment (optional dependency)
try:
    from .surya_enrichment_model import SuryaFormulaEnrichmentModel
    from .surya_formula_pipeline import (
        SuryaFormulaPipeline,
        SuryaFormulaPipelineOptions,
    )

    SURYA_AVAILABLE = True
except ModuleNotFoundError:
    # surya-ocr not installed, Surya classes not available
    SuryaFormulaEnrichmentModel = None  # type: ignore[misc, assignment]
    SuryaFormulaPipeline = None  # type: ignore[misc, assignment]
    SuryaFormulaPipelineOptions = None  # type: ignore[misc, assignment]
    SURYA_AVAILABLE = False

__all__ = [
    # Constants
    "constants",
    # Base classes
    "CleanupMixin",
    # Document parsing
    "PdfParser",
    "DocxParser",
    "DocumentParserFactory",
    "SupportedFormat",
    "DoclingChunker",
    "log_document_structure",
    # Orphan list detection
    "OrphanedItem",
    "detect_orphaned_list_items",
    "fix_orphaned_list_items",
    # Subscript/superscript serialization
    "SubscriptConfig",
    "ScriptAwareSerializerProvider",
    "ScriptAwareFallbackSerializer",
    "postprocess_chunk_text",
    # Formula extraction
    "extract_formula_number",
    "detect_formula_references",
    "extract_formulas_from_doc_items",
    "enhance_embedding_with_formula_numbers",
    "collect_all_formula_declarations",
    "build_formula_ref_map",
    # Table processing
    "TableIsolatedHybridChunker",
    "detect_and_merge_split_tables",
    "recover_type2_split_tables",
    # Split formula detection
    "FormulaCluster",
    "FormulaBbox",
    "FormulaElement",
    "detect_split_formula_clusters",
    "build_cluster_lookup",
    # Surya formula enrichment (optional)
    "SURYA_AVAILABLE",
    "SuryaFormulaEnrichmentModel",
    "SuryaFormulaPipeline",
    "SuryaFormulaPipelineOptions",
]
