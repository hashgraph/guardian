---
icon: pallet-boxes
---

# Repository\_And\_Architecture\_Walkthrough

This page explains the structure of the Hedera Guardian AI Toolkit repository and how its core components work together.

***

## Purpose of the Toolkit

The AI Toolkit is designed to accelerate environmental methodology digitization.

Creating a working Guardian policy from a methodology typically requires:

* Reading large PDF or Word documents multiple times
* Extracting hundreds of parameters, rules, conditions, and formulas
* Manually building Excel schema definitions

This process can take weeks or months.

The toolkit accelerates this workflow by:

* Processing methodology documents into a searchable vector database
* Exposing that knowledge through an MCP server
* Enabling AI assistants to search documents and generate Guardian-compatible Excel schemas

***

## High-Level Workflow

{% stepper %}
{% step %}
### Place methodology documents into the input folder

Place methodology documents (PDF or DOCX) into the input folder.
{% endstep %}

{% step %}
### Run ingestion workers

Run ingestion workers.
{% endstep %}

{% step %}
### Ingestion workers parse and process documents

The ingestion workers:

* Parse documents
* Extract structured data (tables, layout, formulas)
* Split content into smaller chunks
* Convert chunks into vector embeddings
{% endstep %}

{% step %}
### Store embeddings in Qdrant

Store embeddings in a Qdrant vector database.
{% endstep %}

{% step %}
### MCP server connects Qdrant to AI assistant

The MCP server connects Qdrant to an MCP-compatible AI assistant.
{% endstep %}

{% step %}
### AI assistant capabilities

The AI assistant can:

* Perform semantic search
* Answer questions grounded in the documents
* Generate Guardian Excel schema files
{% endstep %}
{% endstepper %}

***

## Core Capabilities

### Semantic Document Search

The toolkit uses hybrid vector search techniques to enable semantic search across ingested methodology documents.

Text content is converted into embeddings and stored in Qdrant. Queries are compared semantically against stored embeddings to retrieve relevant results.

***

### Guardian Schema Generation

The toolkit can generate Guardian-compatible Excel schema files.

Schemas can be:

* Created incrementally
* Extended with additional sections
* Edited and updated through the AI interface

The schema builder converts structured JSON input into Excel files compatible with the Guardian platform.

***

### Advanced Document Processing

The document ingestion pipeline supports:

* Layout recognition
* Table structure extraction
* Formula recognition
* Optical character recognition (OCR)
* Conversion of formulas into LaTeX format

GPU acceleration is supported for environments that provide compatible hardware.

***

### MCP Integration

The MCP server exposes tools to AI assistants.

These tools enable:

* Semantic search over ingested documents
* Schema creation and modification

Any MCP-compatible AI client can connect to the server.

***

## Repository Structure

The repository is organized as a Python monorepo with multiple packages.

### packages/

Each major component is implemented as a separate package:

* **vector\_store**\
  Shared library responsible for:
  * Connecting to Qdrant
  * Converting text chunks into embeddings
* **document\_ingestion\_worker**\
  Processes PDF and DOCX files and loads chunked embeddings into Qdrant.
* **schema\_ingestion\_worker**\
  Processes JSON schemas and loads property-level embeddings into Qdrant.
* **hedera\_guardian\_mcp\_server**\
  Exposes search and schema-building tools via MCP.
* **policy\_schema\_builder**\
  Builds Guardian Excel schema files from JSON input.

Each package contains:

* Source code directory
* README documentation
* Configuration documentation
* Dockerfile
* pyproject.toml
* poetry.lock

***

## Testing Structure

The repository includes a tests/ directory containing:

* Shared test utilities
* Unit tests
* Integration tests

Libraries primarily contain unit tests. Services include both unit and integration tests.

***

## Deployment Profiles

Deployment is managed through Docker Compose.

There are three deployment profiles:

### Standard Profile

* Defined in the base docker-compose.yml
* Intended for systems with approximately 16GB+ RAM
* Balanced for performance and quality

Services include:

* Qdrant (vector database)
* MCP server
* Document ingestion worker (on demand)
* Schema ingestion worker (on demand)

Infrastructure services remain running.\
Ingestion workers are executed when needed and stop after processing.

***

### GPU Profile

* Designed for systems with NVIDIA GPU support
* Improves document processing performance
* Optimized for accelerated ingestion workloads

***

### Low-Memory Profile

* Designed for lower-memory environments
* Disables certain advanced features
* Allows ingestion to run in constrained environments

***

## Documentation Included in the Repository

The docs/ directory includes:

* Contribution guide
* Docker configuration documentation
* ML and AI models inventory
* Quick start guide
* User guide

***

## Configuration

At the root level:

* .env.example contains configuration variables grouped by service
* Configuration values can be adjusted based on environment and performance needs
* pyproject.toml defines root dependencies
* poetry.lock defines the locked dependency graph
* Docker Compose files define deployment profiles
* .pre-commit-config.yaml defines automated quality checks

***

## Summary

The Hedera Guardian AI Toolkit is structured as a modular Python monorepo that enables:

* Document ingestion and structured extraction
* Conversion of content into vector embeddings
* Storage in Qdrant
* MCP-based AI integration
* Generation of Guardian-compatible Excel schemas

This architecture supports a controlled and structured workflow for methodology digitization.
