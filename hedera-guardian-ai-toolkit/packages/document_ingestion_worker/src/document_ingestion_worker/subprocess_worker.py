"""
Child process entry point for isolated document processing.

This module provides the subprocess worker that runs SingleDocumentPipeline
in complete isolation from the parent orchestrator process. This architecture
guarantees that all memory (CPU and GPU) is returned to the OS after each
document, solving Python's memory fragmentation issue.

Best practices applied:
- Entry point guard (if __name__ == "__main__") for Windows/macOS spawn safety
- Deferred imports (inside main/process_document) for faster startup
- Atomic response file write (temp file + replace)
- Consistent cleanup with _safe_cleanup
- CUDA initialization check (diagnostic warning)

Usage:
    python -m document_ingestion_worker.subprocess_worker <request_file>

The subprocess reads a JSON request file containing:
- document_id: Unique identifier for the document
- document_path: Absolute path to the source document (PDF/DOCX)
- staged_path: Absolute path to the document's staging directory
- source_format: Document format ("pdf" or "docx")
- start_from: Pipeline start point ("beginning", "parsed", "chunked")
- config_json: JSON-serialized DocumentIngestionSettings

The subprocess writes a JSON response file (request_file.with_suffix(".response.json"))
containing processing results or error information.
"""

import asyncio
import contextlib
import gc
import json
import logging
import os
import sys
import time
from pathlib import Path

logger = logging.getLogger(__name__)


def _safe_cleanup(resource, name: str, document_id: str) -> None:
    """Safely cleanup a resource with error logging.

    Args:
        resource: Object with a cleanup() method, or None
        name: Human-readable name for logging (e.g., "PDF parser")
        document_id: Document identifier for log messages
    """
    if resource is not None:
        try:
            resource.cleanup()
        except Exception as e:
            # Log at ERROR level - cleanup failures can cause memory leaks that
            # accumulate across documents, eventually causing OOM.
            # On Windows, GPU memory cleanup is particularly prone to failures.
            logger.error(
                f"[{document_id}] {name} cleanup failed: {e}. Memory may not be fully released."
            )


def main() -> None:
    """
    Main entry point with Windows/macOS spawn protection.

    This function:
    1. Validates command-line arguments
    2. Configures logging to stderr
    3. Runs the async document processing
    4. Exits with appropriate code (0=success, 1=failure, 2=usage error)
    """
    if len(sys.argv) != 2:
        print(
            "Usage: python -m document_ingestion_worker.subprocess_worker <request_file>",
            file=sys.stderr,
        )
        sys.exit(2)

    # Logging goes to stderr so parent can stream it in real-time
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - [SUBPROCESS] %(name)s - %(levelname)s - %(message)s",
        stream=sys.stderr,
    )

    request_file = Path(sys.argv[1])

    try:
        exit_code = asyncio.run(process_document(request_file))
        sys.exit(exit_code)
    except Exception as e:
        logger.error(f"Fatal error in subprocess: {e}", exc_info=True)
        sys.exit(1)


