---
icon: head-side-virus
---

# First\_Ingestion\_And\_Semantic\_Search

## First Ingestion & Semantic Search

This guide walks through your first end-to-end ingestion and semantic search workflow using the Hedera Guardian AI Toolkit.

***

### Overview

At this stage, your infrastructure services should already be running:

* Qdrant (vector database)
* MCP Server

You will complete the end-to-end workflow in five steps.

{% stepper %}
{% step %}
### Step 1 — Add Your Documents

Place your methodology files into:

```
data/input/documents/
```

Supported formats:

* PDF
* DOCX

You may add:

* Full methodologies (100+ pages)
* Templates
* Supporting documentation

Each file will be processed independently and indexed into the vector database.
{% endstep %}

{% step %}
### Step 2 — Run Document Ingestion

From the root of the repository:

#### Standard profile:

```
docker compose run --rm document-ingestion-worker
```

#### GPU profile (if configured):

```
docker compose -f docker-compose.yml -f docker-compose.gpu.yml run --rm document-ingestion-worker
```

#### Low-memory profile:

```
docker compose -f docker-compose.yml -f docker-compose.low-memory.yml run --rm document-ingestion-worker
```
{% endstep %}

{% step %}
### Step 3 — Verify Ingestion

Once ingestion completes:

* A Qdrant collection named `methodology_documents` will exist
* The collection will contain one point per chunk

You can verify via:

```
http://localhost:6333/dashboard
```

Each stored record contains:

* The chunk text
* Embedding vectors
* Metadata
* LaTeX formulas (when applicable)
{% endstep %}

{% step %}
### Step 4 — Connect Your MCP Client

Your MCP Server should already be running at:

```
http://localhost:9000
```

To verify:

```
npx @modelcontextprotocol/inspector --server-url http://localhost:9000/mcp
```

You should see available tools including:

* Semantic search tools
* Schema builder tools
{% endstep %}

{% step %}
### Step 5 — Perform Your First Semantic Search

Using an MCP-compatible AI client (e.g., Claude Desktop):

Ask a grounded question such as:

* What are the applicability conditions defined in VM42?
* What quantification approaches are defined in this methodology?
* What data parameters must be monitored during the crediting period?

The AI will:

1. Call the semantic search tool
2. Retrieve relevant chunks
3. Filter by metadata if necessary
4. Generate a response grounded in document content

Responses may:

* Cite sections
* Extract structured data from tables
* Present formulas
* Suggest next steps (such as schema generation)
{% endstep %}
{% endstepper %}

***

## What Happens During Ingestion

When ingestion starts, the system:

1. Discovers documents in the input folder
2. Creates a collection in Qdrant (if it does not exist)
3. Processes each document in parallel
4. Extracts:
   * Text
   * Section structure
   * Tables
   * Formulas
5. Performs post-processing
6. Splits documents into contextual chunks
7. Converts chunks into vector embeddings
8. Stores embeddings and metadata in Qdrant

***

### Advanced Processing Steps

The ingestion pipeline includes:

#### Formula Recognition

* Formulas are detected
* Converted to LaTeX
* Repaired if split across layout blocks
* Processed using OCR when necessary

#### Table Normalization

* Multi-page tables are detected
* Split tables are merged into single logical units

#### Metadata Enrichment

Each stored chunk includes metadata such as:

* Chunk ID
* Heading
* Document structure path
* Page number
* Source filename
* has\_formula flag
* has\_table flag

These metadata flags allow targeted semantic filtering during search.

***

## How Semantic Search Works

The toolkit uses hybrid retrieval:

* Dense embeddings (semantic meaning)
* Sparse retrieval (keyword matching)

Chunks are ranked using reciprocal rank fusion.

The result:

* High recall
* High precision
* Context-aware retrieval
* Reduced hallucination risk

The AI does not use internet knowledge.\
It operates only on your ingested documents.

***

## What Success Looks Like

You have successfully completed this stage when:

* Documents are indexed
* Qdrant contains chunk records
* The MCP server exposes tools
* Your AI client can answer methodology-specific questions
* Responses reflect actual document content

At this point, you have transformed static PDFs into a searchable knowledge base.

***

## What Comes Next

Now that you can search methodologies semantically, the next step is:

* Generating Guardian-compatible schemas
* Extracting formulas into structured definitions
* Beginning structured digitization workflows

Proceed to:

**Schema & Formula Generation**
