"""Single document processing pipeline with LangGraph.

This module contains the SingleDocumentPipeline class and its supporting factory
functions. These are imported by subprocess_worker.py inside each subprocess,
keeping heavy ML dependencies (docling, langgraph, surya) out of the parent
orchestrator process.
"""

import asyncio
import json
import logging
import threading
from collections.abc import Generator
from contextlib import contextmanager
from typing import Any

from docling.datamodel.accelerator_options import AcceleratorDevice, AcceleratorOptions
from docling.datamodel.document import DoclingDocument
from docling.datamodel.pipeline_options import (
    LayoutOptions,
    TableFormerMode,
    TesseractCliOcrOptions,
    ThreadedPdfPipelineOptions,
)
from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from document_ingestion_worker.document_parsing.docling_chunker import DoclingChunker
from document_ingestion_worker.document_parsing.document_parser_factory import (
    DocumentParserFactory,
    SupportedFormat,
)
from document_ingestion_worker.document_parsing.docx_to_docling_parser import DocxParser
from document_ingestion_worker.document_parsing.pdf_to_docling_parser import PdfParser
from document_ingestion_worker.document_parsing.structure_extractor import build_formula_ref_map
from document_ingestion_worker.document_parsing.subscript_serializer import SubscriptConfig
from vector_store import QdrantConnector

from .config import DocumentIngestionSettings
from .models import SingleDocumentState

logger = logging.getLogger(__name__)


# =============================================================================
# Progress Heartbeat
# =============================================================================


@contextmanager
def progress_heartbeat(
    document_id: str, operation: str, interval_seconds: int = 10
) -> Generator[None, None, None]:
    """
    Log periodic 'still processing' messages during long operations.

    This context manager spawns a background thread that logs progress messages
    at regular intervals. Useful for providing visibility during potentially
    lengthy PDF parsing operations.

    Args:
        document_id: Identifier for the document being processed
        operation: Description of the current operation (e.g., "Parsing PDF")
        interval_seconds: Time between heartbeat logs (default: 10 seconds)

    Example:
        >>> with progress_heartbeat("doc123", "Parsing PDF"):
        ...     # Long-running operation
        ...     parse_pdf(path)
        # Logs: [doc123] Parsing PDF... (10s elapsed)
        # Logs: [doc123] Parsing PDF... (20s elapsed)
    """
    stop_event = threading.Event()
    elapsed = [0]  # Use list to allow mutation in nested function

    def heartbeat() -> None:
        while not stop_event.wait(interval_seconds):
            elapsed[0] += interval_seconds
            logger.info(f"[{document_id}] {operation}... ({elapsed[0]}s elapsed)")

    thread = threading.Thread(target=heartbeat, daemon=True)
    thread.start()
    try:
        yield
    finally:
        stop_event.set()
        thread.join(timeout=1)


# =============================================================================
# Module-level Factory Functions (for subprocess isolation)
# =============================================================================


def create_pdf_parser(config: DocumentIngestionSettings) -> PdfParser:
    """
    Create a new PdfParser instance configured from settings.

    This module-level factory function enables subprocess isolation by allowing
    the subprocess worker to create parser instances without needing access to
    the ParallelDocumentIngestionPipeline class.

    Thread-Safety: Each document should have its own parser instance because
    Docling's DocumentConverter is not thread-safe. Creating a new parser
    per document ensures isolation when processing in parallel.

    Args:
        config: Document ingestion settings

    Returns:
        New PdfParser instance configured with provided settings
    """
    # Create pipeline options from config
    pipeline_options = _create_pipeline_options(config)

    return PdfParser(
        pipeline_options=pipeline_options,
        apply_hierarchy_postprocessing=config.apply_hierarchy_postprocessing,
        enable_orphan_fix=config.fix_orphaned_list_items,
        merge_split_tables=config.merge_split_tables,
        save_intermediate_results=config.save_intermediate_parsing_results,
        backend=config.pdf_backend,
        pdf_images_scale=config.pdf_images_scale,
        # Surya formula enrichment
        use_surya_formula_pipeline=config.use_surya_formula_enrichment,
        surya_batch_size=config.surya_batch_size,
        surya_upscale_factor=config.surya_upscale_factor,
        surya_expansion_factor_horizontal=config.surya_expansion_factor_horizontal,
        surya_expansion_factor_vertical=config.surya_expansion_factor_vertical,
    )


