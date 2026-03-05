"""Payload index definitions for the schema_properties Qdrant collection.

KEYWORD indexes enable exact-match filtering (MatchValue).
"""

from qdrant_client import models

SCHEMA_PROPERTY_INDEXES: list[tuple[str, models.PayloadSchemaType]] = [
    ("metadata.source", models.PayloadSchemaType.KEYWORD),
    ("metadata.methodology", models.PayloadSchemaType.KEYWORD),
    ("metadata.path_root", models.PayloadSchemaType.KEYWORD),
    ("metadata.name", models.PayloadSchemaType.KEYWORD),
]
