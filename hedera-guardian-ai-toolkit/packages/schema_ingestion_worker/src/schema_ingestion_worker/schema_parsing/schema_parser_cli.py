#!/usr/bin/env python3
"""
JSON Schema Parser - CLI Interface

Command-line interface for the schema parser.
Provides human-readable output and statistics for schema analysis.

Usage:
    python schema_parser_cli.py <schemas_directory> [output_file]

Examples:
    python schema_parser_cli.py schemas output.json
    python schema_parser_cli.py ./schemas parsed_properties.json
"""

import json
import os
import sys
from typing import Any

from .schema_parser import load_schema_file, parse_schemas_from_directory


def print_schema_analysis(stats: dict[str, Any], schema_dir: str) -> None:
    """
    Print schema categorization analysis.

    Args:
        stats: Statistics dictionary from parse_schemas_from_directory
        schema_dir: Path to schema directory (for loading schema names)
    """
    print(f"\n{'=' * 60}")
    print("SCHEMA ANALYSIS")
    print(f"{'=' * 60}")
    print(f"Total schemas found: {stats['total_schema_count']}")
    print(f"Root schemas (to be processed): {stats['root_schema_count']}")
    print(f"Referenced schemas (expanded inline): {stats['referenced_schema_count']}")
    print("\nDetection method: Metadata 'defs' array analysis")
    print("  - Root schemas: UUIDs NOT listed in any 'defs' array")
    print("  - Referenced schemas: UUIDs listed in other schemas' 'defs'")

    root_schemas = stats.get("root_schemas", set())
    if root_schemas:
        print("\nRoot schema files:")
        for fname in sorted(root_schemas):
            # Try to load and show schema name
            path = os.path.join(schema_dir, fname)
            data = load_schema_file(path)
            schema_name = data.get("name", "Unknown") if data else "Unknown"
            print(f"  - {fname} ({schema_name})")

    if stats["referenced_schema_count"] > 0:
        print("\nReferenced schema files (will be expanded inline):")
        print(f"  Total: {stats['referenced_schema_count']} schemas")

    print(f"{'=' * 60}\n")


def print_extraction_statistics(stats: dict[str, Any]) -> None:
    """
    Print extraction statistics.

    Args:
        stats: Statistics dictionary from parse_schemas_from_directory
    """
    print(f"\n{'=' * 60}")
    print("EXTRACTION STATISTICS")
    print(f"{'=' * 60}")
    print(f"Total $ref GUIDs cached: {stats['cached_refs']}")
    print(f"Unique properties extracted: {stats['unique_properties']}")

    if stats.get("total_cached_properties", 0) > 0:
        print(
            f"Total properties cached in {stats['cached_refs']} $refs: {stats['total_cached_properties']}"
        )
        print(f"Average properties per $ref: {stats['avg_properties_per_ref']:.1f}")

    print(f"{'=' * 60}\n")


def main():
    """Main entry point for CLI."""
    if len(sys.argv) < 2:
        print("Usage: python schema_parser_cli.py <schemas_directory> [output_file]")
        print("\nExamples:")
        print("  python schema_parser_cli.py schemas output.json")
        print("  python schema_parser_cli.py ./schemas parsed_properties.json")
        return

    schema_dir = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "parsed_properties.json"

    # Validate schema directory
    if not os.path.isdir(schema_dir):
        print(f"Error: {schema_dir} is not a valid directory")
        return

    try:
        # Parse schemas using refactored function
        prepared, stats = parse_schemas_from_directory(schema_dir, return_stats=True, verbose=True)

        # Print analysis
        print_schema_analysis(stats, schema_dir)

        # Print statistics
        print_extraction_statistics(stats)

        # Write output
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(prepared, f, indent=2, ensure_ascii=False)
        print(f"Results written to {output_file}")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