async def process_document(request_file: Path) -> int:
    """
    Process a single document with full resource isolation.

    This function creates ALL resources fresh in this subprocess:
    - Embedding provider (ONNX session)
    - Vector store connector (HTTP client)
    - PDF parser (Docling + Surya models)
    - DOCX parser
    - Chunker (HybridChunker)

    When the subprocess exits, all memory is guaranteed to be returned to
    the OS, preventing the memory accumulation that occurs in long-running
    Python processes.

    Args:
        request_file: Path to JSON file containing SubprocessRequest data

    Returns:
        Exit code: 0 for success, 1 for failure
    """
    # Deferred imports: heavy ML models must not load at module level
    from document_ingestion_worker.document_parsing.docx_to_docling_parser import DocxParser
    from vector_store import QdrantConnector, create_embedding_provider

    from .config import DocumentIngestionSettings
    from .models import SubprocessResponse, create_single_document_state
    from .single_document_pipeline import (
        SingleDocumentPipeline,
        create_chunker,
        create_pdf_parser,
    )

    # ---------------------------------------------------------------------------
    # Read request and initialize
    # ---------------------------------------------------------------------------
    request_data = json.loads(request_file.read_text())
    document_id = request_data["document_id"]
    response_file = request_file.with_suffix(".response.json")

    logger.info(f"[{document_id}] Starting subprocess processing")
    start_time = time.time()

    # Resource references for cleanup in finally block
    pdf_parser = None
    docx_parser = None
    chunker = None
    embedding_provider = None
    vector_store = None
    response: SubprocessResponse | None = None

    try:
        # CUDA pre-initialization diagnostic
        try:
            import torch

            if torch.cuda.is_initialized():
                logger.warning(
                    f"[{document_id}] CUDA was pre-initialized before model loading - "
                    "GPU memory may not be properly isolated"
                )
        except ImportError:
            pass

        config = DocumentIngestionSettings.model_validate_json(request_data["config_json"])

        # qdrant_api_key is excluded from config_json for security (avoid
        # writing credentials to IPC files on disk). Resolve it from the
        # inherited environment variable instead.
        api_key_from_env = os.environ.get("DOCUMENT_INGESTION_QDRANT_API_KEY")
        if api_key_from_env and not config.qdrant_api_key:
            config = config.model_copy(update={"qdrant_api_key": api_key_from_env})

        # -----------------------------------------------------------------------
        # Create all resources fresh in this process (memory isolation)
        # -----------------------------------------------------------------------
        logger.info(f"[{document_id}] Creating embedding provider...")
        embedding_provider = create_embedding_provider(
            provider_type=config.embedding_provider_type,
            model_name=config.embedding_model_name,
        )

        logger.info(f"[{document_id}] Creating Qdrant connector...")
        vector_store = QdrantConnector(
            url=config.qdrant_url,
            collection_name=config.qdrant_collection_name,
            embedding_provider=embedding_provider,
            api_key=config.qdrant_api_key,
        )

        logger.info(f"[{document_id}] Creating document parsers...")
        pdf_parser = create_pdf_parser(config)
        docx_parser = DocxParser()
        chunker = create_chunker(config)

        # -----------------------------------------------------------------------
        # Run pipeline
        # -----------------------------------------------------------------------
        state = create_single_document_state(
            pdf_path=Path(request_data["document_path"]),
            staged_path=Path(request_data["staged_path"]),
            start_from=request_data["start_from"],
            source_format=request_data["source_format"],
        )

        logger.info(f"[{document_id}] Running SingleDocumentPipeline...")
        pipeline = SingleDocumentPipeline(
            config=config,
            pdf_parser=pdf_parser,
            docx_parser=docx_parser,
            chunker=chunker,
            embedding_provider=embedding_provider,
            vector_store=vector_store,
        )

        final_state = await pipeline.run(state)

        # Log formula enrichment stats if available
        formula_stats = None
        if pdf_parser is not None:
            formula_stats = pdf_parser.get_formula_stats()
            if formula_stats:
                logger.info(
                    f"[{document_id}] Formula stats: "
                    f"{formula_stats['enriched']}/{formula_stats['total']} enriched, "
                    f"{formula_stats['skipped']} skipped, "
                    f"{formula_stats['failed_oom']} failed (OOM)"
                )

        if final_state.get("error"):
            response = SubprocessResponse(
                status="failed",
                document_id=document_id,
                chunks_generated=len(final_state.get("chunked_documents", [])),
                vectors_upserted=0,
                error_type="Exception",
                error_message=final_state["error"],
            )
        else:
            response = SubprocessResponse(
                status="success",
                document_id=document_id,
                chunks_generated=len(final_state.get("chunked_documents", [])),
                vectors_upserted=final_state.get("processed_count", 0),
            )
            logger.info(
                f"[{document_id}] Successfully processed: "
                f"{response['chunks_generated']} chunks, "
                f"{response['vectors_upserted']} vectors"
            )

    except MemoryError as e:
        logger.error(f"[{document_id}] OOM error: {e}")
        response = SubprocessResponse(
            status="failed",
            document_id=document_id,
            chunks_generated=0,
            vectors_upserted=0,
            error_type="OOM",
            error_message=str(e),
        )

    except Exception as e:
        logger.error(f"[{document_id}] Processing error: {e}", exc_info=True)
        response = SubprocessResponse(
            status="failed",
            document_id=document_id,
            chunks_generated=0,
            vectors_upserted=0,
            error_type="Exception",
            error_message=str(e),
        )

    finally:
        # -----------------------------------------------------------------------
        # Cleanup and response writing
        # -----------------------------------------------------------------------
        elapsed = time.time() - start_time
        if response:
            response["processing_time_seconds"] = elapsed

        logger.info(f"[{document_id}] Cleaning up resources...")
        _safe_cleanup(pdf_parser, "PDF parser", document_id)
        _safe_cleanup(docx_parser, "DOCX parser", document_id)
        _safe_cleanup(chunker, "Chunker", document_id)
        _safe_cleanup(embedding_provider, "Embedding provider", document_id)

        if vector_store:
            try:
                await vector_store.close()
            except Exception as e:
                logger.error(f"[{document_id}] Vector store cleanup failed: {e}")

        # Multi-cycle GC for thorough cleanup before process exit
        for i in range(3):
            collected = gc.collect()
            if collected == 0:
                break
            logger.debug(f"[{document_id}] gc.collect() cycle {i + 1}: {collected} objects")

        try:
            import torch

            if torch.cuda.is_available():
                torch.cuda.synchronize()
                torch.cuda.empty_cache()
                logger.debug(f"[{document_id}] GPU cache cleared")
        except ImportError:
            pass

        # Atomic write: temp file + rename
        if response:
            temp_file = response_file.with_suffix(".tmp")
            try:
                temp_file.write_text(json.dumps(response, indent=2))
                temp_file.replace(response_file)
            except Exception as e:
                logger.error(f"[{document_id}] Failed to write response file: {e}")
                with contextlib.suppress(OSError):
                    temp_file.unlink(missing_ok=True)

        logger.info(f"[{document_id}] Subprocess completed in {elapsed:.1f}s")

    return 0 if response and response["status"] == "success" else 1


# Entry point guard -- required for Windows/macOS spawn safety
if __name__ == "__main__":
    main()
