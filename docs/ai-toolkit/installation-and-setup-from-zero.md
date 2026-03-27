---
icon: sign-posts-wrench
---

# Installation\_And\_Setup\_From\_Zero

This guide walks through installing and running the Hedera Guardian AI Toolkit on a clean system.

The goal is to:

* Start required infrastructure services
* Build toolkit services
* Verify container health
* Connect the MCP server to an AI client
* Confirm the system is operational

***

## Prerequisites

Before starting, ensure the following are installed:

* Docker Desktop
* Node.js
* Claude Desktop (or another MCP-compatible client)

Docker should be installed and running. A clean environment with no running containers is recommended for first-time setup.

***

## Setup Steps

{% stepper %}
{% step %}
### Navigate to the Repository

Open a terminal and navigate to the root of the repository:

```bash
cd hedera-guardian-ai-toolkit
```

All commands below assume you are in the repository root directory.
{% endstep %}

{% step %}
### Start Qdrant (Vector Database)

Qdrant is the vector database used to store embeddings.

Pull and start Qdrant:

```bash
docker compose up qdrant
```

On first run:

* The Qdrant image will be pulled from Docker Hub.
* The container will start and run continuously.

You can verify:

* The container is visible and running in Docker Desktop.
* The Qdrant web UI is accessible in your browser.
* No collections will exist yet, which is expected.
{% endstep %}

{% step %}
### Build the MCP Server

The MCP server exposes semantic search and schema tools.

Build the image:

```bash
docker compose build hedera_guardian_mcp_server
```

On first build:

* Dependencies will be installed.
* The Docker image will be created and cached locally.
* An embedding model (\~2GB) will be downloaded and cached.

Once built, start the MCP server:

```bash
docker compose up hedera_guardian_mcp_server
```

You can verify:

* The container is running.
* The health status reports as healthy.
{% endstep %}

{% step %}
### Verify Container Health

Check running services:

```bash
docker compose ps
```

Expected running services:

* qdrant
* hedera\_guardian\_mcp\_server

Both should show as running and healthy.
{% endstep %}

{% step %}
### Connect the MCP Server to Claude Desktop

Open Claude Desktop.

Navigate to:

Settings → Developer → Edit Config

In the `mcpServers` section, add the MCP server configuration as defined in the repository user guide.

Save the configuration file.

Important: Completely restart Claude Desktop after saving changes.
{% endstep %}

{% step %}
### Verify MCP Tools Are Available

After restarting Claude:

1. Open Settings.
2. Navigate to Connectors.
3. Confirm the MCP server appears.
4. Confirm the available tools are listed.

The MCP server should expose tools for:

* Methodology document search
* Schema property search
* Index status checks
* Schema creation and modification

If the tools are visible, the connection is successful.
{% endstep %}

{% step %}
### Smoke Test the MCP Connection

Open a new chat in Claude and ask it to check for documents.

Since no documents have been ingested yet, the expected behavior is:

* Claude calls the semantic search tool.
* The MCP server queries Qdrant.
* The response indicates no documents found.

This confirms:

* Claude can call MCP tools.
* The MCP server is connected to Qdrant.
* The system is functioning correctly.
{% endstep %}

{% step %}
### Build the Document Ingestion Worker

The document ingestion worker processes PDF/DOCX files and loads embeddings into Qdrant.

Build the worker image:

```bash
docker compose build document_ingestion_worker
```

Note:

* This build takes longer than the MCP server.
* It includes heavy ML dependencies for document processing.

To test-run the worker:

```bash
docker compose run --rm document_ingestion_worker
```

If no documents exist in the input directory:

* The worker will start.
* Detect no files.
* Exit cleanly.

This confirms the ingestion worker is operational.
{% endstep %}
{% endstepper %}

***

## Optional: Rebuild Without Cache

If you update source code and need a full rebuild:

```bash
docker compose build --no-cache
```

This clears cached layers and rebuilds images from scratch.

Use this if:

* Changes are not reflected.
* Cached layers cause inconsistencies.

***

## Service Overview

After setup, the system consists of:

### Always Running

* Qdrant — Vector database
* MCP Server — AI integration layer

### On-Demand Workers

* Document Ingestion Worker
* Schema Ingestion Worker

Workers run when executed, process input, and then stop.

***

## Next Steps

Now that installation is complete:

* Add methodology documents to the input directory.
* Run document ingestion.
* Verify indexed collections in Qdrant.
* Perform semantic search through Claude.
* Begin generating Guardian schemas.

Proceed to **First Ingestion & Semantic Search** to continue.