def create_chunker(config: DocumentIngestionSettings) -> DoclingChunker:
    """
    Create a new DoclingChunker instance configured from settings.

    This module-level factory function enables subprocess isolation by allowing
    the subprocess worker to create chunker instances without needing access to
    the ParallelDocumentIngestionPipeline class.

    Thread-Safety: DoclingChunker uses HybridChunker internally which is not
    thread-safe due to shared tokenizer state. Each document should have its
    own chunker instance.

    Args:
        config: Document ingestion settings

    Returns:
        New DoclingChunker instance configured with provided settings
    """
    # SubscriptConfig controls custom subscript/superscript handling (CO2->CO₂)
    # When enable_subscript_handling=False, uses Docling's default serializer
    subscript_config = SubscriptConfig(concatenate_inline=config.enable_subscript_handling)
    return DoclingChunker(
        model_id=config.embedding_model_name,
        max_tokens=config.chunk_max_tokens,
        overlap_tokens=config.chunk_overlap_tokens,
        subscript_config=subscript_config,
        isolate_tables=config.isolate_table_chunks,
    )


def _create_pipeline_options(config: DocumentIngestionSettings) -> ThreadedPdfPipelineOptions:
    """
    Create ThreadedPdfPipelineOptions from config settings.

    This internal factory function creates the Docling pipeline options used by
    the PDF parser. Used by create_pdf_parser() to configure the parser.

    Uses ThreadedPdfPipelineOptions for batch processing support with
    configurable batch sizes and hardware acceleration.

    Args:
        config: Document ingestion settings

    Returns:
        Configured ThreadedPdfPipelineOptions instance
    """
    # Get effective batch sizes (auto-detect or user override)
    ocr_batch, layout_batch, table_batch = config.get_effective_batch_sizes()

    # Create threaded pipeline options with batch sizes
    pipeline_options = ThreadedPdfPipelineOptions(
        ocr_batch_size=ocr_batch,
        layout_batch_size=layout_batch,
        table_batch_size=table_batch,
    )

    # Configure accelerator (GPU/CPU)
    pipeline_options.accelerator_options = _create_accelerator_options(config)

    # OCR settings - only Tesseract CLI is supported
    pipeline_options.do_ocr = config.do_ocr
    if config.do_ocr:
        pipeline_options.ocr_options = _create_ocr_options(config)

    # Table structure settings with mode selection
    pipeline_options.do_table_structure = config.do_table_structure
    if config.do_table_structure:
        if config.table_structure_mode == "accurate":
            pipeline_options.table_structure_options.mode = TableFormerMode.ACCURATE
        else:
            pipeline_options.table_structure_options.mode = TableFormerMode.FAST
        pipeline_options.table_structure_options.do_cell_matching = config.do_cell_matching

    # Formula enrichment
    pipeline_options.do_formula_enrichment = config.do_formula_enrichment

    # Layout model configuration (heron default for balanced performance)
    try:
        layout_model_spec = config.get_layout_model_spec()
        pipeline_options.layout_options = LayoutOptions(model_spec=layout_model_spec)
        logger.info(f"Layout model: {config.layout_model}")
    except ImportError:
        logger.warning(
            "Could not import layout_model_specs from docling. Using default layout model."
        )

    return pipeline_options


def _create_accelerator_options(config: DocumentIngestionSettings) -> AcceleratorOptions:
    """
    Create AcceleratorOptions from config settings.

    Args:
        config: Document ingestion settings

    Returns:
        Configured AcceleratorOptions instance
    """
    device_map = {
        "auto": AcceleratorDevice.AUTO,
        "cuda": AcceleratorDevice.CUDA,
        "mps": AcceleratorDevice.MPS,
        "cpu": AcceleratorDevice.CPU,
    }

    return AcceleratorOptions(
        device=device_map[config.accelerator_device],
        num_threads=config.num_threads,
    )


