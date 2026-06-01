"""Entry point for the schema ingestion worker.

This module provides the main entry point for running the schema ingestion
pipeline. It loads configuration from environment variables, initializes
logging, and executes the data processing pipelines.

Usage:
    python -m schema_ingestion_worker

Environment Variables:
    See config.py for available configuration options.
    All settings can be configured via environment variables with
    the SCHEMA_INGESTION_ prefix.

Example:
    export SCHEMA_INGESTION_QDRANT_URL=http://localhost:6333
    export SCHEMA_INGESTION_QDRANT_COLLECTION_NAME=my_schemas
    export SCHEMA_INGESTION_INPUT_SCHEMAS_DIR=/path/to/schemas
    python -m schema_ingestion_worker
"""

import asyncio
import sys
from pathlib import Path

from .config import Settings
from .parser import DocumentParser


def print_banner():
    """Print startup banner."""
    print("=" * 70)
    print("  Schema Ingestion Worker")
    print("  Property-batched async pipeline for JSON schema processing")
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
    print(f"  Batch ID:            {stats.get('batch_id', 'N/A')}")
    print(f"  Schema files found:  {stats.get('total_files', 0)}")

    # Show batching stats if available
    if "total_batches" in stats:
        print(f"  Total batches:       {stats.get('total_batches', 0)}")
        print(f"  Batches completed:   {stats.get('batches_completed', 0)}")
        print(f"  Batches failed:      {stats.get('batches_failed', 0)}")

    print(f"  Properties parsed:   {stats.get('parsed_count', 0)}")
    print(f"  Embeddings created:  {stats.get('embedded_count', 0)}")
    print(f"  Vectors stored:      {stats.get('processed_count', 0)}")
    print(f"  Failed files:        {stats.get('failed_count', 0)}")

    if stats.get("failed_count", 0) > 0:
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
        config = Settings()

        print(f"  Input directory:     {config.input_schemas_dir}")
        print(f"  Output directory:    {config.output_dir}")
        print(f"  Qdrant URL:          {config.qdrant_url}")
        print(f"  Collection:          {config.qdrant_collection_name}")
        print(f"  Mode:                {config.mode}")
        print(f"  Embedding model:     {config.embedding_model_name}")
        print(f"  Property batch size: {config.embedding_batch_size}")
        print(f"  Upsert batch:        {config.vector_upsert_batch_size}")
        print(f"  Embedding timeout:   {config.embedding_timeout}s")
        print(f"  Upsert timeout:      {config.upsert_timeout}s")
        print(f"  Log level:           {config.log_level}")
        print()

        # Verify input directory exists
        input_dir = Path(config.input_schemas_dir)
        if not input_dir.exists():
            print(f"ERROR: Input directory does not exist: {input_dir}")
            print("Please create the directory and add JSON schema files.")
            return 1

        # Initialize parser
        print("Initializing document parser...")
        parser = DocumentParser(config)
        print()

        try:
            # Process documents
            print("Starting document processing...")
            stats = await parser.process_documents()

            # Print summary
            success = print_summary(stats)

            # Get and print vector store stats
            if success:
                print()
                print("Querying vector store statistics...")
                vs_stats = await parser.get_pipeline_stats()
                if "error" not in vs_stats:
                    print(f"  Total vectors in collection: {vs_stats.get('count', 0)}")
                    print(f"  Vector dimension:            {vs_stats.get('dimension', 0)}")
                    print(f"  Collection status:           {vs_stats.get('status', 'unknown')}")
                else:
                    print(f"  Could not retrieve stats: {vs_stats['error']}")

            print()
            return 0 if success else 1
        finally:
            await parser.close()

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
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
