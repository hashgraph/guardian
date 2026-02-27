---
icon: message-bot
---

# Hedera Guardian AI Toolkit

## Turning Complex Methodologies into Machine-Readable Infrastructure

Digitizing environmental methodologies is slow, manual, and error-prone.

Turning a 100+ page PDF into a working digital policy can take months. Analysts must manually extract parameters, rules, roles, calculations, conditional logic, and schema definitions.

The Hedera Guardian AI Toolkit accelerates the hardest part of that process.

It ingests methodology documents, makes them searchable by meaning, and enables structured schema generation using natural language — while keeping humans in control.

***

## What This Toolkit Does

This open-source toolkit helps domain experts move from:

**Long, complex PDF**\
→ **Searchable, structured knowledge**\
→ **Guardian-ready schema drafts**

It combines:

* A document ingestion pipeline
* A vector database (Qdrant)
* A Model Context Protocol (MCP) server
* Guardian schema generation utilities

The result is a controlled AI workflow that works only on the documents you provide — not general internet knowledge.

***

## Who This Is For

This toolkit is designed for:

* Climate and MRV analysts
* Policy designers
* Guardian developers
* AI engineers working with structured regulatory content

It is not a fully automated policy engine.\
It is infrastructure that makes expert work significantly faster.

***

## High-Level Flow

{% stepper %}
{% step %}
### Place methodology documents

Place methodology documents (PDF or DOCX) into the system.
{% endstep %}

{% step %}
### Ingest and index content

The ingestion pipeline parses content, extracts tables and formulas, and indexes everything into a vector database.
{% endstep %}

{% step %}
### Expose knowledge via MCP

The MCP server exposes that knowledge to any MCP-compatible AI client.
{% endstep %}

{% step %}
### Use the system

You can:

* Search methodologies semantically
* Ask grounded natural language questions
* Generate Guardian-compatible Excel schema drafts
* Perform structured schema matching and mapping
{% endstep %}
{% endstepper %}

***

## Why MCP Matters

{% hint style="info" %}
Without MCP, an AI model only uses general training data.

With MCP:

* The AI searches your local methodology documents
* It cites exact sections
* It generates structured outputs (including schema files)
* It operates within controlled document boundaries
{% endhint %}

This transforms a general-purpose LLM into a controlled research assistant for structured digitization.

***

## Key Capabilities

* Hybrid semantic search (dense + sparse retrieval)
* PDF/DOCX ingestion with table extraction and formula-to-LaTeX conversion
* Guardian schema generation in Excel format
* JSON schema ingestion and property-level embeddings
* Multi-context semantic matching for schema mapping
* MCP server exposing structured tools to AI clients
* Docker-based deployment (standard, GPU, and low-memory profiles)

***

## What This Toolkit Is Not

{% hint style="warning" %}
* It does not automatically build full Guardian policies.
* It does not replace human validation.
* It does not eliminate expert oversight.
* It does not execute external registry integrations autonomously.
{% endhint %}

Policy logic and final validation remain human-led by design.

***

## Architecture Overview

The toolkit consists of four core components:

* **Document Ingestion Worker** — Converts PDF/DOCX into structured vector embeddings
* **Schema Ingestion Worker** — Indexes JSON schemas for semantic comparison
* **Vector Store (Qdrant)** — Stores embeddings for semantic retrieval
* **MCP Server** — Exposes structured tools to AI clients

All components run locally via Docker and can be deployed in multiple configurations.

***

## What’s Next

{% stepper %}
{% step %}
### [Repository & Architecture Walkthrough](repository-and-architecture-wlakthrough.md)
{% endstep %}

{% step %}
### [Installation & Setup From Zero](installation-and-setup-from-zero.md)
{% endstep %}

{% step %}
### [First Ingestion & Semantic Search](first-ingestion-and-semantic-search.md)
{% endstep %}

{% step %}
### [Schema & Formula Generation](schema-and-formula-generation.md)
{% endstep %}

{% step %}
### [Schema Ingestion & Mapping](mapping-and-transformation.md)
{% endstep %}
{% endstepper %}

By the end of this journey, you will have:

* A searchable methodology knowledge base
* AI-assisted schema generation
* Structured mapping capabilities
* A controlled, auditable digitization workflow
