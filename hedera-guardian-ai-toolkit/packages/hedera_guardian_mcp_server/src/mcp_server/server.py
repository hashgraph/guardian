import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastmcp import FastMCP
from mcp.types import ToolAnnotations
from pydantic import Field, TypeAdapter
from pydantic.functional_validators import SkipValidation
from qdrant_client import AsyncQdrantClient
from starlette.requests import Request
from starlette.responses import FileResponse, Response

from mcp_server.models.output_schemas import (
    MethodologyDocumentMetadata,
    MethodologyDocumentSearchResult,
    SchemaPropertyMetadata,
    SchemaPropertySearchResult,
)
from mcp_server.settings import McpServerSettings
from policy_schema_builder.json_schema_manager_service import JSONSchemaManagerService
from policy_schema_builder.models.guardian_policy_schema import (
    GuardianPolicySchemas,
    SchemaFields,
)
from vector_store import QdrantConnector
from vector_store.embeddings.base import AsyncEmbeddingProvider
from vector_store.embeddings.multi_vector_base import MultiVectorEmbeddingProvider
from vector_store.models import CollectionStats

from .filter_validation import validate_filter_keys
from .middleware import ToolLoggingMiddleware
from .models.slim_search_filter import SearchFilter

logger = logging.getLogger(__name__)

_READ_ONLY_ANNOTATIONS = ToolAnnotations(
    readOnlyHint=True,
    destructiveHint=False,
    idempotentHint=True,
    openWorldHint=False,
)

_ADDITIVE_ANNOTATIONS = ToolAnnotations(
    readOnlyHint=False,
    destructiveHint=False,
    idempotentHint=False,
    openWorldHint=False,
)

_IDEMPOTENT_UPDATE_ANNOTATIONS = ToolAnnotations(
    readOnlyHint=False,
    destructiveHint=False,
    idempotentHint=True,
    openWorldHint=False,
)

_DESTRUCTIVE_ANNOTATIONS = ToolAnnotations(
    readOnlyHint=False,
    destructiveHint=True,
    idempotentHint=True,
    openWorldHint=False,
)

_SERVER_INSTRUCTIONS = (
    "Hedera Guardian MCP Server — semantic search over"
    " methodology documents and JSON schema properties."
    "\n\n## Search Tools (in order of typical usage)"
    "\n\n- methodology_documents_search — methodology document content (primary)"
    "\n- schema_properties_search — JSON schema property definitions"
    "\n\n## Targeted Search Workflow"
    "\n\nWhen the user asks about a SPECIFIC methodology, document, or schema source:"
    "\n\nStep 1 — Discover field schema (once per session):"
    "\n  Call the relevant *_get_index_status tool."
    "\n\nStep 2 — Discover exact filter values (once per target):"
    "\n  Search with query=<document name>, no filter, limit=3."
    "\n  Copy the EXACT metadata value from results (e.g. metadata.source_name)."
    "\n  Do NOT guess values. Do NOT answer the user from discovery results."
    "\n\nStep 3 — Filtered search:"
    "\n  Search with query=<user's actual topic>, filter from Steps 1+2, limit=5-10."
    "\n  If results are sparse, broaden the query or increase limit."
    "\n  Never drop the filter to get more results."
    "\n\nFor general questions (no specific source): use semantic search only, skip this workflow."
    "\n\nFor methodology-related questions, prefer methodology_documents_search"
    " unless the user explicitly asks about JSON schema properties."
)

_FILTER_DESCRIPTION_TEMPLATE = (
    "Optional metadata filters. Use to narrow results to a specific source/document."
    "\n\nPREREQUISITE: Call {status_tool} FIRST"
    " to discover available field keys, types, and match operators."
    "\n\nFilter values must be EXACT (copied from actual search results, not guessed)."
    " If results are empty, the filter value is likely wrong — re-run value discovery."
    " Never drop a filter to get more results; broaden the query instead."
    "\n\nType-to-operator quick reference:"
    "\n- keyword -> match.value (exact string)"
    "\n- integer -> match.value or range"
    "\n- text -> match.text (full-text)"
    "\n- float/datetime -> range (gt/gte/lt/lte)"
)

