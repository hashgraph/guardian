import pytest
from fastmcp import Client
from fastmcp.client.transports import FastMCPTransport
from inline_snapshot import snapshot


@pytest.mark.asyncio
async def test_initialization(mock_mcp_client: Client[FastMCPTransport]):
    assert mock_mcp_client.initialize_result.model_dump() == snapshot(
        {
            "meta": None,
            "protocolVersion": "2025-11-25",
            "capabilities": {
                "experimental": {},
                "logging": None,
                "prompts": {"listChanged": True},
                "resources": {"subscribe": False, "listChanged": True},
                "tools": {"listChanged": True},
                "completions": None,
                "tasks": {
                    "list": {},
                    "cancel": {},
                    "requests": {
                        "tools": {"call": {}},
                        "prompts": {"get": {}},
                        "resources": {"read": {}},
                    },
                },
            },
            "serverInfo": {
                "name": "Hedera Guardian MCP Server",
                "title": None,
                "version": "2.14.5",
                "websiteUrl": None,
                "icons": None,
            },
            "instructions": """\
Hedera Guardian MCP Server — semantic search over methodology documents and JSON schema properties.

## Search Tools (in order of typical usage)

- methodology_documents_search — methodology document content (primary)
- schema_properties_search — JSON schema property definitions

## Targeted Search Workflow

When the user asks about a SPECIFIC methodology, document, or schema source:

Step 1 — Discover field schema (once per session):
  Call the relevant *_get_index_status tool.

Step 2 — Discover exact filter values (once per target):
  Search with query=<document name>, no filter, limit=3.
  Copy the EXACT metadata value from results (e.g. metadata.source_name).
  Do NOT guess values. Do NOT answer the user from discovery results.

Step 3 — Filtered search:
  Search with query=<user's actual topic>, filter from Steps 1+2, limit=5-10.
  If results are sparse, broaden the query or increase limit.
  Never drop the filter to get more results.

For general questions (no specific source): use semantic search only, skip this workflow.

For methodology-related questions, prefer methodology_documents_search unless the user explicitly asks about JSON schema properties.\
""",
        }
    )


