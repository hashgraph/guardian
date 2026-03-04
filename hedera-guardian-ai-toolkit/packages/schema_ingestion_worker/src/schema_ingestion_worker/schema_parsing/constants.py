"""
Constants used throughout the schemas ingestion package.

This module provides centralized constants for field names, configuration values,
and other magic strings used across the ingestion pipeline.
"""


# =============================================================================
# Document Field Names
# =============================================================================

# Core document fields used in vector store operations
FIELD_EMBEDDING_INPUT = "embedding_input"
"""Field containing the text to be embedded."""

FIELD_CONTENT = "content"
"""Field containing the document content/payload."""

FIELD_SOURCE = "source"
"""Field containing the source identifier/path."""

FIELD_METADATA = "metadata"
"""Field containing additional metadata."""

# Result/Response fields
FIELD_SCORE = "score"
"""Field containing similarity/distance score."""

FIELD_SUMMARY = "summary"
"""Field containing document summary."""

# =============================================================================
# Embedding Configuration
# =============================================================================

DEFAULT_EMBEDDING_MODEL = "BAAI/bge-m3"
"""Default SentenceTransformer model for embeddings."""

DEFAULT_EMBEDDING_DIMENSION = 1024
"""Default embedding dimension for BAAI/bge-m3 model."""

# =============================================================================
# Vector Store Configuration
# =============================================================================

DEFAULT_BATCH_SIZE = 50
"""Default batch size for processing documents."""

DEFAULT_SEARCH_LIMIT = 5
"""Default number of results to return from search."""

# =============================================================================
# Result Dictionary Keys
# =============================================================================

# Keys for add/index operation results
RESULT_INDEXED = "indexed"
"""Number of documents successfully indexed."""

RESULT_TOTAL_DOCS = "total_documents"
"""Total number of documents in the store."""

RESULT_DOC_RANGE = "new_document_range"
"""Range of newly added document indices."""

RESULT_NONE = "none"
"""Indicator for empty/no documents."""

# Keys for stats operation results
RESULT_DOCS_COUNT = "documents_count"
"""Total count of documents."""

RESULT_INDEX_READY = "index_ready"
"""Boolean indicating if index is ready for search."""

RESULT_MODEL_LOADED = "model_loaded"
"""Boolean indicating if embedding model is loaded."""

# =============================================================================
# Schema Parser Constants
# =============================================================================

# Properties to skip during schema parsing
SKIP_PROPERTIES: frozenset[str] = frozenset({"@context", "type"})
"""Set of property names to skip when parsing schemas."""

SCHEMA_CONTEXT_KEY = "@context"
"""JSON-LD context key in schemas."""

SCHEMA_TYPE_KEY = "type"
"""Type key in schemas."""

SCHEMA_REF_KEY = "$ref"
"""Reference key in JSON schemas."""

SCHEMA_ALLOF_KEY = "allOf"
"""allOf key for schema composition."""

SCHEMA_PROPERTIES_KEY = "properties"
"""Properties key in JSON schemas."""

# Special schema keywords
SCHEMA_IF_KEY = "if"
"""Conditional schema if key."""

SCHEMA_THEN_KEY = "then"
"""Conditional schema then key."""

SCHEMA_ELSE_KEY = "else"
"""Conditional schema else key."""

# =============================================================================
# Path and Separators
# =============================================================================

PATH_SEPARATOR = "."
"""Separator for property paths (e.g., 'user.profile.name')."""

ARRAY_ITEM_NOTATION = "[items]"
"""Notation for array items in property paths."""

# =============================================================================
# Schema Property Types
# =============================================================================

# JSON Schema types
TYPE_STRING = "string"
TYPE_NUMBER = "number"
TYPE_INTEGER = "integer"
TYPE_BOOLEAN = "boolean"
TYPE_OBJECT = "object"
TYPE_ARRAY = "array"
TYPE_NULL = "null"

# Additional type classifications
TYPE_UNKNOWN = "unknown"
"""Type used when property type cannot be determined."""

# =============================================================================
# File Operations
# =============================================================================

DEFAULT_OUTPUT_FILE = "extracted_properties.json"
"""Default filename for extracted property output."""

SCHEMA_FILE_EXTENSION = ".json"
"""Expected file extension for schema files."""
