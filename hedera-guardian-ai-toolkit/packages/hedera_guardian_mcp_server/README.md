# Hedera Guardian MCP Server

Model Context Protocol (MCP) server providing semantic search and schema builder tools for the Hedera Guardian Service. Connects to a Qdrant vector database and uses BGE-M3 ONNX embeddings for hybrid search (dense + sparse vectors).

## Features

- **Schema Properties Search**: Semantic search across indexed JSON schema properties
- **Methodology Document Search**: Semantic search across methodology document chunks
- **Schema Builder**: Full CRUD for Guardian Policy Schemas via Excel files (create, read, update, delete schemas and fields)
- **FastMCP Integration**: Built on FastMCP framework with StreamableHTTP and stdio transports

## Architecture

```text
JSON Schemas → Schema Ingestion Worker → Qdrant (schema_properties)
                  (async pipeline)             ↓
                                        MCP Server (Port 9000) → Search Tools
                                             ↓
Methodology PDFs → Document Ingestion Worker → Qdrant (methodology_documents)
```

### Modules

- `mcp_server.server`: Main MCP server with tools and custom routes
- `mcp_server.models`: Pydantic models for search filters
- `mcp_server.settings`: Pydantic settings for server configuration
- `mcp_server.middleware`: Tool logging middleware

## Prerequisites

Before installing and running the MCP server, ensure you have:

1. **Qdrant Vector Database**: Running instance of Qdrant (default: localhost:6333)
   ```bash
   # Start Qdrant using Docker Compose (from repository root)
   docker compose up -d qdrant
   ```

2. **Python 3.11+**: Required for running the server

3. **Poetry**: Python dependency management tool
   ```bash
   # Install Poetry (if not already installed)
   pip install poetry
   ```

4. **Data Ingestion** (Optional): For the server to return results, you need indexed data:
   - **Schema Properties**: Run the Schema Ingestion Worker to index JSON schemas
   - **Methodology Documents**: Run the Document Ingestion Worker to index PDF methodologies

   See the [root README](../../README.md) for ingestion commands.

## Installation

From the hedera_guardian_mcp_server directory:

```bash
poetry install
```

This will install the package in development mode with all dependencies.

## Configuration

The MCP server can be configured using environment variables. Configuration is managed through Pydantic Settings with sensible defaults.

### Environment Variables

The server uses individual `validation_alias` names (no shared prefix). Key variables:

- `MCP_SERVER_HOST` / `MCP_SERVER_PORT` — bind address and port (HTTP transport only)
- `QDRANT_HOST` / `QDRANT_PORT` — Qdrant connection
- `QDRANT_API_KEY` — optional Qdrant API key (see [CONFIG.md](CONFIG.md))
- `EMBEDDING_PROVIDER` / `EMBEDDING_MODEL` — embedding configuration
- `EXCEL_OUTPUT_DIR` — output directory for generated Excel schema files

All variables have sensible defaults for local development. See [CONFIG.md](CONFIG.md) for the complete reference with types, defaults, validation ranges, and Docker configuration.

## Usage

### Running the Server

The server supports two transport modes:

#### HTTP Transport (Default)
```bash
# From the hedera_guardian_mcp_server directory
poetry run python -m mcp_server

```

This starts the server on `http://localhost:9000/mcp` using StreamableHTTP transport.

#### Stdio Transport (for Claude Desktop)
```bash
poetry run python -m mcp_server --stdio
```

This starts the server using stdio transport, suitable for direct integration with Claude Desktop.

### Connecting to Claude Desktop