@pytest.mark.asyncio
async def test_list_tools(mock_mcp_client: Client[FastMCPTransport]):
    list_tools = await mock_mcp_client.list_tools()

    # Convert to dict/JSON for comparison
    list_tools_data = [tool.model_dump() for tool in list_tools]

    assert list_tools_data == snapshot(
        [
            {
                "name": "methodology_documents_search",
                "title": None,
                "description": "Search methodology documents using semantic search and/or metadata filters. This is the PRIMARY search tool for methodology-related questions. To target a specific methodology, use a metadata filter (not the query) — first discover exact filter values by searching for the methodology name with no filter.",
                "inputSchema": {
                    "$defs": {
                        "DatetimeRange": {
                            "description": "Range filter request",
                            "properties": {
                                "lt": {
                                    "anyOf": [
                                        {"format": "date-time", "type": "string"},
                                        {"format": "date", "type": "string"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "point.key &lt; range.lt",
                                },
                                "gt": {
                                    "anyOf": [
                                        {"format": "date-time", "type": "string"},
                                        {"format": "date", "type": "string"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "point.key &gt; range.gt",
                                },
                                "gte": {
                                    "anyOf": [
                                        {"format": "date-time", "type": "string"},
                                        {"format": "date", "type": "string"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "point.key &gt;= range.gte",
                                },
                                "lte": {
                                    "anyOf": [
                                        {"format": "date-time", "type": "string"},
                                        {"format": "date", "type": "string"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "point.key &lt;= range.lte",
                                },
                            },
                            "type": "object",
                        },
                        "FieldCondition": {
                            "properties": {
                                "key": {"description": "Payload key", "type": "string"},
                                "match": {
                                    "anyOf": [
                                        {"$ref": "#/$defs/MatchValue"},
                                        {"$ref": "#/$defs/MatchText"},
                                        {"$ref": "#/$defs/MatchTextAny"},
                                        {"$ref": "#/$defs/MatchPhrase"},
                                        {"$ref": "#/$defs/MatchAny"},
                                        {"$ref": "#/$defs/MatchExcept"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "Check if point has field with a given value",
                                },
                                "range": {
                                    "anyOf": [
                                        {"$ref": "#/$defs/Range"},
                                        {"$ref": "#/$defs/DatetimeRange"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "Check if points value lies in a given range",
                                },
                            },
                            "required": ["key"],
                            "type": "object",
                        },
                        "IsEmptyCondition": {
                            "description": "Select points with empty payload for a specified field",
                            "properties": {
                                "is_empty": {
                                    "$ref": "#/$defs/PayloadField",
                                    "description": "Select points with empty payload for a specified field",
                                }
                            },
                            "required": ["is_empty"],
                            "type": "object",
                        },
                        "IsNullCondition": {
                            "description": "Select points with null payload for a specified field",
                            "properties": {
                                "is_null": {
                                    "$ref": "#/$defs/PayloadField",
                                    "description": "Select points with null payload for a specified field",
                                }
                            },
                            "required": ["is_null"],
                            "type": "object",
                        },
                        "MatchAny": {
                            "description": "Exact match on any of the given values",
                            "properties": {
                                "any": {
                                    "anyOf": [
                                        {"items": {"type": "string"}, "type": "array"},
                                        {"items": {"type": "integer"}, "type": "array"},
                                    ],
                                    "description": "Exact match on any of the given values",
                                }
                            },
                            "required": ["any"],
                            "type": "object",
                        },
                        "MatchExcept": {
                            "description": "Should have at least one value not matching the any given values",
                            "properties": {
                                "except": {
                                    "anyOf": [
                                        {"items": {"type": "string"}, "type": "array"},
                                        {"items": {"type": "integer"}, "type": "array"},
                                    ],
                                    "description": "Should have at least one value not matching the any given values",
                                }
                            },
                            "required": ["except"],
                            "type": "object",
                        },
                        "MatchPhrase": {
                            "description": "Full-text phrase match of the string.",
                            "properties": {
                                "phrase": {
                                    "description": "Full-text phrase match of the string.",
                                    "type": "string",
                                }
                            },
                            "required": ["phrase"],
                            "type": "object",
                        },
                        "MatchText": {
                            "description": "Full-text match of the strings.",
                            "properties": {
                                "text": {
                                    "description": "Full-text match of the strings.",
                                    "type": "string",
                                }
                            },
                            "required": ["text"],
                            "type": "object",
                        },
                        "MatchTextAny": {
                            "description": "Full-text match of at least one token of the string.",
                            "properties": {
                                "text_any": {
                                    "description": "Full-text match of at least one token of the string.",
                                    "type": "string",
                                }
                            },
                            "required": ["text_any"],
                            "type": "object",
                        },
                        "MatchValue": {
                            "description": "Exact match of the given value",
                            "properties": {
                                "value": {
                                    "anyOf": [
                                        {"type": "boolean"},
                                        {"type": "integer"},
                                        {"type": "string"},
                                    ],
                                    "description": "Exact match of the given value",
                                }
                            },
                            "required": ["value"],
                            "type": "object",
                        },
                        "PayloadField": {
                            "description": "Payload field",
                            "properties": {
                                "key": {"description": "Payload field name", "type": "string"}
                            },
                            "required": ["key"],
                            "type": "object",
                        },
                        "Range": {
                            "description": "Range filter request",
                            "properties": {
                                "lt": {
                                    "anyOf": [{"type": "number"}, {"type": "null"}],
                                    "default": None,
                                    "description": "point.key &lt; range.lt",
                                },
                                "gt": {
                                    "anyOf": [{"type": "number"}, {"type": "null"}],
                                    "default": None,
                                    "description": "point.key &gt; range.gt",
                                },
                                "gte": {
                                    "anyOf": [{"type": "number"}, {"type": "null"}],
                                    "default": None,
                                    "description": "point.key &gt;= range.gte",
                                },
                                "lte": {
                                    "anyOf": [{"type": "number"}, {"type": "null"}],
                                    "default": None,
                                    "description": "point.key &lt;= range.lte",
                                },
                            },
                            "type": "object",
                        },
                        "SearchFilter": {
                            "properties": {
                                "should": {
                                    "anyOf": [
                                        {
                                            "items": {
                                                "anyOf": [
                                                    {"$ref": "#/$defs/FieldCondition"},
                                                    {"$ref": "#/$defs/IsEmptyCondition"},
                                                    {"$ref": "#/$defs/IsNullCondition"},
                                                ]
                                            },
                                            "type": "array",
                                        },
                                        {"$ref": "#/$defs/FieldCondition"},
                                        {"$ref": "#/$defs/IsEmptyCondition"},
                                        {"$ref": "#/$defs/IsNullCondition"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "At least one of those conditions should match",
                                },
                                "must": {
                                    "anyOf": [
                                        {
                                            "items": {
                                                "anyOf": [
                                                    {"$ref": "#/$defs/FieldCondition"},
                                                    {"$ref": "#/$defs/IsEmptyCondition"},
                                                    {"$ref": "#/$defs/IsNullCondition"},
                                                ]
                                            },
                                            "type": "array",
                                        },
                                        {"$ref": "#/$defs/FieldCondition"},
                                        {"$ref": "#/$defs/IsEmptyCondition"},
                                        {"$ref": "#/$defs/IsNullCondition"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "All conditions must match",
                                },
                                "must_not": {
                                    "anyOf": [
                                        {
                                            "items": {
                                                "anyOf": [
                                                    {"$ref": "#/$defs/FieldCondition"},
                                                    {"$ref": "#/$defs/IsEmptyCondition"},
                                                    {"$ref": "#/$defs/IsNullCondition"},
                                                ]
                                            },
                                            "type": "array",
                                        },
                                        {"$ref": "#/$defs/FieldCondition"},
                                        {"$ref": "#/$defs/IsEmptyCondition"},
                                        {"$ref": "#/$defs/IsNullCondition"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "All conditions must NOT match",
                                },
                            },
                            "type": "object",
                        },
                    },
                    "properties": {
                        "query": {
                            "anyOf": [{"type": "string"}, {"type": "null"}],
                            "default": None,
                            "description": "Semantic topic query (e.g., 'baseline emission calculation'). Put the TOPIC here, not the methodology/document name — use a metadata filter to target a specific source. If omitted, the search relies entirely on filters.",
                        },
                        "filter": {
                            "anyOf": [{"$ref": "#/$defs/SearchFilter"}, {"type": "null"}],
                            "default": None,
                            "description": """\
Optional metadata filters. Use to narrow results to a specific source/document.

PREREQUISITE: Call methodology_documents_get_index_status FIRST to discover available field keys, types, and match operators.

Filter values must be EXACT (copied from actual search results, not guessed). If results are empty, the filter value is likely wrong — re-run value discovery. Never drop a filter to get more results; broaden the query instead.

Type-to-operator quick reference:
- keyword -> match.value (exact string)
- integer -> match.value or range
- text -> match.text (full-text)
- float/datetime -> range (gt/gte/lt/lte)\
""",
                        },
                        "limit": {
                            "default": 5,
                            "description": "Maximum number of results to return.",
                            "type": "integer",
                        },
                        "offset": {
                            "anyOf": [{"type": "integer"}, {"type": "null"}],
                            "default": None,
                            "description": "Number of results to skip for pagination.",
                        },
                    },
                    "type": "object",
                },
                "outputSchema": {
                    "$defs": {
                        "MethodologyDocumentMetadata": {
                            "properties": {
                                "chunk_id": {"type": "integer"},
                                "heading": {"type": "string"},
                                "headings": {"items": {"type": "string"}, "type": "array"},
                                "page_no": {
                                    "anyOf": [{"type": "integer"}, {"type": "null"}],
                                    "default": None,
                                },
                                "token_count": {"type": "integer"},
                                "source": {"type": "string"},
                                "source_format": {"type": "string"},
                                "source_name": {"type": "string"},
                                "has_formula": {"default": False, "type": "boolean"},
                                "has_table": {"default": False, "type": "boolean"},
                                "has_figure": {"default": False, "type": "boolean"},
                                "formulas_declaration": {
                                    "items": {"type": "string"},
                                    "type": "array",
                                },
                                "formulas_references": {
                                    "items": {"type": "string"},
                                    "type": "array",
                                },
                                "tables_declaration": {
                                    "items": {"type": "string"},
                                    "type": "array",
                                },
                            },
                            "required": [
                                "chunk_id",
                                "heading",
                                "headings",
                                "token_count",
                                "source",
                                "source_format",
                                "source_name",
                            ],
                            "type": "object",
                        },
                        "MethodologyDocumentSearchResult": {
                            "properties": {
                                "content": {
                                    "description": "The text content of the matched document chunk",
                                    "type": "string",
                                },
                                "score": {
                                    "anyOf": [{"type": "number"}, {"type": "null"}],
                                    "default": None,
                                    "description": "Similarity score from the search",
                                },
                                "metadata": {"$ref": "#/$defs/MethodologyDocumentMetadata"},
                            },
                            "required": ["content", "metadata"],
                            "type": "object",
                        },
                    },
                    "properties": {
                        "result": {
                            "items": {"$ref": "#/$defs/MethodologyDocumentSearchResult"},
                            "type": "array",
                        }
                    },
                    "required": ["result"],
                    "type": "object",
                    "x-fastmcp-wrap-result": True,
                },
                "icons": None,
                "annotations": {
                    "title": None,
                    "readOnlyHint": True,
                    "destructiveHint": False,
                    "idempotentHint": True,
                    "openWorldHint": False,
                },
                "meta": {"_fastmcp": {"tags": []}},
                "execution": None,
            },
            {
                "name": "methodology_documents_get_index_status",
                "title": None,
                "description": "Get filterable field schema and indexing status for methodology documents. Returns payload_schema with indexed field keys, types, and match operators. Call BEFORE constructing any filter.",
                "inputSchema": {"properties": {}, "type": "object"},
                "outputSchema": {
                    "$defs": {
                        "PayloadFieldSchema": {
                            "description": "Schema information for an indexed payload field.",
                            "properties": {
                                "key": {
                                    "description": "Dot-path to the field (e.g., 'metadata.source_name') — use directly as FieldCondition.key",
                                    "type": "string",
                                },
                                "type": {
                                    "description": "Data type: keyword (exact match via MatchValue), integer (exact or Range), bool (exact via MatchValue), text (full-text via MatchText), float, datetime, geo, uuid",
                                    "type": "string",
                                },
                                "recommended_match": {
                                    "anyOf": [{"type": "string"}, {"type": "null"}],
                                    "default": None,
                                    "description": "Recommended match operator for this field type. IMPORTANT: 'keyword' fields must use match.value (NOT match.text or match.phrase). Only 'text'-indexed fields support match.text.",
                                },
                                "example": {
                                    "anyOf": [
                                        {"additionalProperties": True, "type": "object"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "Complete FieldCondition example you can copy into a filter. Replace placeholder values with your actual filter values.",
                                },
                            },
                            "required": ["key", "type"],
                            "type": "object",
                        }
                    },
                    "description": """\
Statistics for a Qdrant collection.

Provides information about the current state of a collection.\
""",
                    "properties": {
                        "name": {"description": "Name of the collection", "type": "string"},
                        "vectors_count": {
                            "description": "Number of vectors in the collection",
                            "type": "integer",
                        },
                        "points_count": {
                            "description": "Number of points in the collection",
                            "type": "integer",
                        },
                        "indexed_vectors_count": {
                            "default": 0,
                            "description": "Number of indexed vectors",
                            "type": "integer",
                        },
                        "status": {
                            "default": "unknown",
                            "description": "Collection status",
                            "type": "string",
                        },
                        "config": {
                            "anyOf": [
                                {"additionalProperties": True, "type": "object"},
                                {"type": "null"},
                            ],
                            "default": None,
                            "description": "Collection configuration",
                        },
                        "payload_schema": {
                            "anyOf": [
                                {
                                    "items": {"$ref": "#/$defs/PayloadFieldSchema"},
                                    "type": "array",
                                },
                                {"type": "null"},
                            ],
                            "default": None,
                            "description": "Indexed payload fields available for filtering. Use 'key' as FieldCondition.key and 'type' to choose the correct match operator.",
                        },
                    },
                    "required": ["name", "vectors_count", "points_count"],
                    "type": "object",
                },
                "icons": None,
                "annotations": {
                    "title": None,
                    "readOnlyHint": True,
                    "destructiveHint": False,
                    "idempotentHint": True,
                    "openWorldHint": False,
                },
                "meta": {"_fastmcp": {"tags": []}},
                "execution": None,
            },
            {
                "name": "schema_properties_search",
                "title": None,
                "description": "Search JSON schema properties using semantic search and/or metadata filters. For methodology content, prefer methodology_documents_search instead. To target a specific source, use a metadata filter (not the query) — first discover exact filter values by searching for the source name with no filter.",
                "inputSchema": {
                    "$defs": {
                        "DatetimeRange": {
                            "description": "Range filter request",
                            "properties": {
                                "lt": {
                                    "anyOf": [
                                        {"format": "date-time", "type": "string"},
                                        {"format": "date", "type": "string"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "point.key &lt; range.lt",
                                },
                                "gt": {
                                    "anyOf": [
                                        {"format": "date-time", "type": "string"},
                                        {"format": "date", "type": "string"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "point.key &gt; range.gt",
                                },
                                "gte": {
                                    "anyOf": [
                                        {"format": "date-time", "type": "string"},
                                        {"format": "date", "type": "string"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "point.key &gt;= range.gte",
                                },
                                "lte": {
                                    "anyOf": [
                                        {"format": "date-time", "type": "string"},
                                        {"format": "date", "type": "string"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "point.key &lt;= range.lte",
                                },
                            },
                            "type": "object",
                        },
                        "FieldCondition": {
                            "properties": {
                                "key": {"description": "Payload key", "type": "string"},
                                "match": {
                                    "anyOf": [
                                        {"$ref": "#/$defs/MatchValue"},
                                        {"$ref": "#/$defs/MatchText"},
                                        {"$ref": "#/$defs/MatchTextAny"},
                                        {"$ref": "#/$defs/MatchPhrase"},
                                        {"$ref": "#/$defs/MatchAny"},
                                        {"$ref": "#/$defs/MatchExcept"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "Check if point has field with a given value",
                                },
                                "range": {
                                    "anyOf": [
                                        {"$ref": "#/$defs/Range"},
                                        {"$ref": "#/$defs/DatetimeRange"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "Check if points value lies in a given range",
                                },
                            },
                            "required": ["key"],
                            "type": "object",
                        },
                        "IsEmptyCondition": {
                            "description": "Select points with empty payload for a specified field",
                            "properties": {
                                "is_empty": {
                                    "$ref": "#/$defs/PayloadField",
                                    "description": "Select points with empty payload for a specified field",
                                }
                            },
                            "required": ["is_empty"],
                            "type": "object",
                        },
                        "IsNullCondition": {
                            "description": "Select points with null payload for a specified field",
                            "properties": {
                                "is_null": {
                                    "$ref": "#/$defs/PayloadField",
                                    "description": "Select points with null payload for a specified field",
                                }
                            },
                            "required": ["is_null"],
                            "type": "object",
                        },
                        "MatchAny": {
                            "description": "Exact match on any of the given values",
                            "properties": {
                                "any": {
                                    "anyOf": [
                                        {"items": {"type": "string"}, "type": "array"},
                                        {"items": {"type": "integer"}, "type": "array"},
                                    ],
                                    "description": "Exact match on any of the given values",
                                }
                            },
                            "required": ["any"],
                            "type": "object",
                        },
                        "MatchExcept": {
                            "description": "Should have at least one value not matching the any given values",
                            "properties": {
                                "except": {
                                    "anyOf": [
                                        {"items": {"type": "string"}, "type": "array"},
                                        {"items": {"type": "integer"}, "type": "array"},
                                    ],
                                    "description": "Should have at least one value not matching the any given values",
                                }
                            },
                            "required": ["except"],
                            "type": "object",
                        },
                        "MatchPhrase": {
                            "description": "Full-text phrase match of the string.",
                            "properties": {
                                "phrase": {
                                    "description": "Full-text phrase match of the string.",
                                    "type": "string",
                                }
                            },
                            "required": ["phrase"],
                            "type": "object",
                        },
                        "MatchText": {
                            "description": "Full-text match of the strings.",
                            "properties": {
                                "text": {
                                    "description": "Full-text match of the strings.",
                                    "type": "string",
                                }
                            },
                            "required": ["text"],
                            "type": "object",
                        },
                        "MatchTextAny": {
                            "description": "Full-text match of at least one token of the string.",
                            "properties": {
                                "text_any": {
                                    "description": "Full-text match of at least one token of the string.",
                                    "type": "string",
                                }
                            },
                            "required": ["text_any"],
                            "type": "object",
                        },
                        "MatchValue": {
                            "description": "Exact match of the given value",
                            "properties": {
                                "value": {
                                    "anyOf": [
                                        {"type": "boolean"},
                                        {"type": "integer"},
                                        {"type": "string"},
                                    ],
                                    "description": "Exact match of the given value",
                                }
                            },
                            "required": ["value"],
                            "type": "object",
                        },
                        "PayloadField": {
                            "description": "Payload field",
                            "properties": {
                                "key": {"description": "Payload field name", "type": "string"}
                            },
                            "required": ["key"],
                            "type": "object",
                        },
                        "Range": {
                            "description": "Range filter request",
                            "properties": {
                                "lt": {
                                    "anyOf": [{"type": "number"}, {"type": "null"}],
                                    "default": None,
                                    "description": "point.key &lt; range.lt",
                                },
                                "gt": {
                                    "anyOf": [{"type": "number"}, {"type": "null"}],
                                    "default": None,
                                    "description": "point.key &gt; range.gt",
                                },
                                "gte": {
                                    "anyOf": [{"type": "number"}, {"type": "null"}],
                                    "default": None,
                                    "description": "point.key &gt;= range.gte",
                                },
                                "lte": {
                                    "anyOf": [{"type": "number"}, {"type": "null"}],
                                    "default": None,
                                    "description": "point.key &lt;= range.lte",
                                },
                            },
                            "type": "object",
                        },
                        "SearchFilter": {
                            "properties": {
                                "should": {
                                    "anyOf": [
                                        {
                                            "items": {
                                                "anyOf": [
                                                    {"$ref": "#/$defs/FieldCondition"},
                                                    {"$ref": "#/$defs/IsEmptyCondition"},
                                                    {"$ref": "#/$defs/IsNullCondition"},
                                                ]
                                            },
                                            "type": "array",
                                        },
                                        {"$ref": "#/$defs/FieldCondition"},
                                        {"$ref": "#/$defs/IsEmptyCondition"},
                                        {"$ref": "#/$defs/IsNullCondition"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "At least one of those conditions should match",
                                },
                                "must": {
                                    "anyOf": [
                                        {
                                            "items": {
                                                "anyOf": [
                                                    {"$ref": "#/$defs/FieldCondition"},
                                                    {"$ref": "#/$defs/IsEmptyCondition"},
                                                    {"$ref": "#/$defs/IsNullCondition"},
                                                ]
                                            },
                                            "type": "array",
                                        },
                                        {"$ref": "#/$defs/FieldCondition"},
                                        {"$ref": "#/$defs/IsEmptyCondition"},
                                        {"$ref": "#/$defs/IsNullCondition"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "All conditions must match",
                                },
                                "must_not": {
                                    "anyOf": [
                                        {
                                            "items": {
                                                "anyOf": [
                                                    {"$ref": "#/$defs/FieldCondition"},
                                                    {"$ref": "#/$defs/IsEmptyCondition"},
                                                    {"$ref": "#/$defs/IsNullCondition"},
                                                ]
                                            },
                                            "type": "array",
                                        },
                                        {"$ref": "#/$defs/FieldCondition"},
                                        {"$ref": "#/$defs/IsEmptyCondition"},
                                        {"$ref": "#/$defs/IsNullCondition"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "All conditions must NOT match",
                                },
                            },
                            "type": "object",
                        },
                    },
                    "properties": {
                        "query": {
                            "anyOf": [{"type": "string"}, {"type": "null"}],
                            "default": None,
                            "description": "Semantic topic query (e.g., 'project start date field'). Put the TOPIC here, not the schema/document name — use a metadata filter to target a specific source. If omitted, the search relies entirely on filters.",
                        },
                        "filter": {
                            "anyOf": [{"$ref": "#/$defs/SearchFilter"}, {"type": "null"}],
                            "default": None,
                            "description": """\
Optional metadata filters. Use to narrow results to a specific source/document.

PREREQUISITE: Call schema_properties_get_index_status FIRST to discover available field keys, types, and match operators.

Filter values must be EXACT (copied from actual search results, not guessed). If results are empty, the filter value is likely wrong — re-run value discovery. Never drop a filter to get more results; broaden the query instead.

Type-to-operator quick reference:
- keyword -> match.value (exact string)
- integer -> match.value or range
- text -> match.text (full-text)
- float/datetime -> range (gt/gte/lt/lte)\
""",
                        },
                        "limit": {
                            "default": 5,
                            "description": "Maximum number of results to return.",
                            "type": "integer",
                        },
                        "offset": {
                            "anyOf": [{"type": "integer"}, {"type": "null"}],
                            "default": None,
                            "description": "Number of results to skip for pagination.",
                        },
                    },
                    "type": "object",
                },
                "outputSchema": {
                    "$defs": {
                        "SchemaPropertyMetadata": {
                            "properties": {
                                "name": {"type": "string"},
                                "full_path": {"type": "string"},
                                "type": {"items": {"type": "string"}, "type": "array"},
                                "description": {"type": "string"},
                                "ancestors": {"items": {"type": "string"}, "type": "array"},
                                "source": {"type": "string"},
                                "path_root": {"type": "string"},
                                "methodology": {"type": "string"},
                            },
                            "required": [
                                "name",
                                "full_path",
                                "type",
                                "description",
                                "ancestors",
                                "source",
                                "path_root",
                                "methodology",
                            ],
                            "type": "object",
                        },
                        "SchemaPropertySearchResult": {
                            "properties": {
                                "content": {
                                    "description": "The text content of the matched document chunk",
                                    "type": "string",
                                },
                                "score": {
                                    "anyOf": [{"type": "number"}, {"type": "null"}],
                                    "default": None,
                                    "description": "Similarity score from the search",
                                },
                                "metadata": {"$ref": "#/$defs/SchemaPropertyMetadata"},
                            },
                            "required": ["content", "metadata"],
                            "type": "object",
                        },
                    },
                    "properties": {
                        "result": {
                            "items": {"$ref": "#/$defs/SchemaPropertySearchResult"},
                            "type": "array",
                        }
                    },
                    "required": ["result"],
                    "type": "object",
                    "x-fastmcp-wrap-result": True,
                },
                "icons": None,
                "annotations": {
                    "title": None,
                    "readOnlyHint": True,
                    "destructiveHint": False,
                    "idempotentHint": True,
                    "openWorldHint": False,
                },
                "meta": {"_fastmcp": {"tags": []}},
                "execution": None,
            },
            {
                "name": "schema_properties_get_index_status",
                "title": None,
                "description": "Get filterable field schema and indexing status for schema properties.\n\nReturns payload_schema with indexed field keys, types, and\nmatch operators. Call BEFORE constructing any filter.",
                "inputSchema": {
                    "properties": {},
                    "type": "object",
                },
                "outputSchema": {
                    "$defs": {
                        "PayloadFieldSchema": {
                            "description": "Schema information for an indexed payload field.",
                            "properties": {
                                "key": {
                                    "description": "Dot-path to the field (e.g., 'metadata.source_name') — use directly as FieldCondition.key",
                                    "type": "string",
                                },
                                "type": {
                                    "description": "Data type: keyword (exact match via MatchValue), integer (exact or Range), bool (exact via MatchValue), text (full-text via MatchText), float, datetime, geo, uuid",
                                    "type": "string",
                                },
                                "recommended_match": {
                                    "anyOf": [{"type": "string"}, {"type": "null"}],
                                    "default": None,
                                    "description": "Recommended match operator for this field type. IMPORTANT: 'keyword' fields must use match.value (NOT match.text or match.phrase). Only 'text'-indexed fields support match.text.",
                                },
                                "example": {
                                    "anyOf": [
                                        {"additionalProperties": True, "type": "object"},
                                        {"type": "null"},
                                    ],
                                    "default": None,
                                    "description": "Complete FieldCondition example you can copy into a filter. Replace placeholder values with your actual filter values.",
                                },
                            },
                            "required": ["key", "type"],
                            "type": "object",
                        }
                    },
                    "description": """\
Statistics for a Qdrant collection.

Provides information about the current state of a collection.\
""",
                    "properties": {
                        "name": {"description": "Name of the collection", "type": "string"},
                        "vectors_count": {
                            "description": "Number of vectors in the collection",
                            "type": "integer",
                        },
                        "points_count": {
                            "description": "Number of points in the collection",
                            "type": "integer",
                        },
                        "indexed_vectors_count": {
                            "default": 0,
                            "description": "Number of indexed vectors",
                            "type": "integer",
                        },
                        "status": {
                            "default": "unknown",
                            "description": "Collection status",
                            "type": "string",
                        },
                        "config": {
                            "anyOf": [
                                {"additionalProperties": True, "type": "object"},
                                {"type": "null"},
                            ],
                            "default": None,
                            "description": "Collection configuration",
                        },
                        "payload_schema": {
                            "anyOf": [
                                {"items": {"$ref": "#/$defs/PayloadFieldSchema"}, "type": "array"},
                                {"type": "null"},
                            ],
                            "default": None,
                            "description": "Indexed payload fields available for filtering. Use 'key' as FieldCondition.key and 'type' to choose the correct match operator.",
                        },
                    },
                    "required": ["name", "vectors_count", "points_count"],
                    "type": "object",
                },
                "icons": None,
                "annotations": {
                    "title": None,
                    "readOnlyHint": True,
                    "destructiveHint": False,
                    "idempotentHint": True,
                    "openWorldHint": False,
                },
                "meta": {"_fastmcp": {"tags": []}},
                "execution": None,
            },
            {
                "name": "schema_builder_create_schemas",
                "title": None,
                "description": "Primary tool for creating or extending Guardian Schemas within an Excel file. It generates a new schema file or appends new sheets to an existing workbook.",
                "inputSchema": {
                    "$defs": {
                        "ComparisonExpression": {
                            "properties": {
                                "operator": {"const": "EQUAL", "type": "string"},
                                "left": {
                                    "anyOf": [
                                        {"$ref": "#/$defs/FieldReference"},
                                        {"$ref": "#/$defs/ConstantValue"},
                                    ]
                                },
                                "right": {
                                    "anyOf": [
                                        {"$ref": "#/$defs/FieldReference"},
                                        {"$ref": "#/$defs/ConstantValue"},
                                    ]
                                },
                            },
                            "required": ["operator", "left", "right"],
                            "type": "object",
                        },
                        "ConstantValue": {
                            "properties": {
                                "value": {
                                    "description": "Constant primitive value. (if field_key_ref refers to an 'Enum' field, the value must match one of the defined options in EnumOptions)",
                                    "type": "string",
                                }
                            },
                            "required": ["value"],
                            "type": "object",
                        },
                        "EnumOptions": {
                            "description": "Enum options for fields with field_type='Enum'",
                            "properties": {
                                "unique_name": {
                                    "description": "Unique name of the enum",
                                    "type": "string",
                                },
                                "options": {
                                    "description": "List of enum options",
                                    "items": {"type": "string"},
                                    "type": "array",
                                },
                            },
                            "required": ["unique_name", "options"],
                            "type": "object",
                        },
                        "FieldReference": {
                            "properties": {
                                "field_key_ref": {
                                    "description": "Reference to a certain field by its key",
                                    "type": "string",
                                }
                            },
                            "required": ["field_key_ref"],
                            "type": "object",
                        },
                        "GuardianPolicySchema": {
                            "description": "Represents the overall structure of a guardian policy schema.",
                            "properties": {
                                "schema_name": {
                                    "description": "Name of the schema (If the sheet exists, it will be replaced)",
                                    "type": "string",
                                },
                                "metadata": {"$ref": "#/$defs/MetadataBase"},
                                "schema_fields": {
                                    "description": "List of field definitions for the table",
                                    "items": {"$ref": "#/$defs/SchemaField"},
                                    "type": "array",
                                },
                            },
                            "required": ["schema_name", "metadata", "schema_fields"],
                            "type": "object",
                        },
                        "HelpTextStyle": {
                            "properties": {
                                "size": {
                                    "anyOf": [{"type": "integer"}, {"type": "null"}],
                                    "default": 18,
                                    "description": "Size of the helper text",
                                },
                                "bold": {
                                    "default": False,
                                    "description": "Whether the helper text is bold",
                                    "type": "boolean",
                                },
                                "color": {
                                    "anyOf": [{"type": "string"}, {"type": "null"}],
                                    "default": "#000000",
                                    "description": "Color of the helper text in HEX format",
                                },
                            },
                            "type": "object",
                        },
                        "LogicalExpression": {
                            "properties": {
                                "operator": {"enum": ["AND", "OR"], "type": "string"},
                                "left": {
                                    "anyOf": [
                                        {"$ref": "#/$defs/LogicalExpression"},
                                        {"$ref": "#/$defs/ComparisonExpression"},
                                    ]
                                },
                                "right": {
                                    "anyOf": [
                                        {"$ref": "#/$defs/LogicalExpression"},
                                        {"$ref": "#/$defs/ComparisonExpression"},
                                    ]
                                },
                            },
                            "required": ["operator", "left", "right"],
                            "type": "object",
                        },
                        "MetadataBase": {
                            "description": "Metadata section of Policy Schema Structure",
                            "properties": {
                                "description": {
                                    "default": "",
                                    "description": "Description of the schema",
                                    "type": "string",
                                },
                                "schema_type": {
                                    "$ref": "#/$defs/SchemaType",
                                    "default": "Verifiable Credentials",
                                    "description": "Type of schema. For example:(Verifiable Credentials, Sub-Schema, or Tool-integration)",
                                },
                            },
                            "type": "object",
                        },
                        "SchemaField": {
                            "description": "Represents a single field (column) in the schema",
                            "properties": {
                                "required_field": {
                                    "$ref": "#/$defs/YesNo",
                                    "description": "Whether users must complete this field before submission (Yes/No)",
                                },
                                "field_type": {
                                    "anyOf": [
                                        {"$ref": "#/$defs/SchemaReference"},
                                        {
                                            "enum": [
                                                "Enum",
                                                "Number",
                                                "Integer",
                                                "String",
                                                "Pattern",
                                                "Boolean",
                                                "Date",
                                                "Time",
                                                "DateTime",
                                                "Duration",
                                                "URL",
                                                "URI",
                                                "Email",
                                                "Image",
                                                "Help Text",
                                                "GeoJSON",
                                                "Prefix",
                                                "Postfix",
                                                "HederaAccount",
                                                "Auto-Calculate",
                                                "File",
                                            ],
                                            "type": "string",
                                        },
                                    ],
                                    "description": """\

            Either a basic field type or a reference to another sub schema.
                - If it is "Enum" - EnumOptions must be provided in 'parameter' field!.
                - If it is "Help Text" - Should be automatically listed as a section heading describing a group of subsequent questions, the text must be inside "question" field. HelpTextStyle can be provided in 'parameter' field!.
                - If it is a "Prefix" or "Postfix" - the symbol must be provided in 'parameter' field!.
                - If it is "Pattern" - the regular expression must be provided in 'parameter' field!.
        \
""",
                                },
                                "parameter": {
                                    "anyOf": [
                                        {"type": "string"},
                                        {"$ref": "#/$defs/EnumOptions"},
                                        {"$ref": "#/$defs/HelpTextStyle"},
                                    ],
                                    "default": "",
                                    "description": "Enum options, calculation parameters, or additional metadata relevant to the field type",
                                },
                                "visibility": {
                                    "anyOf": [
                                        {"$ref": "#/$defs/VisibilityCondition"},
                                        {"const": "Hidden", "type": "string"},
                                        {"const": "", "type": "string"},
                                    ],
                                    "default": "",
                                    "description": "Determines the visibility of the field for user. (either 'Hidden' or a condition object default is empty string meaning always visible)",
                                },
                                "question": {
                                    "default": "",
                                    "description": "User-facing text that appears as the field label",
                                    "type": "string",
                                },
                                "allow_multiple_answers": {
                                    "$ref": "#/$defs/YesNo",
                                    "description": "Whether the field accepts multiple values (Yes/No)",
                                },
                                "answer": {
                                    "anyOf": [{"type": "string"}, {"type": "null"}],
                                    "default": "",
                                    "description": "Example of the valid data shown to users. (if field type is Enum, should be one of the enum options)",
                                },
                                "key": {
                                    "description": "Generated unique key for the field that reflects its semantic meaning (e.g., 'full_name' for 'What is your full name?')",
                                    "type": "string",
                                },
                                "suggest": {
                                    "anyOf": [{"type": "string"}, {"type": "null"}],
                                    "default": "",
                                    "description": "Recommended value shown to guide users (usually equal to 'answer')",
                                },
                                "default": {
                                    "anyOf": [{"type": "string"}, {"type": "null"}],
                                    "default": "",
                                    "description": "Pre-filled value that appears when users first see the field (usually equal to 'answer')",
                                },
                            },
                            "required": [
                                "required_field",
                                "field_type",
                                "allow_multiple_answers",
                                "key",
                            ],
                            "type": "object",
                        },
                        "SchemaReference": {
                            "description": "Reference to another existing schema",
                            "properties": {
                                "unique_schema_name_ref": {
                                    "description": "Unique name of the referenced guardian policy schema",
                                    "type": "string",
                                }
                            },
                            "required": ["unique_schema_name_ref"],
                            "type": "object",
                        },
                        "SchemaType": {
                            "description": "Enumeration of schema types",
                            "enum": ["Verifiable Credentials", "Sub-Schema", "Tool-integration"],
                            "type": "string",
                        },
                        "VisibilityCondition": {
                            "description": "Visibility condition for a schema field",
                            "properties": {
                                "invert": {
                                    "default": False,
                                    "description": "If True, the logic result is inverted",
                                    "type": "boolean",
                                },
                                "condition": {
                                    "anyOf": [
                                        {"$ref": "#/$defs/LogicalExpression"},
                                        {"$ref": "#/$defs/ComparisonExpression"},
                                    ]
                                },
                            },
                            "required": ["condition"],
                            "type": "object",
                        },
                        "YesNo": {
                            "description": "Enum for Yes/No fields",
                            "enum": ["Yes", "No"],
                            "type": "string",
                        },
                    },
                    "properties": {
                        "guardian_policy_schemas": {
                            "description": "List of Guardian Policy Schemas to include in the Excel file.",
                            "items": {"$ref": "#/$defs/GuardianPolicySchema"},
                            "type": "array",
                        },
                        "file_name": {
                            "description": "Excel file name to save the generated schema data to.",
                            "type": "string",
                        },
                        "extend_existing": {
                            "default": False,
                            "description": "Flag indicating whether to extend an existing Excel file if it exists. (default: False)",
                            "type": "boolean",
                        },
                    },
                    "required": ["file_name", "guardian_policy_schemas"],
                    "type": "object",
                },
                "outputSchema": None,
                "icons": None,
                "annotations": {
                    "title": None,
                    "readOnlyHint": False,
                    "destructiveHint": False,
                    "idempotentHint": False,
                    "openWorldHint": False,
                },
                "meta": {"_fastmcp": {"tags": []}},
                "execution": None,
            },
            {
                "name": "schema_builder_get_schema_list",
                "title": None,
                "description": "Retrieves a list of schemas from the generated Excel schema file.",
                "inputSchema": {
                    "properties": {
                        "file_name": {
                            "description": "Excel file name.",
                            "type": "string",
                        }
                    },
                    "required": ["file_name"],
                    "type": "object",
                },
                "outputSchema": None,
                "icons": None,
                "annotations": {
                    "title": None,
                    "readOnlyHint": True,
                    "destructiveHint": False,
                    "idempotentHint": True,
                    "openWorldHint": False,
                },
                "meta": {"_fastmcp": {"tags": []}},
                "execution": None,
            },
            {
                "name": "schema_builder_get_schema_field_list",
                "title": None,
                "description": "Returns the list of fields (field_type, key, question) for a specific schema from the generated Excel schema file.",
                "inputSchema": {
                    "properties": {
                        "file_name": {
                            "description": "Excel file name.",
                            "type": "string",
                        },
                        "schema_name": {
                            "description": "The name of the sheet within the Excel file to get the fields from.",
                            "type": "string",
                        },
                    },
                    "required": ["file_name", "schema_name"],
                    "type": "object",
                },
                "outputSchema": None,
                "icons": None,
                "annotations": {
                    "title": None,
                    "readOnlyHint": True,
                    "destructiveHint": False,
                    "idempotentHint": True,
                    "openWorldHint": False,
                },
                "meta": {"_fastmcp": {"tags": []}},
                "execution": None,
            },
            {
                "name": "schema_builder_get_schema_field_by_keys",
                "title": None,
                "description": "Returns the full field definitions from the generated Excel schema file.",
                "inputSchema": {
                    "properties": {
                        "file_name": {
                            "description": "Excel file name.",
                            "type": "string",
                        },
                        "schema_name": {
                            "description": "The name of the sheet within the Excel file to get the fields from.",
                            "type": "string",
                        },
                        "field_keys": {
                            "description": "The keys of the fields to retrieve from the schema.",
                            "items": {"type": "string"},
                            "type": "array",
                        },
                    },
                    "required": ["file_name", "schema_name", "field_keys"],
                    "type": "object",
                },
                "outputSchema": None,
                "icons": None,
                "annotations": {
                    "title": None,
                    "readOnlyHint": True,
                    "destructiveHint": False,
                    "idempotentHint": True,
                    "openWorldHint": False,
                },
                "meta": {"_fastmcp": {"tags": []}},
                "execution": None,
            },
            {
                "name": "schema_builder_add_schema_fields",
                "title": None,
                "description": "Appends new fields to an existing schema (sheet) in the Excel file.",
                "inputSchema": {
                    "properties": {
                        "schema_fields": {
                            "description": "List of schema fields to add. The elements of schema_fields must follow the 'SchemaField' model!",
                            "items": {"additionalProperties": True, "type": "object"},
                            "type": "array",
                        },
                        "schema_name": {
                            "description": "The name of the sheet (schema) within the Excel file to update.",
                            "type": "string",
                        },
                        "file_name": {
                            "description": "Excel file name.",
                            "type": "string",
                        },
                        "position": {
                            "anyOf": [{"type": "integer"}, {"type": "null"}],
                            "default": None,
                            "description": "Optional position to insert the new fields. If not specified, they will be added to the end.",
                        },
                    },
                    "required": ["file_name", "schema_name", "schema_fields"],
                    "type": "object",
                },
                "outputSchema": None,
                "icons": None,
                "annotations": {
                    "title": None,
                    "readOnlyHint": False,
                    "destructiveHint": False,
                    "idempotentHint": False,
                    "openWorldHint": False,
                },
                "meta": {"_fastmcp": {"tags": []}},
                "execution": None,
            },
            {
                "name": "schema_builder_patch_schema_fields",
                "title": None,
                "description": "Patches existing fields in a schema by matching on the field's key.",
                "inputSchema": {
                    "properties": {
                        "schema_fields": {
                            "description": "List of schema fields to patch. The elements of schema_fields must follow the 'SchemaField' model!",
                            "items": {"additionalProperties": True, "type": "object"},
                            "type": "array",
                        },
                        "file_name": {
                            "description": "Excel file name.",
                            "type": "string",
                        },
                        "schema_name": {
                            "description": "The name of the sheet (schema) within the Excel file to patch.",
                            "type": "string",
                        },
                    },
                    "required": ["file_name", "schema_name", "schema_fields"],
                    "type": "object",
                },
                "outputSchema": None,
                "icons": None,
                "annotations": {
                    "title": None,
                    "readOnlyHint": False,
                    "destructiveHint": False,
                    "idempotentHint": True,
                    "openWorldHint": False,
                },
                "meta": {"_fastmcp": {"tags": []}},
                "execution": None,
            },
            {
                "name": "schema_builder_remove_schema_fields",
                "title": None,
                "description": "Removes specific fields from a schema (sheet) in the generated Excel schema file.",
                "inputSchema": {
                    "properties": {
                        "field_keys": {
                            "description": "List of field keys to remove from the Excel schema.",
                            "items": {"type": "string"},
                            "type": "array",
                        },
                        "schema_name": {
                            "description": "The name of the sheet within the Excel file to remove fields from.",
                            "type": "string",
                        },
                        "file_name": {
                            "description": "Excel file name.",
                            "type": "string",
                        },
                    },
                    "required": ["file_name", "schema_name", "field_keys"],
                    "type": "object",
                },
                "outputSchema": None,
                "icons": None,
                "annotations": {
                    "title": None,
                    "readOnlyHint": False,
                    "destructiveHint": True,
                    "idempotentHint": True,
                    "openWorldHint": False,
                },
                "meta": {"_fastmcp": {"tags": []}},
                "execution": None,
            },
            {
                "name": "schema_builder_remove_schemas",
                "title": None,
                "description": "Removes specific schemas (sheets) from the generated Excel schema file.",
                "inputSchema": {
                    "properties": {
                        "file_name": {
                            "description": "Excel file name.",
                            "type": "string",
                        },
                        "schema_names": {
                            "description": "The names of the sheets within the Excel file to remove.",
                            "items": {"type": "string"},
                            "type": "array",
                        },
                    },
                    "required": ["file_name", "schema_names"],
                    "type": "object",
                },
                "outputSchema": None,
                "icons": None,
                "annotations": {
                    "title": None,
                    "readOnlyHint": False,
                    "destructiveHint": True,
                    "idempotentHint": True,
                    "openWorldHint": False,
                },
                "meta": {"_fastmcp": {"tags": []}},
                "execution": None,
            },
        ]
    )


@pytest.mark.asyncio
async def test_list_resources(mock_mcp_client: Client[FastMCPTransport]):
    list_resources = await mock_mcp_client.list_resources()

    # Convert to dict/JSON for comparison
    list_resources_data = [resource.model_dump() for resource in list_resources]

    assert list_resources_data == snapshot([])


@pytest.mark.asyncio
async def test_list_prompts(mock_mcp_client: Client[FastMCPTransport]):
    list_prompts = await mock_mcp_client.list_prompts()

    # Convert to dict/JSON for comparison
    list_prompts_data = [prompt.model_dump() for prompt in list_prompts]

    assert list_prompts_data == snapshot([])
