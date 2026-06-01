# Quickstart Guide

> **Audience:** New users getting started — condensed version of the [User Guide](USER-GUIDE.md)

Get the Hedera Guardian AI Toolkit running and perform your first semantic search.

> **Note:** The first run builds Docker images and downloads ML models (~8-12 GB of disk space total). This may take 15-30 minutes depending on your system and connection. Subsequent runs reuse cached images and models.

## Prerequisites

| Requirement | Version | Download |
|-------------|---------|----------|
| Docker Desktop | 20.10+ | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Git | any | [git-scm.com](https://git-scm.com/downloads) |
| Node.js | 22+ | [nodejs.org](https://nodejs.org/) |
| Python + Poetry *(local dev only)* | 3.11+ / 2.0+ | [python.org](https://www.python.org/downloads/) / [poetry docs](https://python-poetry.org/docs/#installation) |

For installation details, see [Prerequisites](USER-GUIDE.md#prerequisites) in the User Guide.

---

## Step 1: Clone and Configure

```bash
git clone <repository-url>
cd hedera-guardian-ai-toolkit
cp .env.example .env     # macOS/Linux (Windows: copy .env.example .env)
```

> **Local development only:** Also run `poetry install` to set up the Python environment.

---

## Step 2: Start Services

```bash
docker compose up -d
docker compose ps          # Wait for both to show (healthy)
```

This starts two infrastructure services:
- **Qdrant** — vector database (port 6333)
- **MCP Server** — search and schema tools (port 9000)

> **First run:** Docker builds the MCP server image and pulls the Qdrant image. The MCP server also downloads its embedding model (~2.3 GB) on first start — wait for `(healthy)` status in `docker compose ps` (takes up to ~60 seconds).

> **Note:** Ingestion workers are on-demand and do **not** start with this command. See [DOCKER.md](DOCKER.md#understanding-profiles) for details on service profiles.

See [DOCKER.md](DOCKER.md) for memory profiles and configuration options.

---

## Step 3: Prepare Documents

Create the input directory and add your methodology PDFs:

```bash
# Windows
mkdir data\input\documents

# macOS/Linux
mkdir -p data/input/documents
```

Copy your PDF or DOCX methodology files into `data/input/documents/`.

> **Tip:** See the [Pre-Ingestion Checklist](USER-GUIDE.md#pre-ingestion-checklist) in the User Guide for document preparation best practices.

---

## Step 4: Run Document Ingestion

Index the documents into Qdrant:

```bash
# Using Docker (recommended)
docker compose run --rm document-ingestion-worker

# Or locally
cd packages/document_ingestion_worker
poetry run python -m document_ingestion_worker
cd ../..
```

You should see output like:
```
Processing documents...
[OK] VM0042-methodology: 45 chunks, 45 vectors, 12.3s

Execution Summary
================================================
Total documents:      1
Successful:           1
Total chunks:         45
```

> **First run takes longer** — Docker builds the worker image and downloads ML models (~3.7 GB). This can take 10-15 minutes. Subsequent runs reuse cached images and models. See [DOCKER.md](DOCKER.md#model-caching) for details.

> **Low memory (8-12 GB)?** Use the low-memory override:
> ```bash
> docker compose -f docker-compose.yml -f docker-compose.low-memory.yml run --rm document-ingestion-worker
> ```
> For OCR, GPU acceleration, and other options, see [Advanced Ingestion Options](USER-GUIDE.md#advanced-ingestion-options) in the User Guide.

---

## Step 5: Verify Indexing

Check that data was indexed in Qdrant:

```bash
curl http://localhost:6333/collections/methodology_documents
```

Look for `"points_count"` matching the total chunks from ingestion.

You can also open the Qdrant dashboard: http://localhost:6333/dashboard

---

## Step 6: Test Semantic Search

Verify the MCP server is reachable:

```bash
curl http://localhost:9000/
```

Then use the MCP Inspector to test queries:

```bash
npx @modelcontextprotocol/inspector --server-url http://localhost:9000/mcp
```

In the Inspector:
1. Click on "Tools" tab
2. Select `methodology_documents_search`
3. Enter query: `baseline emission calculations`
4. Click "Run"

You should see results matching content from your ingested documents.

---

## Step 7: Connect Claude Desktop (Optional)

For detailed Claude Desktop integration (config file location, setup, verification), see the [Claude Desktop Integration](USER-GUIDE.md#claude-desktop-integration) section in the User Guide.

**Quick setup** — add this to your `claude_desktop_config.json`:

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

Then restart Claude Desktop completely.

---

## What's Next?

- **Index JSON Schemas** — `docker compose run --rm schema-ingestion-worker` (see [Schema Ingestion Worker README](../packages/schema_ingestion_worker/README.md))
- **Ingestion modes** — both workers default to `override` (clears and re-indexes); use `append` for incremental ingestion. See each worker's README.

| Topic | Documentation |
|-------|---------------|
| Full User Guide | [USER-GUIDE.md](USER-GUIDE.md) |
| Docker Configuration | [DOCKER.md](DOCKER.md) |
| ML/AI Models | [MODELS.md](MODELS.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |

---

## Troubleshooting

- **"Connection refused" to Qdrant** — `docker compose up -d && docker compose ps`
- **"No documents found"** — Check `data/input/documents/` has `.pdf` or `.docx` files
- **Docker not starting** — Ensure Docker Desktop is running: `docker info`
- **MCP Inspector won't connect** — `curl http://localhost:9000/ && docker compose logs hedera-guardian-mcp-server`
- **MCP server shows "starting" for a long time** — The embedding model takes 30-45 seconds to load on first start. Run `docker compose ps` and wait for `(healthy)` status
- **First `docker compose run` is very slow** — On first run, Docker builds the worker image. This is normal and only happens once. Subsequent runs start immediately

For more troubleshooting help, see [Troubleshooting](USER-GUIDE.md#troubleshooting) in the User Guide.