For full setup instructions (config file location, directory creation, verification, troubleshooting), see the [Claude Desktop Integration](../../docs/USER-GUIDE.md#claude-desktop-integration) section in the User Guide.

**Configuration (Docker — recommended):**
```json
{
  "mcpServers": {
    "hedera-guardian-mcp-server": {
        "command": "npx",
        "args": [
            "mcp-remote@latest",
            "http://localhost:9000/mcp"
        ]
    }
  }
}
```

**Configuration (Local — stdio transport):**
```json
{
  "mcpServers": {
    "hedera-guardian-mcp-server": {
      "command": "poetry",
      "args": [
        "run",
        "python",
        "-m",
        "mcp_server",
        "--stdio"
      ],
      "cwd": "/path/to/hedera-guardian-ai-toolkit/packages/hedera_guardian_mcp_server"
    }
  }
}
```

After adding configuration, restart Claude Desktop completely.

### Using the MCP Client

```python
from fastmcp.client import Client

async with Client("http://localhost:9000/mcp") as client:
    # Search methodology documents
    result = await client.call_tool(
        name="methodology_documents_search",
        arguments={"query": "data validation", "limit": 5}
    )

    # Search schema properties
    result = await client.call_tool(
        name="schema_properties_search",
        arguments={"query": "project name", "limit": 10}
    )
```

## Available Tools

### Search Tools

#### `schema_properties_search`
Search relevant JSON schema properties using semantic search and/or metadata filters.

**Parameters**:
- `query` (str, optional): Semantic query to find specific JSON schema properties. If omitted, relies entirely on filters.
- `filter` (object, optional): Optional metadata filters with must/should/must_not conditions.
- `limit` (int, default=5): Maximum number of results to return.
- `offset` (int, optional): Number of results to skip for pagination.

**Returns**: List of `SearchResult` objects with relevance scores.

#### `schema_properties_get_index_status`
Get indexing status of schema properties.

**Returns**: `CollectionStats` object with collection status, point count, and indexing progress.

#### `methodology_documents_search`
Search methodology documents using semantic text search and/or metadata filters.

**Parameters**:
- `query` (str, optional): Semantic search query string. If omitted, relies entirely on filters.
- `filter` (object, optional): Optional metadata filters with must/should/must_not conditions.
- `limit` (int, default=5): Maximum number of results to return.
- `offset` (int, optional): Number of results to skip for pagination.

**Returns**: List of `SearchResult` objects with relevance scores.

#### `methodology_documents_get_index_status`
Get indexing status of methodology documents.

**Returns**: `CollectionStats` object with collection status, point count, and indexing progress.

### Schema Builder Tools

#### `schema_builder_create_schemas`
Primary tool for creating or extending Guardian Schemas within an Excel file. Generates a new schema file or appends new sheets to an existing workbook.

**Parameters**:
- `file_name` (str): Excel file name to save the generated schema data to.
- `guardian_policy_schemas` (list): List of Guardian Policy Schemas to include.
- `extend_existing` (bool, default=false): Whether to extend an existing Excel file.

**Returns**: Object with message, download URL, file path, and file name.

#### `schema_builder_get_schema_list`
Retrieves a list of schemas from the generated Excel schema file.

**Parameters**:
- `file_name` (str): Excel file name.

**Returns**: List of schema short info (name, metadata).

#### `schema_builder_get_schema_field_list`
Returns the list of fields (field_type, key, question) for a specific schema from the generated Excel schema file.

**Parameters**:
- `file_name` (str): Excel file name.
- `schema_name` (str): The name of the sheet within the Excel file.

**Returns**: List of field short info.

#### `schema_builder_get_schema_field_by_keys`
Returns the full field definitions from the generated Excel schema file.

**Parameters**:
- `file_name` (str): Excel file name.
- `schema_name` (str): The name of the sheet within the Excel file.
- `field_keys` (list[str]): The keys of the fields to retrieve.

**Returns**: List of full field definitions.

#### `schema_builder_add_schema_fields`
Appends new fields to an existing schema (sheet) in the Excel file.

**Parameters**:
- `file_name` (str): Excel file name.
- `schema_name` (str): The name of the sheet (schema) to update.
- `schema_fields` (list[dict]): List of schema fields to add (must follow SchemaField model).
- `position` (int, optional): Position to insert new fields. If not specified, appended to end.

**Returns**: Success message, or message with errors and inserted field keys.

#### `schema_builder_patch_schema_fields`
Patches existing fields in a schema by matching on the field's key.

**Parameters**:
- `file_name` (str): Excel file name.
- `schema_name` (str): The name of the sheet (schema) to patch.
- `schema_fields` (list[dict]): List of schema fields to patch (must follow SchemaField model).

**Returns**: Success message with warnings, or message with errors and updated field keys.

#### `schema_builder_remove_schema_fields`
Removes specific fields from a schema (sheet) in the generated Excel schema file.

**Parameters**:
- `file_name` (str): Excel file name.
- `schema_name` (str): The name of the sheet to remove fields from.
- `field_keys` (list[str]): List of field keys to remove.

**Returns**: Success message with warnings, or message with errors and removed field keys.

#### `schema_builder_remove_schemas`
Removes specific schemas (sheets) from the generated Excel schema file.

**Parameters**:
- `file_name` (str): Excel file name.
- `schema_names` (list[str]): The names of the sheets to remove.

**Returns**: Success message with removed schema names, or message with errors.

### Custom HTTP Routes

#### `GET /download-excel/{file_path}`
Downloads a generated Excel file. Schema builder tools return download URLs pointing to this endpoint.

- **Path**: The file name relative to `EXCEL_OUTPUT_DIR`
- **Response**: Excel file (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
- **Security**: Path traversal protection ensures files are served only from within `EXCEL_OUTPUT_DIR`

## Testing

Run tests from the package directory:

```bash
# From packages/hedera_guardian_mcp_server

# Unit tests
poetry run pytest ../../tests/hedera_guardian_mcp_server/unit/ -v

# With inline snapshot review (after code changes)
poetry run pytest ../../tests/hedera_guardian_mcp_server/ --inline-snapshot=review
```

### MCP Inspector

Test the server interactively using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector --server-url http://localhost:9000/mcp
```

### Development

```bash
# Code formatting
poetry run ruff format .

# Linting
poetry run ruff check .
```

## Docker

Build and run the server in Docker:

```bash
# Recommended: use docker compose (handles volumes, env vars, health checks)
docker compose up -d hedera-guardian-mcp-server

# Alternative: standalone build (advanced — no model cache or health checks)
docker build -t hedera-guardian-mcp-server:latest .
docker run -p 9000:9000 hedera-guardian-mcp-server:latest
```

## Troubleshooting

### Qdrant Connection Errors

**Issue**: `Failed to connect to Qdrant server` or connection timeout errors

**Solutions**:
1. Verify Qdrant is running:
   ```bash
   # Check if Qdrant is responding
   curl http://localhost:6333/

   # Or check Docker container status
   docker ps | grep qdrant
   ```

2. Start Qdrant if not running:
   ```bash
   docker compose up -d qdrant
   ```

3. Check connection settings:
   - Verify `QDRANT_HOST` and `QDRANT_PORT` match your Qdrant instance
   - If using Docker, ensure network connectivity between containers

### Port Already in Use

**Issue**: `Address already in use` or port 9000 conflict

**Solutions**:
1. Check what's using port 9000:
   ```bash
   # Windows
   netstat -ano | findstr :9000

   # Linux/macOS
   lsof -i :9000
   ```

2. Change the MCP server port:
   ```bash
   export MCP_SERVER_PORT=9001
   poetry run python -m mcp_server
   ```

3. Update Claude Desktop config to match the new port:
   ```json
   "args": ["mcp-remote@latest", "http://localhost:9001/mcp"]
   ```

### MCP Inspector Connection Issues

**Issue**: MCP Inspector fails to connect or shows "Connection refused"

**Solutions**:
1. Ensure the server is running in HTTP mode (not stdio):
   ```bash
   poetry run python -m mcp_server
   ```

2. Verify the server started successfully:
   - Look for log message: `Successfully connected to Qdrant server`
   - Check the server is listening on port 9000

3. Check the Inspector URL matches the server:
   ```bash
   npx @modelcontextprotocol/inspector --server-url http://localhost:9000/mcp
   ```

### Empty Search Results

**Issue**: Tools return no results or empty collections

**Solutions**:
1. Verify collections exist in Qdrant:
   ```bash
   curl http://localhost:6333/collections
   ```

2. Check collection has data:
   ```bash
   # Schema collection
   curl http://localhost:6333/collections/schema_properties

   # Methodology collection
   curl http://localhost:6333/collections/methodology_documents
   ```

3. Run ingestion workers to populate collections:
   ```bash
   # Index schemas
   docker compose run --rm schema-ingestion-worker

   # Index documents
   docker compose run --rm document-ingestion-worker
   ```

4. Verify collection names match configuration:
   - Check `QDRANT_SCHEMA_COLLECTION` and `QDRANT_METHODOLOGY_COLLECTION`
   - Default: `schema_properties` and `methodology_documents`

### Claude Desktop Integration Issues

**Issue**: MCP server not appearing in Claude Desktop or tools not working

**Solutions**:
1. Verify config file location:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. Check JSON syntax is valid (use a JSON validator)

3. Restart Claude Desktop completely (quit and reopen)

4. Check Claude Desktop logs for errors:
   - Windows: `%APPDATA%\Claude\logs\`
   - macOS: `~/Library/Logs/Claude/`
   - Linux: `~/.config/Claude/logs/`

### Embedding Model Download Issues

**Issue**: First run is slow or fails downloading embedding model

**Solutions**:
1. The BGE-M3 ONNX model is downloaded automatically on first run
2. Ensure stable internet connection
3. Model is cached locally after first download (~2.3 GB)
4. Check disk space: model cache requires ~2.3 GB free space

### Tool Logging

**Issue**: Need more detailed debugging information

**Solutions**:
Enable verbose tool logging:
```bash
export MCP_SERVER_LOG_LEVEL=DEBUG
export MCP_SERVER_TOOL_LOGGING_ENABLED=true
poetry run python -m mcp_server
```

This will log all tool calls, arguments, and responses.

## Contributing

For development guidelines and contribution instructions, see [CONTRIBUTING.md](../../docs/CONTRIBUTING.md).

## License

MIT License - see [LICENSE](../../LICENSE) for details.
