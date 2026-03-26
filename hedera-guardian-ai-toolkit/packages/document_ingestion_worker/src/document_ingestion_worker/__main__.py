"""Entry point for the document ingestion worker.

This module provides the main entry point for running the document ingestion
pipeline. It loads configuration from environment variables, initializes
logging, and executes the parallel PDF document processing pipeline.

Usage:
    python -m document_ingestion_worker

Environment Variables:
    See config.py for available configuration options.
    All settings can be configured via environment variables with
    the DOCUMENT_INGESTION_ prefix.

Example:
    export DOCUMENT_INGESTION_DATA_DIR=/path/to/data
    export DOCUMENT_INGESTION_QDRANT_URL=http://localhost:6333
    export DOCUMENT_INGESTION_QDRANT_COLLECTION_NAME=methodology_documents
    python -m document_ingestion_worker
"""

import asyncio
import sys
import traceback

from .config import DocumentIngestionSettings
from .parser import DocumentParser


def print_banner():
    """Print startup banner."""
    print("=" * 70)
    print("  Document Ingestion Worker")
    print("  Parallel LangGraph-based pipeline for PDF document processing")
    print("=" * 70)
    print()


def print_summary(stats: dict):
    """
    Print execution summary.

    Args:
        stats: Statistics dictionary from pipeline execution
    """
    print()
    print("=" * 70)
    print("  Execution Summary")
    print("=" * 70)
    print(f"  Batch ID:             {stats.get('batch_id', 'N/A')}")
    print(f"  Total documents:      {stats.get('total_documents', 0)}")
    print(f"  Successful:           {stats.get('successful_documents', 0)}")
    print(f"  Failed:               {stats.get('failed_documents', 0)}")
    print(f"  Total chunks:         {stats.get('total_chunks', 0)}")
    print(f"  Total vectors:        {stats.get('total_vectors', 0)}")
    print(f"  Processing time:      {stats.get('processing_time_seconds', 0):.1f}s")

    # Print per-document results if available
    document_results = stats.get("document_results", [])
    if document_results:
        print()
        print("  Document Results:")
        for result in document_results:
            status_icon = "OK" if result["status"] == "success" else "FAIL"
            print(
                f"    [{status_icon}] {result['document_id']}: "
                f"{result['chunks_generated']} chunks, "
                f"{result['vectors_upserted']} vectors, "
                f"{result['processing_time_seconds']:.1f}s"
            )
            if result.get("error"):
                print(f"         Error: {result['error']}")

    # Print failed files summary
    failed_count = stats.get("failed_documents", 0)
    if failed_count > 0:
        print()
        print("  Failed files:")
        for file_path, error in stats.get("failed_files", []):
            print(f"    - {file_path}: {error}")

    if "error" in stats:
        print()
        print(f"  ERROR: {stats['error']}")
        print("=" * 70)
        return False

    print("=" * 70)
    return True


async def main():
    """Main entry point for the application."""
    print_banner()

    try:
        # Load configuration from environment
        print("Loading configuration from environment...")
        config = DocumentIngestionSettings()

        print(f"  Data directory:       {config.data_dir}")
        print(f"  Input directory:      {config.input_documents_dir}")
        print(f"  Staged directory:     {config.staged_documents_dir}")
        print(f"  Qdrant URL:           {config.qdrant_url}")
        print(f"  Collection:           {config.qdrant_collection_name}")
        print(f"  Mode:                 {config.mode}")
        print(f"  Start from:           {config.start_from}")
        print(f"  Max parallel files:   {config.max_parallel_files}")
        print(f"  Embedding model:      {config.embedding_model_name}")
        print(f"  Embedding batch:      {config.embedding_batch_size}")
        print(f"  Upsert batch:         {config.vector_upsert_batch_size}")
        print(f"  Chunk max tokens:     {config.chunk_max_tokens}")
        print(f"  Chunk overlap:        {config.chunk_overlap_tokens}")
        print(f"  PDF backend:          {config.pdf_backend}")
        print(f"  OCR enabled:          {config.do_ocr}")
        print(f"  Table structure:      {config.table_structure_mode}")
        print(f"  Layout model:         {config.layout_model}")
        print(f"  Formula enrichment:   {config.do_formula_enrichment}")
        print(f"  Accelerator device:   {config.accelerator_device}")
        print(f"  Num threads:          {config.num_threads}")
        ocr_batch, layout_batch, table_batch = config.get_effective_batch_sizes()
        print(f"  OCR batch size:       {ocr_batch}")
        print(f"  Layout batch size:    {layout_batch}")
        print(f"  Table batch size:     {table_batch}")
        print(f"  Log level:            {config.log_level}")
        print()

        # Create input directory if it doesn't exist (with helpful message)
        input_dir = config.input_documents_dir
        if not input_dir.exists():
            print(f"Input directory does not exist: {input_dir}")
            print("Creating directory structure...")
            input_dir.mkdir(parents=True, exist_ok=True)
            print(f"Created: {input_dir}")
            print("Please add PDF files to this directory and run again.")
            return 0

        # Initialize parser
        print("Initializing document parser...")
        parser = DocumentParser(config)
        print()

        # Process documents
        print("Starting parallel document processing...")
        stats = await parser.process_documents()

        # Print summary
        success = print_summary(stats)

        # Get and print vector store stats
        if success:
            print()
            print("Querying vector store statistics...")
            vs_stats = await parser.get_pipeline_stats()
            if "error" not in vs_stats:
                print(f"  Total vectors in collection: {vs_stats.get('points_count', 0)}")
                print(f"  Collection status:           {vs_stats.get('status', 'unknown')}")
            else:
                print(f"  Could not retrieve stats: {vs_stats['error']}")

        # Close resources
        await parser.close()

        print()
        return 0 if success else 1

    except KeyboardInterrupt:
        print()
        print("Interrupted by user")
        return 130

    except Exception as e:
        print()
        print("=" * 70)
        print("  FATAL ERROR")
        print("=" * 70)
        print(f"  {e}")
        print("=" * 70)
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
