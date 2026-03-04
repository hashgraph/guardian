# Hedera Guardian MCP Server Configuration

Complete configuration reference for the `hedera_guardian_mcp_server` package — the MCP server providing semantic search and schema builder tools.

## Environment Variables

Unlike other packages in this toolkit, the MCP server does **not** use a shared `env_prefix`. Each variable has an explicit `validation_alias`, so variable names are set individually per field.

## Configuration Loading

Configuration is loaded via Pydantic Settings with the following precedence (highest to lowest):
1. Environment variables (explicit names per field)
2. `.env` file values
3. Default values in the settings classes

## Configuration Reference

### MCP Server Settings (`McpServerSettings`)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MCP_SERVER_HOST` | str | `0.0.0.0` | Server bind address (0.0.0.0 for Docker, 127.0.0.1 for local) |
| `MCP_SERVER_PORT` | int | `9000` | Server port (only used with HTTP transport, ignored in stdio mode) |
| `MCP_SERVER_LOG_LEVEL` | str | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL) |
| `MCP_SERVER_TOOL_LOGGING_ENABLED` | bool | `false` | Enable detailed logging for tool usage (arguments, responses) |

### Embedding Provider Settings (`EmbeddingProviderSettings`)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EMBEDDING_PROVIDER` | str | `bge_m3_onnx` | Embedding provider type (`bge_m3_onnx` for hybrid search with dense + sparse vectors, `fastembed` for dense-only) |
| `EMBEDDING_MODEL` | str | `aapot/bge-m3-onnx` | Embedding model name. Must match the model used during ingestion. |

> **Important:** The embedding model and provider must match those used by the ingestion workers. Mismatched models produce incompatible vectors and return no search results.

### Qdrant Client Settings (`AsyncQdrantClientSettings`)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `QDRANT_HOST` | str | `localhost` | Qdrant server hostname. Use `qdrant` (Docker service name) when running in Docker. |
| `QDRANT_PORT` | int | `6333` | Qdrant server HTTP API port |
| `QDRANT_API_KEY` | str \| None | `None` | Qdrant API key for authentication (optional) |

The Qdrant URL is constructed internally as `http://{QDRANT_HOST}:{QDRANT_PORT}`.

### Qdrant Connector Settings (`QdrantConnectorSettings`)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `QDRANT_METHODOLOGY_COLLECTION` | str | `methodology_documents` | Qdrant collection name for methodology document chunks |
| `QDRANT_SCHEMA_COLLECTION` | str | `schema_properties` | Qdrant collection name for JSON schema properties |

### Excel Output (not Pydantic-managed)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EXCEL_OUTPUT_DIR` | str | `./data/output` | Output directory for generated Excel schema files. Read via `os.getenv()` in `server.py`, not managed by Pydantic Settings. |

## Transport Modes

The MCP server supports two transport modes:

| Mode | Command | Endpoint | Use Case |
|------|---------|----------|----------|
| **HTTP** (default) | `python -m mcp_server` | `http://localhost:9000/mcp` | Docker, MCP Inspector, remote clients |
| **stdio** | `python -m mcp_server --stdio` | stdin/stdout | Claude Desktop direct integration |

In stdio mode, `MCP_SERVER_HOST` and `MCP_SERVER_PORT` are ignored.

## Docker Configuration

The MCP server runs as an always-on infrastructure service in `docker-compose.yml`:

```yaml
hedera-guardian-mcp-server:
  build:
    context: .
    dockerfile: ./packages/hedera_guardian_mcp_server/Dockerfile
  ports:
    - "9000:9000"
  restart: unless-stopped
  volumes:
    - ./data:/data
    - huggingface_cache:/home/nonroot/.cache/huggingface
  environment:
    - HF_HOME=/home/nonroot/.cache/huggingface
    - TRANSFORMERS_VERBOSITY=error
    - QDRANT_HOST=qdrant
    - QDRANT_PORT=6333
    - QDRANT_API_KEY=${QDRANT_API_KEY:-}
    - EMBEDDING_MODEL=aapot/bge-m3-onnx
    - EMBEDDING_PROVIDER=bge_m3_onnx
    - QDRANT_SCHEMA_COLLECTION=schema_properties
    - QDRANT_METHODOLOGY_COLLECTION=methodology_documents
    - EXCEL_OUTPUT_DIR=/data/output
  mem_limit: 4g
  memswap_limit: 5g
```

Key Docker differences from local development:
- `QDRANT_HOST=qdrant` (Docker service name instead of `localhost`)
- `EXCEL_OUTPUT_DIR=/data/output` (container path, bind-mounted from `./data`)
- BGE-M3 model cached in the `huggingface_cache` named volume (~2.3 GB)

## Local Development (.env)

Create a `.env` file in the toolkit root or the package directory:

```bash
# Server settings
MCP_SERVER_HOST=0.0.0.0
MCP_SERVER_PORT=9000
MCP_SERVER_LOG_LEVEL=INFO

# Qdrant connection (local)
QDRANT_HOST=localhost
QDRANT_PORT=6333
# QDRANT_API_KEY=                # Optional API key

# Qdrant collections
QDRANT_SCHEMA_COLLECTION=schema_properties
QDRANT_METHODOLOGY_COLLECTION=methodology_documents

# Embedding configuration
EMBEDDING_MODEL=aapot/bge-m3-onnx
EMBEDDING_PROVIDER=bge_m3_onnx

# Excel output
EXCEL_OUTPUT_DIR=./data/output
```

## Environment Recommendations

### Development

```bash
MCP_SERVER_LOG_LEVEL=DEBUG
MCP_SERVER_TOOL_LOGGING_ENABLED=true
```

Verbose logging for debugging tool calls, search queries, and Qdrant interactions.

### Production

```bash
MCP_SERVER_LOG_LEVEL=WARNING
MCP_SERVER_TOOL_LOGGING_ENABLED=false
```

Minimal logging. Tool logging disabled to reduce log volume and avoid logging potentially sensitive query content.

## MCP Tools Catalog

The server exposes 12 tools across two categories:

### Search Tools (4)

| Tool | Description |
|------|-------------|
| `schema_properties_search` | Semantic search across indexed JSON schema properties |
| `schema_properties_get_index_status` | Check schema collection indexing progress |
| `methodology_documents_search` | Semantic search across methodology document chunks |
| `methodology_documents_get_index_status` | Check methodology collection indexing progress |

### Schema Builder Tools (8)

| Tool | Description |
|------|-------------|
| `schema_builder_create_schemas` | Create or extend Guardian schemas in Excel |
| `schema_builder_get_schema_list` | List schemas in an Excel file |
| `schema_builder_get_schema_field_list` | List fields for a specific schema |
| `schema_builder_get_schema_field_by_keys` | Get full field definitions by key |
| `schema_builder_add_schema_fields` | Append fields to an existing schema |
| `schema_builder_patch_schema_fields` | Patch existing fields by key |
| `schema_builder_remove_schema_fields` | Remove specific fields from a schema |
| `schema_builder_remove_schemas` | Remove schemas (sheets) from an Excel file |

## See Also

- [README.md](README.md) — Package overview, usage examples, and troubleshooting
- [Root .env.example](../../.env.example) — Environment variable template
- [DOCKER.md](../../docs/DOCKER.md) — Docker services, volumes, and memory configuration
