---
icon: message-bot
---

# Hedera Guardian AI Toolkit

### 1. Turning Complex Methodologies into Machine-Readable Infrastructure

* Digitizing environmental methodologies is slow, manual, and error-prone.
* Turning a 100+ page PDF into a working digital policy can take months. Analysts must manually extract parameters, rules, roles, calculations, conditional logic, and schema definitions.
* The Hedera Guardian AI Toolkit accelerates the hardest part of that process.
* It ingests methodology documents, makes them searchable by meaning, and enables structured schema generation using natural language — while keeping humans in control.

### &#x20;2. What This Toolkit Does

This open-source toolkit helps domain experts move from:

* Long, complex PDF
* Searchable, structured knowledge
* Guardian-ready schema drafts

It combines:

* A document ingestion pipeline &#x20;
* A vector database (Qdrant) &#x20;
* A Model Context Protocol (MCP) server &#x20;
* Guardian schema generation utilities &#x20;

The result is a controlled AI workflow that works only on the documents you provide — not general internet knowledge.

### 3. Who This Is For?

This toolkit is designed for:

* Climate and MRV analysts &#x20;
* Policy designers &#x20;
* Guardian developers &#x20;
* AI engineers working with structured regulatory content &#x20;

It is not a fully automated policy engine. &#x20;

It is infrastructure that makes expert work significantly faster.

### 4. High-Level Flow

1. Place methodology documents (PDF or DOCX) into the system. &#x20;
2. The ingestion pipeline parses content, extracts tables and formulas, and indexes everything into a vector database. &#x20;
3. The MCP server exposes that knowledge to any MCP-compatible AI client. &#x20;
4. You can:

* Search methodologies semantically &#x20;
* Ask grounded natural language questions &#x20;
* Generate Guardian-compatible Excel schema drafts &#x20;
* Perform structured schema matching and mapping &#x20;

### 5. Why MCP Matters?

Without MCP, an AI model only uses general training data.

With MCP:

* The AI searches your local methodology documents &#x20;
* It cites exact sections &#x20;
* It generates structured outputs (including schema files) &#x20;
* It operates within controlled document boundaries &#x20;

This transforms a general-purpose LLM into a controlled research assistant for structured digitization.

### 6. Key Capabilities

* Hybrid semantic search (dense + sparse retrieval) &#x20;
* PDF/DOCX ingestion with table extraction and formula-to-LaTeX conversion &#x20;
* Guardian schema generation in Excel format &#x20;
* JSON schema ingestion and property-level embeddings &#x20;
* Multi-context semantic matching for schema mapping &#x20;
* MCP server exposing structured tools to AI clients &#x20;
* Docker-based deployment (standard, GPU, and low-memory profiles)

### 7. What This Toolkit Is Not

* It does not automatically build full Guardian policies. &#x20;
* It does not replace human validation. &#x20;
* It does not eliminate expert oversight. &#x20;
* It does not execute external registry integrations autonomously. &#x20;

Policy logic and final validation remain human-led by design.

### 8. Architecture Overview

The toolkit consists of four core components:

* **Document Ingestion Worker** — Converts PDF/DOCX into structured vector embeddings &#x20;
* **Schema Ingestion Worker** — Indexes JSON schemas for semantic comparison &#x20;
* **Vector Store (Qdrant)** — Stores embeddings for semantic retrieval &#x20;
* **MCP Server** — Exposes structured tools to AI clients &#x20;

All components run locally via Docker and can be deployed in multiple configurations.

### 9. What's Next?

This documentation follows the same progression demonstrated in the recorded walkthrough series.

#### 1. Repository & Architecture Walkthrough &#x20;

Understand how the toolkit is structured:

* Package layout &#x20;
* Ingestion workers &#x20;
* Vector store &#x20;
* MCP server &#x20;
* Schema builder &#x20;
* How components interact &#x20;

Start here if you want to understand how everything fits together before running it.

#### 2. Installation & Setup From Zero &#x20;

Set up the full environment locally:

* Clone the repository &#x20;
* Configure environment variables &#x20;
* Start Docker services &#x20;
* Verify Qdrant and MCP server health &#x20;
* Confirm MCP tools are available &#x20;

This section gets you from zero to a running system.

#### 3. First Ingestion & Semantic Search &#x20;

Process your first methodology document:

* Add PDFs or DOCX files &#x20;
* Run document ingestion &#x20;
* Inspect indexed data &#x20;
* Perform semantic search via MCP &#x20;
* Validate grounded, citation-based responses &#x20;

This is where the system becomes operational.

#### 4. Schema & Formula Generation &#x20;

Move from document understanding to structured outputs:

* Create Guardian schema drafts &#x20;
* Expand subschemas by section &#x20;
* Convert extracted tables into structured fields &#x20;
* Extract and model formulas &#x20;
* Generate Excel-based schema files &#x20;

This is where methodology digitization begins.

#### 5. Schema Ingestion & Mapping &#x20;

Accelerate integration and transformation workflows:

* Ingest Guardian schemas for semantic indexing &#x20;
* Understand \`full\_path\` and \`ancestors\` metadata &#x20;
* Perform multi-context semantic matching &#x20;
* Compare similarity scores for disambiguation &#x20;
* Generate mapping candidates for external integrations &#x20;

This is where structured policy data becomes interoperable.



### **By the end of this journey, you will have:**

* **A searchable methodology knowledge base** &#x20;
* **AI-assisted schema generation** &#x20;
* **Structured mapping capabilities** &#x20;
* **A controlled, auditable digitization workflow** &#x20;

Continue to the next page to begin with the Repository & Architecture Walkthrough.
