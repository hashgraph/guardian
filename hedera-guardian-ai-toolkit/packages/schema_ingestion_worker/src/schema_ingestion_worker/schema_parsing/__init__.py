"""
JSON Schema Ingestion Module

This module provides functionality for parsing JSON schemas.
"""

from . import constants
from .schema_parser import load_schema_file, parse_schemas_from_directory

__all__ = ["constants", "load_schema_file", "parse_schemas_from_directory"]