_guardian_policy_schemas_adapter = TypeAdapter(GuardianPolicySchemas)


@asynccontextmanager
async def _server_lifespan(server: "HederaGuardianMCPServer") -> AsyncIterator[dict]:
    """Manage server resource lifecycle."""
    try:
        yield {}
    finally:
        if server._qdrant_client is not None:
            try:
                logger.info("Closing shared Qdrant client...")
                await server._qdrant_client.close()
            except Exception:
                logger.exception("Error closing Qdrant client")
        if server._embedding_provider is not None:
            try:
                logger.info("Releasing embedding model resources...")
                server._embedding_provider.cleanup()
            except Exception:
                logger.exception("Error releasing embedding resources")


class HederaGuardianMCPServer(FastMCP):
    """Custom FastMCP server for Hedera Guardian Service."""

    def __init__(
        self,
        schema_connector: QdrantConnector,
        methodology_connector: QdrantConnector,
        tool_logging_enabled: bool = False,
        qdrant_client: AsyncQdrantClient | None = None,
        embedding_provider: AsyncEmbeddingProvider | MultiVectorEmbeddingProvider | None = None,
    ):
        self._qdrant_client = qdrant_client
        self._embedding_provider = embedding_provider
        super().__init__(
            name="Hedera Guardian MCP Server",
            instructions=_SERVER_INSTRUCTIONS,
            lifespan=_server_lifespan,
        )
        self._schema_connector = schema_connector
        self._methodology_connector = methodology_connector

        if tool_logging_enabled:
            self.add_middleware(ToolLoggingMiddleware())

        self.setup_mcp()

    def setup_custom_routes(self):
        @self.custom_route("/download-excel/{file_path:path}", methods=["GET"])
        def download_file(request: Request) -> Response:
            """Download a file by its path."""
            # Extract file_path from the request path parameters
            file_path = request.path_params.get("file_path", "")

            # Get output directory from environment variable, fallback to current directory
            output_dir = os.getenv("EXCEL_OUTPUT_DIR", "./data/output")

            # Construct the full file path
            full_path = Path(output_dir) / file_path

            # Security check: ensure the resolved path is within the output directory
            try:
                resolved_path = full_path.resolve()
                resolved_output_dir = Path(output_dir).resolve()

                if not resolved_path.is_relative_to(resolved_output_dir):
                    return Response(
                        content="Access denied: Path traversal detected",
                        status_code=403,
                        media_type="text/plain",
                    )

                # Check if file exists
                if not resolved_path.exists():
                    return Response(
                        content=f"File not found: {file_path}",
                        status_code=404,
                        media_type="text/plain",
                    )

                # Check if it's a file (not a directory)
                if not resolved_path.is_file():
                    return Response(
                        content=f"Not a file: {file_path}", status_code=400, media_type="text/plain"
                    )

                # Read and return the file
                return FileResponse(
                    path=str(resolved_path),
                    filename=resolved_path.name,
                    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )

            except Exception:
                logger.exception("Error serving file download: %s", file_path)
                return Response(
                    content="Error reading file",
                    status_code=500,
                    media_type="text/plain",
                )

    def setup_mcp(self):
        self.setup_custom_routes()

        # ===== Methodology Document Tools (primary use case) =====

        @self.tool(annotations=_READ_ONLY_ANNOTATIONS)
        async def methodology_documents_search(
            query: Annotated[
                str | None,
                Field(
                    default=None,
                    description=(
                        "Semantic topic query (e.g., 'baseline emission calculation')."
                        " Put the TOPIC here, not the methodology/document name"
                        " — use a metadata filter to target a specific source."
                        " If omitted, the search relies entirely on filters."
                    ),
                ),
            ],
            filter: Annotated[
                SearchFilter | None,
                Field(
                    default=None,
                    description=_FILTER_DESCRIPTION_TEMPLATE.format(
                        status_tool="methodology_documents_get_index_status"
                    ),
                ),
            ],
            limit: Annotated[int, Field(description="Maximum number of results to return.")] = 5,
            offset: Annotated[
                int | None, Field(description="Number of results to skip for pagination.")
            ] = None,
        ) -> list[MethodologyDocumentSearchResult]:
            """Search methodology documents using semantic search and/or metadata filters. This is the PRIMARY search tool for methodology-related questions. To target a specific methodology, use a metadata filter (not the query) — first discover exact filter values by searching for the methodology name with no filter."""
            if filter is not None:
                await validate_filter_keys(filter, self._methodology_connector)

            qdrant_filter = filter.to_qdrant() if filter is not None else None

            results = await self._methodology_connector.search(
                query=query,
                query_filter=qdrant_filter,
                limit=limit,
                offset=offset,
            )
            return [
                MethodologyDocumentSearchResult(
                    content=r.content,
                    score=r.score,
                    metadata=MethodologyDocumentMetadata(**(r.metadata or {})),
                )
                for r in results
            ]

        @self.tool(annotations=_READ_ONLY_ANNOTATIONS)
        async def methodology_documents_get_index_status() -> CollectionStats:
            """Get filterable field schema and indexing status for methodology documents. Returns payload_schema with indexed field keys, types, and match operators. Call BEFORE constructing any filter."""
            return await self._methodology_connector.get_stats()

        # ===== Schema Property Tools (secondary use case) =====

        @self.tool(annotations=_READ_ONLY_ANNOTATIONS)
        async def schema_properties_search(
            query: Annotated[
                str | None,
                Field(
                    default=None,
                    description=(
                        "Semantic topic query (e.g., 'project start date field')."
                        " Put the TOPIC here, not the schema/document name"
                        " — use a metadata filter to target a specific source."
                        " If omitted, the search relies entirely on filters."
                    ),
                ),
            ],
            filter: Annotated[
                SearchFilter | None,
                Field(
                    default=None,
                    description=_FILTER_DESCRIPTION_TEMPLATE.format(
                        status_tool="schema_properties_get_index_status"
                    ),
                ),
            ],
            limit: Annotated[int, Field(description="Maximum number of results to return.")] = 5,
            offset: Annotated[
                int | None, Field(description="Number of results to skip for pagination.")
            ] = None,
        ) -> list[SchemaPropertySearchResult]:
            """Search JSON schema properties using semantic search and/or metadata filters. For methodology content, prefer methodology_documents_search instead. To target a specific source, use a metadata filter (not the query) — first discover exact filter values by searching for the source name with no filter."""
            if filter is not None:
                await validate_filter_keys(filter, self._schema_connector)

            qdrant_filter = filter.to_qdrant() if filter is not None else None

            results = await self._schema_connector.search(
                query=query, limit=limit, offset=offset, query_filter=qdrant_filter
            )
            return [
                SchemaPropertySearchResult(
                    content=r.content,
                    score=r.score,
                    metadata=SchemaPropertyMetadata(**(r.metadata or {})),
                )
                for r in results
            ]

        @self.tool(annotations=_READ_ONLY_ANNOTATIONS)
        async def schema_properties_get_index_status() -> CollectionStats:
            """Get filterable field schema and indexing status for schema properties.

            Returns payload_schema with indexed field keys, types, and
            match operators. Call BEFORE constructing any filter.
            """
            return await self._schema_connector.get_stats()

        @self.tool(annotations=_ADDITIVE_ANNOTATIONS)
        def schema_builder_create_schemas(
            file_name: Annotated[
                str,
                Field(description="Excel file name to save the generated schema data to."),
            ],
            guardian_policy_schemas: Annotated[
                SkipValidation[GuardianPolicySchemas],
                Field(description="List of Guardian Policy Schemas to include in the Excel file."),
            ],
            extend_existing: bool = Field(
                default=False,
                description="Flag indicating whether to extend an existing Excel file if it exists. (default: False)",
            ),
        ):
            """Primary tool for creating or extending Guardian Schemas within an Excel file. It generates a new schema file or appends new sheets to an existing workbook."""

            output_dir = os.getenv("EXCEL_OUTPUT_DIR", "./data/output")

            schema_manager_service = JSONSchemaManagerService(file_name, output_dir=output_dir)

            if not extend_existing:
                schema_manager_service.create_new(guardian_policy_schemas)
            else:
                schema_manager_service.extend_with_schema(guardian_policy_schemas)

            schema_manager_service.create_excel()

            mcp_server_settings = McpServerSettings()

            download_url = f"http://localhost:{mcp_server_settings.port}/download-excel/{file_name}"

            # return f"Excel file generated and saved successfully to {full_path}. Download excel file it by calling the following URL: {download_url}"
            return {
                "message": "Excel file generated and saved successfully."
                if not extend_existing
                else "Excel file extended successfully.",
                "download_url": f"'{download_url}'. Do not download it by scripts! Just display it to the user.",
                "file_path": os.path.join("output", file_name),
                "file_name": file_name,
            }

        @self.tool(annotations=_READ_ONLY_ANNOTATIONS)
        def schema_builder_get_schema_list(
            file_name: str = Field(
                description="Excel file name.",
            ),
        ):
            """Retrieves a list of schemas from the generated Excel schema file."""
            output_dir = os.getenv("EXCEL_OUTPUT_DIR", "./data/output")

            schema_manager_service = JSONSchemaManagerService(file_name, output_dir=output_dir)

            return schema_manager_service.list_schemas_short_info()

        @self.tool(annotations=_READ_ONLY_ANNOTATIONS)
        def schema_builder_get_schema_field_list(
            file_name: str = Field(
                description="Excel file name.",
            ),
            schema_name: str = Field(
                description="The name of the sheet within the Excel file to get the fields from.",
            ),
        ):
            """Returns the list of fields (field_type, key, question) for a specific schema from the generated Excel schema file."""
            output_dir = os.getenv("EXCEL_OUTPUT_DIR", "./data/output")

            schema_manager_service = JSONSchemaManagerService(file_name, output_dir=output_dir)

            return schema_manager_service.list_fields_short(schema_name)

        @self.tool(annotations=_READ_ONLY_ANNOTATIONS)
        def schema_builder_get_schema_field_by_keys(
            file_name: Annotated[
                str,
                Field(description="Excel file name."),
            ],
            schema_name: Annotated[
                str,
                Field(
                    description="The name of the sheet within the Excel file to get the fields from."
                ),
            ],
            field_keys: Annotated[
                list[str],
                Field(description="The keys of the fields to retrieve from the schema."),
            ],
        ):
            """Returns the full field definitions from the generated Excel schema file."""
            output_dir = os.getenv("EXCEL_OUTPUT_DIR", "./data/output")

            schema_manager_service = JSONSchemaManagerService(file_name, output_dir=output_dir)

            return schema_manager_service.get_fields_by_keys(schema_name, field_keys)

        @self.tool(annotations=_ADDITIVE_ANNOTATIONS)
        def schema_builder_add_schema_fields(
            file_name: Annotated[
                str,
                Field(description="Excel file name."),
            ],
            schema_name: Annotated[
                str,
                Field(
                    description="The name of the sheet (schema) within the Excel file to update."
                ),
            ],
            schema_fields: Annotated[
                list[dict],
                Field(
                    description="List of schema fields to add. The elements of schema_fields must follow the 'SchemaField' model!"
                ),
            ],
            position: Annotated[
                int | None,
                Field(
                    description="Optional position to insert the new fields. If not specified, they will be added to the end."
                ),
            ] = None,
        ):
            """Appends new fields to an existing schema (sheet) in the Excel file."""
            TypeAdapter(SchemaFields).validate_python(schema_fields)
            output_dir = os.getenv("EXCEL_OUTPUT_DIR", "./data/output")

            schema_manager_service = JSONSchemaManagerService(file_name, output_dir=output_dir)

            result = schema_manager_service.insert_fields(
                schema_name,
                schema_fields,
                position,
            )
            schema_manager_service.create_excel()

            if result.errors:
                return {
                    "message": "Schema fields added with some errors.",
                    "errors": result.errors,
                    "inserted_field_keys": result.inserted_field_keys,
                }

            return {"message": "Schema fields added successfully."}

        @self.tool(annotations=_IDEMPOTENT_UPDATE_ANNOTATIONS)
        def schema_builder_patch_schema_fields(
            file_name: Annotated[
                str,
                Field(description="Excel file name."),
            ],
            schema_name: Annotated[
                str,
                Field(description="The name of the sheet (schema) within the Excel file to patch."),
            ],
            schema_fields: Annotated[
                list[dict],
                Field(
                    description="List of schema fields to patch. The elements of schema_fields must follow the 'SchemaField' model!"
                ),
            ],
        ):
            """Patches existing fields in a schema by matching on the field's key."""

            output_dir = os.getenv("EXCEL_OUTPUT_DIR", "./data/output")

            schema_manager_service = JSONSchemaManagerService(file_name, output_dir=output_dir)

            result = schema_manager_service.patch_fields(
                schema_name,
                schema_fields,
            )

            schema_manager_service.create_excel()

            if result.errors:
                return {
                    "message": "Schema fields patched with some errors.",
                    "errors": result.errors,
                    "updated_field_keys": result.updated_field_keys,
                }

            return {"message": "Schema fields patched successfully.", "warnings": result.warnings}

        @self.tool(annotations=_DESTRUCTIVE_ANNOTATIONS)
        def schema_builder_remove_schema_fields(
            file_name: Annotated[
                str,
                Field(description="Excel file name."),
            ],
            schema_name: Annotated[
                str,
                Field(
                    description="The name of the sheet within the Excel file to remove fields from."
                ),
            ],
            field_keys: Annotated[
                list[str],
                Field(description="List of field keys to remove from the Excel schema."),
            ],
        ):
            """Removes specific fields from a schema (sheet) in the generated Excel schema file."""
            output_dir = os.getenv("EXCEL_OUTPUT_DIR", "./data/output")

            schema_manager_service = JSONSchemaManagerService(file_name, output_dir=output_dir)

            res = schema_manager_service.remove_fields(schema_name, field_keys)
            schema_manager_service.create_excel()

            if res.errors:
                return {
                    "message": "Schema fields removed with some errors.",
                    "errors": res.errors,
                    "removed_field_keys": res.removed_field_keys,
                }

            return {
                "message": "Schema fields removed successfully.",
                "warnings": res.warnings,
            }

        @self.tool(annotations=_DESTRUCTIVE_ANNOTATIONS)
        def schema_builder_remove_schemas(
            file_name: Annotated[
                str,
                Field(description="Excel file name."),
            ],
            schema_names: Annotated[
                list[str],
                Field(description="The names of the sheets within the Excel file to remove."),
            ],
        ):
            """Removes specific schemas (sheets) from the generated Excel schema file."""
            output_dir = os.getenv("EXCEL_OUTPUT_DIR", "./data/output")

            schema_manager_service = JSONSchemaManagerService(file_name, output_dir=output_dir)

            res = schema_manager_service.remove_schemas(
                schema_names,
            )
            schema_manager_service.create_excel()

            if res.errors:
                return {
                    "message": "Schemas removed with some errors.",
                    "errors": res.errors,
                    "removed_schema_names": res.removed_schema_names,
                }

            return {
                "message": "Schemas removed successfully.",
                "warnings": res.warnings,
                "removed_schema_names": res.removed_schema_names,
            }