def _create_ocr_options(config: DocumentIngestionSettings) -> TesseractCliOcrOptions:
    """
    Create Tesseract CLI OCR options from config settings.

    Only Tesseract CLI is supported. Other OCR engines (EasyOCR, RapidOCR,
    OcrMac) have been removed to simplify dependencies and reduce build times.

    Args:
        config: Document ingestion settings

    Returns:
        Configured TesseractCliOcrOptions instance
    """
    options = TesseractCliOcrOptions(
        lang=config.ocr_lang,
        force_full_page_ocr=config.force_full_page_ocr,
    )
    if config.tesseract_cmd:
        options.tesseract_cmd = config.tesseract_cmd
    return options


# =============================================================================
# Single Document Pipeline
# =============================================================================


class SingleDocumentPipeline:
    """
    LangGraph pipeline for processing a SINGLE document.

    Processes one document through: validate → parse → chunk → embed → upsert.
    Receives resources via dependency injection from the subprocess worker.
    Supports both PDF and DOCX formats through format-specific parsers.

    This class is instantiated inside each subprocess by subprocess_worker.py,
    ensuring per-document resource isolation at the OS process level.
    """

    def __init__(
        self,
        config: DocumentIngestionSettings,
        pdf_parser: PdfParser,
        docx_parser: DocxParser,
        chunker: DoclingChunker,
        embedding_provider: Any,
        vector_store: QdrantConnector,
    ):
        """
        Initialize with injected resources from the orchestrator.

        Args:
            config: Pipeline configuration
            pdf_parser: PDF parser instance (must be dedicated to this document)
            docx_parser: DOCX parser instance (must be dedicated to this document)
            chunker: Document chunker instance (must be dedicated to this document)
            embedding_provider: Shared embedding provider instance (thread-safe)
            vector_store: Shared vector store connector instance (thread-safe)
        """
        self.config = config
        self.pdf_parser = pdf_parser
        self.docx_parser = docx_parser
        self.chunker = chunker
        self.embedding_provider = embedding_provider
        self.vector_store = vector_store

        # Build the per-document LangGraph
        self.graph = self._build_graph()

    def _build_graph(self) -> CompiledStateGraph:
        """Build the per-document LangGraph with conditional entry."""
        workflow = StateGraph(SingleDocumentState)

        # Add all nodes
        workflow.add_node("route_entry", self._route_entry)
        workflow.add_node("validate_pdf", self.validate_pdf)
        workflow.add_node("parse_pdf", self.parse_pdf)
        workflow.add_node("save_parsed", self.save_parsed)
        workflow.add_node("load_parsed", self.load_parsed)
        workflow.add_node("chunk_document", self.chunk_document)
        workflow.add_node("save_raw_chunks", self.save_raw_chunks)
        workflow.add_node("prepare_for_embedding", self.prepare_for_embedding)
        workflow.add_node("save_prepared_chunks", self.save_prepared_chunks)
        workflow.add_node("load_prepared_chunks", self.load_prepared_chunks)
        workflow.add_node("embed_chunks", self.embed_chunks)
        workflow.add_node("save_embedded_documents", self.save_embedded_documents)
        workflow.add_node("upsert_to_qdrant", self.upsert_to_qdrant)

        # Entry point with conditional routing
        workflow.set_entry_point("route_entry")

        workflow.add_conditional_edges(
            "route_entry",
            self._determine_start_node,
            {
                "beginning": "validate_pdf",
                "parsed": "load_parsed",
                "chunked": "load_prepared_chunks",
            },
        )

        # Full pipeline edges (from beginning)
        workflow.add_edge("validate_pdf", "parse_pdf")
        workflow.add_edge("parse_pdf", "save_parsed")
        workflow.add_edge("save_parsed", "chunk_document")

        # Parsed resume path
        workflow.add_edge("load_parsed", "chunk_document")

        # Common chunking path
        workflow.add_edge("chunk_document", "save_raw_chunks")
        workflow.add_edge("save_raw_chunks", "prepare_for_embedding")
        workflow.add_edge("prepare_for_embedding", "save_prepared_chunks")
        workflow.add_edge("save_prepared_chunks", "embed_chunks")

        # Chunked resume path
        workflow.add_edge("load_prepared_chunks", "embed_chunks")

        # Final path
        workflow.add_edge("embed_chunks", "save_embedded_documents")
        workflow.add_edge("save_embedded_documents", "upsert_to_qdrant")
        workflow.add_edge("upsert_to_qdrant", END)

        return workflow.compile()

    def _route_entry(self, state: SingleDocumentState) -> dict:  # noqa: ARG002
        """Route entry node - just passes through for conditional routing."""
        return {}

    def _determine_start_node(self, state: SingleDocumentState) -> str:
        """Determine which node to start from based on state."""
        return state.get("start_from", "beginning")

    async def validate_pdf(self, state: SingleDocumentState) -> dict:  # noqa: PLR0911
        """Validate the document file exists and is valid.

        Note: Method named validate_pdf for backward compatibility but handles
        all supported formats (PDF, DOCX).
        """
        if state.get("error"):
            return {}

        pdf_path = state["pdf_path"]
        document_id = state["document_id"]

        try:
            exists = await asyncio.to_thread(pdf_path.exists)
            if not exists:
                return {"error": f"Document file not found: {pdf_path}"}

            is_file = await asyncio.to_thread(pdf_path.is_file)
            if not is_file:
                return {"error": f"Not a file: {pdf_path}"}

            file_size = await asyncio.to_thread(lambda: pdf_path.stat().st_size)
            if file_size == 0:
                return {"error": f"Empty document file: {pdf_path}"}

            # Validate format is supported
            if not DocumentParserFactory.is_supported(pdf_path):
                return {"error": f"Unsupported file format: {pdf_path.suffix}"}

            logger.debug(f"[{document_id}] Validation passed")
            return {}

        except Exception as e:
            logger.error(f"[{document_id}] Validation error: {e}")
            return {"error": f"Validation error: {e}"}

    async def parse_pdf(self, state: SingleDocumentState) -> dict:
        """Parse the document file into a DoclingDocument.

        Note: Method named parse_pdf for backward compatibility but handles
        all supported formats (PDF, DOCX) by routing to the appropriate parser.
        """
        if state.get("error"):
            return {}

        pdf_path = state["pdf_path"]
        document_id = state["document_id"]
        staged_path = state["staged_path"]

        # Log thread info for debugging parallel processing issues
        thread_id = threading.current_thread().ident
        logger.debug(
            f"[{document_id}] parse_pdf starting on thread {thread_id}, staged_path={staged_path}"
        )

        try:
            # Check memory pressure before heavy parsing operation
            self._check_memory_pressure(document_id, "document parsing")

            # Determine format and select parser
            file_format = DocumentParserFactory.get_format(pdf_path)

            # Prepare output directory for intermediate results
            parsed_dir = staged_path / "parsed"
            await asyncio.to_thread(parsed_dir.mkdir, parents=True, exist_ok=True)

            if file_format == SupportedFormat.PDF:
                logger.info(f"[{document_id}] Parsing PDF...")
                # Use progress heartbeat for long-running PDF parsing
                with progress_heartbeat(document_id, "Parsing PDF"):
                    doc = await asyncio.to_thread(
                        self.pdf_parser.convert_pdf, pdf_path, output_dir=parsed_dir
                    )
            elif file_format == SupportedFormat.DOCX:
                logger.info(f"[{document_id}] Parsing DOCX...")
                # Use progress heartbeat for DOCX parsing (usually faster, but still useful)
                with progress_heartbeat(document_id, "Parsing DOCX"):
                    doc = await asyncio.to_thread(self.docx_parser.convert_docx, pdf_path)
            else:
                return {"error": f"Unsupported format: {pdf_path.suffix}"}

            logger.info(f"[{document_id}] Parsed successfully ({file_format.value})")
            return {"parsed_document": (pdf_path, doc), "source_format": file_format.value}

        except Exception as e:
            logger.error(f"[{document_id}] Parse error: {e}", exc_info=True)
            return {"error": f"Parse error: {e}"}

    async def save_parsed(self, state: SingleDocumentState) -> dict:
        """Save the parsed DoclingDocument to staged directory."""
        if state.get("error") or not state.get("parsed_document"):
            return {}

        staged_path = state["staged_path"]
        document_id = state["document_id"]
        _, doc = state["parsed_document"]

        try:
            parsed_dir = staged_path / "parsed"
            await asyncio.to_thread(parsed_dir.mkdir, parents=True, exist_ok=True)

            output_file = parsed_dir / f"{document_id}.json"
            doc_dict = await asyncio.to_thread(doc.export_to_dict)

            def save_json():
                with output_file.open("w", encoding="utf-8") as f:
                    json.dump(doc_dict, f, ensure_ascii=False, indent=2)

            await asyncio.to_thread(save_json)
            logger.debug(f"[{document_id}] Saved parsed document to {output_file}")
            return {}

        except Exception as e:
            logger.error(f"[{document_id}] Error saving parsed document: {e}")
            return {}  # Non-fatal, continue processing

    async def load_parsed(self, state: SingleDocumentState) -> dict:
        """Load a pre-parsed DoclingDocument from staged directory."""
        if state.get("error"):
            return {}

        staged_path = state["staged_path"]
        pdf_path = state["pdf_path"]
        document_id = state["document_id"]

        try:
            parsed_file = staged_path / "parsed" / f"{document_id}.json"

            exists = await asyncio.to_thread(parsed_file.exists)
            if not exists:
                return {"error": f"Parsed file not found: {parsed_file}"}

            def load_json():
                with parsed_file.open("r", encoding="utf-8") as f:
                    return json.load(f)

            doc_dict = await asyncio.to_thread(load_json)
            doc = DoclingDocument.model_validate(doc_dict)

            logger.debug(f"[{document_id}] Loaded parsed document from {parsed_file}")
            # Use original PDF path for structure extraction
            return {"parsed_document": (pdf_path, doc)}

        except Exception as e:
            logger.error(f"[{document_id}] Error loading parsed document: {e}")
            return {"error": f"Error loading parsed document: {e}"}

    async def chunk_document(self, state: SingleDocumentState) -> dict:
        """Chunk the parsed document into smaller pieces."""
        if state.get("error") or not state.get("parsed_document"):
            return {}

        pdf_path, doc = state["parsed_document"]
        document_id = state["document_id"]

        try:
            logger.info(f"[{document_id}] Chunking document...")
            raw_chunks = await asyncio.to_thread(self.chunker.chunk_document, doc)

            # Build formula ref map for bbox-based formula detection (e.g., formula 65)
            formula_ref_map = await asyncio.to_thread(build_formula_ref_map, doc)
            valid_declarations = {num for num, _latex, _page in formula_ref_map.values()}

            # Add source to each chunk
            for chunk in raw_chunks:
                chunk["source"] = str(pdf_path)

            logger.debug(f"[{document_id}] Generated {len(raw_chunks)} chunks")
            logger.debug(f"[{document_id}] Found {len(valid_declarations)} formula declarations")
            return {
                "raw_chunks": raw_chunks,
                "formula_ref_map": formula_ref_map,
                "valid_declarations": valid_declarations,
            }

        except Exception as e:
            logger.error(f"[{document_id}] Chunking error: {e}", exc_info=True)
            return {"error": f"Chunking error: {e}"}

    async def save_raw_chunks(self, state: SingleDocumentState) -> dict:
        """Save raw chunks to staged directory."""
        if state.get("error") or not state.get("raw_chunks"):
            return {}

        staged_path = state["staged_path"]
        document_id = state["document_id"]
        raw_chunks = state["raw_chunks"]

        try:
            # Save to staged/documents/<doc_id>/chunks_raw/
            chunks_raw_dir = staged_path / "chunks_raw"
            await asyncio.to_thread(chunks_raw_dir.mkdir, parents=True, exist_ok=True)

            # Clear old files
            old_files = await asyncio.to_thread(lambda: list(chunks_raw_dir.glob("chunk_*.json")))
            for old_file in old_files:
                await asyncio.to_thread(old_file.unlink)

            # Save new chunks
            for i, chunk in enumerate(raw_chunks, start=1):
                output_file = chunks_raw_dir / f"chunk_{i:05d}.json"

                def save_json(fp=output_file, data=chunk):
                    with fp.open("w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)

                await asyncio.to_thread(save_json)

            logger.debug(f"[{document_id}] Saved {len(raw_chunks)} raw chunks")
            return {}

        except Exception as e:
            logger.error(f"[{document_id}] Error saving raw chunks: {e}")
            return {}  # Non-fatal

    async def prepare_for_embedding(self, state: SingleDocumentState) -> dict:
        """Prepare chunks for embedding."""
        if state.get("error"):
            return {}

        document_id = state["document_id"]
        pdf_path = state["pdf_path"]

        # Use raw chunks (no enhanced chunks anymore)
        chunks = state.get("raw_chunks", [])

        # Get formula data for bbox-based detection
        valid_declarations = state.get("valid_declarations")
        formula_ref_map = state.get("formula_ref_map")

        if not chunks:
            logger.warning(f"[{document_id}] No chunks to prepare for embedding")
            return {}

        try:
            logger.info(f"[{document_id}] Preparing {len(chunks)} chunks for embedding...")

            prepared = await asyncio.to_thread(
                self.chunker.prepare_for_embedding,
                chunks,
                str(pdf_path),
                valid_declarations,
                formula_ref_map,
            )

            logger.debug(f"[{document_id}] Prepared {len(prepared)} chunks")
            return {"chunked_documents": prepared}

        except Exception as e:
            logger.error(f"[{document_id}] Error preparing chunks: {e}")
            return {"error": f"Error preparing chunks: {e}"}

    async def save_prepared_chunks(self, state: SingleDocumentState) -> dict:
        """Save prepared chunks to staged directory."""
        if state.get("error") or not state.get("chunked_documents"):
            return {}

        document_id = state["document_id"]
        chunks = state["chunked_documents"]

        try:
            # Save to staged/documents/<doc_id>/chunks_prepared/
            chunks_prepared_dir = self.config.staged_documents_dir / document_id / "chunks_prepared"
            await asyncio.to_thread(chunks_prepared_dir.mkdir, parents=True, exist_ok=True)

            # Clear old files
            old_files = await asyncio.to_thread(
                lambda: list(chunks_prepared_dir.glob("chunk_*.json"))
            )
            for old_file in old_files:
                await asyncio.to_thread(old_file.unlink)

            # Save new chunks
            for i, chunk in enumerate(chunks, start=1):
                output_file = chunks_prepared_dir / f"chunk_{i:05d}.json"

                def save_json(fp=output_file, data=chunk):
                    with fp.open("w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)

                await asyncio.to_thread(save_json)

            logger.debug(
                f"[{document_id}] Saved {len(chunks)} prepared chunks to {chunks_prepared_dir}"
            )
            return {}

        except Exception as e:
            logger.error(f"[{document_id}] Error saving prepared chunks: {e}")
            return {}  # Non-fatal

    async def load_prepared_chunks(self, state: SingleDocumentState) -> dict:
        """Load pre-prepared chunks from staged directory."""
        if state.get("error"):
            return {}

        document_id = state["document_id"]

        try:
            # Load from staged/documents/<doc_id>/chunks_prepared/
            chunks_prepared_dir = self.config.staged_documents_dir / document_id / "chunks_prepared"

            exists = await asyncio.to_thread(chunks_prepared_dir.exists)
            if not exists:
                return {"error": f"Prepared chunks directory not found: {chunks_prepared_dir}"}

            chunk_files = await asyncio.to_thread(
                lambda: sorted(chunks_prepared_dir.glob("chunk_*.json"))
            )

            if not chunk_files:
                return {"error": f"No chunk files found in {chunks_prepared_dir}"}

            chunks = []
            for chunk_file in chunk_files:

                def load_json(fp=chunk_file):
                    with fp.open("r", encoding="utf-8") as f:
                        return json.load(f)

                chunk = await asyncio.to_thread(load_json)
                chunks.append(chunk)

            logger.debug(
                f"[{document_id}] Loaded {len(chunks)} prepared chunks from {chunks_prepared_dir}"
            )
            return {"chunked_documents": chunks}

        except Exception as e:
            logger.error(f"[{document_id}] Error loading chunks: {e}")
            return {"error": f"Error loading chunks: {e}"}

    async def embed_chunks(self, state: SingleDocumentState) -> dict:
        """Generate embeddings for prepared chunks."""
        if state.get("error") or not state.get("chunked_documents"):
            return {}

        document_id = state["document_id"]
        chunks = state["chunked_documents"]

        try:
            # Check memory pressure before embedding (loads models if not cached)
            self._check_memory_pressure(document_id, "embedding generation")

            logger.info(f"[{document_id}] Generating embeddings for {len(chunks)} chunks...")

            batch_size = self.config.embedding_batch_size
            embedded_documents = []
            total_batches = (len(chunks) + batch_size - 1) // batch_size

            # Get source_format from state (defaults to "pdf" for backward compatibility)
            source_format = state.get("source_format", "pdf")

            for i in range(0, len(chunks), batch_size):
                batch = chunks[i : i + batch_size]
                batch_texts = [chunk["embedding_input"] for chunk in batch]

                embeddings = await self.embedding_provider.embed_batch(batch_texts)

                batch_num = (i // batch_size) + 1
                logger.info(
                    f"[{document_id}] Embedded batch {batch_num}/{total_batches} "
                    f"({len(batch)} chunks)"
                )

                # Use strict=True to detect embedding count mismatches (e.g., partial OOM during batch)
                if len(embeddings) != len(batch):
                    logger.error(
                        f"[{document_id}] Embedding count mismatch: expected {len(batch)}, "
                        f"got {len(embeddings)}. This may indicate OOM during embedding."
                    )
                    return {
                        "error": f"Embedding count mismatch: expected {len(batch)}, got {len(embeddings)}"
                    }

                for chunk, embedding in zip(batch, embeddings, strict=True):
                    # Flatten metadata structure for Qdrant payload
                    # Text stored in "text" field (becomes document_chunk):
                    #   - display_text: markdown tables for human-readable display
                    #   - embedding_input: compact format (fallback if display_text not present)
                    # Embedding is generated from embedding_input (compact format)
                    content = chunk["content"]
                    embedded_doc = {
                        "text": chunk.get("display_text", chunk["embedding_input"]),
                        "embedding": embedding,
                        "metadata": {
                            "chunk_id": content["chunk_id"],
                            "heading": content.get("heading", ""),
                            "headings": content.get("headings", []),
                            "page_no": content.get("page_no"),
                            "token_count": content.get("token_count", 0),
                            "source": chunk["source"],
                            "source_format": source_format,
                            "source_name": chunk["document_name"],
                            "has_formula": content.get("has_formula", False),
                            "has_table": content.get("has_table", False),
                            "has_figure": content.get("has_figure", False),
                            "formulas_declaration": content.get("formulas_declaration", []),
                            "formulas_references": content.get("formulas_references", []),
                            "tables_declaration": content.get("tables_declaration", []),
                        },
                    }
                    embedded_documents.append(embedded_doc)

            logger.debug(f"[{document_id}] Generated {len(embedded_documents)} embeddings")
            return {"embedded_documents": embedded_documents}

        except Exception as e:
            logger.error(f"[{document_id}] Embedding error: {e}", exc_info=True)
            return {"error": f"Embedding error: {e}"}

    async def save_embedded_documents(self, state: SingleDocumentState) -> dict:
        """Save embedded documents to staged directory."""
        if state.get("error") or not state.get("embedded_documents"):
            return {}

        document_id = state["document_id"]
        staged_path = state["staged_path"]
        embedded_docs = state["embedded_documents"]

        try:
            # Save to staged/documents/<doc_id>/chunks_embedded/
            chunks_embedded_dir = staged_path / "chunks_embedded"
            await asyncio.to_thread(chunks_embedded_dir.mkdir, parents=True, exist_ok=True)

            # Clear old files
            old_files = await asyncio.to_thread(
                lambda: list(chunks_embedded_dir.glob("chunk_*.json"))
            )
            for old_file in old_files:
                await asyncio.to_thread(old_file.unlink)

            # Save new embedded documents
            for i, doc in enumerate(embedded_docs, start=1):
                output_file = chunks_embedded_dir / f"chunk_{i:05d}.json"

                def save_json(fp=output_file, data=doc):
                    with fp.open("w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)

                await asyncio.to_thread(save_json)

            logger.debug(
                f"[{document_id}] Saved {len(embedded_docs)} embedded documents to {chunks_embedded_dir}"
            )
            return {}

        except Exception as e:
            logger.error(f"[{document_id}] Error saving embedded documents: {e}")
            return {}  # Non-fatal

    async def upsert_to_qdrant(self, state: SingleDocumentState) -> dict:
        """Upsert embedded documents to Qdrant."""
        if state.get("error") or not state.get("embedded_documents"):
            return {}

        document_id = state["document_id"]
        embedded_docs = state["embedded_documents"]

        try:
            logger.info(f"[{document_id}] Upserting {len(embedded_docs)} vectors to Qdrant...")

            batch_size = self.config.vector_upsert_batch_size
            all_ids = []

            for i in range(0, len(embedded_docs), batch_size):
                batch = embedded_docs[i : i + batch_size]

                documents = [doc["text"] for doc in batch]
                embeddings = [doc["embedding"] for doc in batch]
                metadata = [doc["metadata"] for doc in batch]

                ids = await self.vector_store.add_pre_embedded_documents(
                    documents, embeddings, metadata=metadata
                )
                all_ids.extend(ids)

            logger.debug(f"[{document_id}] Upserted {len(all_ids)} vectors")
            return {"processed_count": len(all_ids)}

        except Exception as e:
            logger.error(f"[{document_id}] Upsert error: {e}", exc_info=True)
            return {"error": f"Upsert error: {e}"}

    def _check_memory_pressure(self, document_id: str, operation: str) -> None:
        """Check available system memory and warn if low before heavy operations.

        Logs a warning if less than 2GB of RAM is available, which may indicate
        imminent OOM conditions. This helps diagnose silent OOM kills in Docker.

        Args:
            document_id: Document identifier for log messages
            operation: Description of the upcoming operation (e.g., "model loading")
        """
        try:
            import psutil  # noqa: PLC0415

            mem = psutil.virtual_memory()
            available_gb = mem.available / 1e9
            process = psutil.Process()
            process_gb = process.memory_info().rss / 1e9

            # Log current state at debug level
            logger.debug(
                f"[{document_id}] Memory before {operation}: "
                f"process={process_gb:.2f}GB, available={available_gb:.2f}GB"
            )

            # Warn if available memory is critically low
            if available_gb < 2.0:
                logger.warning(
                    f"[{document_id}] LOW MEMORY before {operation}: "
                    f"only {available_gb:.2f}GB available. "
                    f"Process using {process_gb:.2f}GB. "
                    "OOM risk is high - consider reducing batch sizes or parallel files."
                )
        except ImportError:
            pass  # psutil not installed, skip check

    async def run(self, state: SingleDocumentState) -> SingleDocumentState:
        """Execute the pipeline for a single document."""
        document_id = state.get("document_id", "unknown")
        logger.debug(f"[{document_id}] Starting single document pipeline...")

        try:
            return await self.graph.ainvoke(state)

        except Exception as e:
            logger.error(f"[{document_id}] Pipeline execution failed: {e}", exc_info=True)
            state["error"] = f"Pipeline execution error: {e}"
            return state
