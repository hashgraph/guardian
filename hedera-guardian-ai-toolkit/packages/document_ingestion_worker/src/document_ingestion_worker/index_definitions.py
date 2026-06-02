"""Payload index definitions for the methodology_documents Qdrant collection.

KEYWORD indexes enable exact-match filtering (MatchValue);
INTEGER indexes enable both exact-match and range filtering;
BOOL indexes enable boolean filtering.
"""

from qdrant_client import models

METHODOLOGY_DOCUMENT_INDEXES: list[tuple[str, models.PayloadSchemaType]] = [
    ("metadata.source_name", models.PayloadSchemaType.KEYWORD),
    ("metadata.source", models.PayloadSchemaType.KEYWORD),
    ("metadata.source_format", models.PayloadSchemaType.KEYWORD),
    ("metadata.heading", models.PayloadSchemaType.KEYWORD),
    ("metadata.headings", models.PayloadSchemaType.KEYWORD),
    ("metadata.page_no", models.PayloadSchemaType.INTEGER),
    ("metadata.chunk_id", models.PayloadSchemaType.INTEGER),
    ("metadata.has_formula", models.PayloadSchemaType.BOOL),
    ("metadata.has_table", models.PayloadSchemaType.BOOL),
]
