# Hedera Guardian AI Toolkit - User Guide

This guide helps you set up and use the Hedera Guardian AI Toolkit with Claude Desktop. After completing this guide, you will be able to search through methodology documents using natural language, generate Guardian-compatible Excel schema files, and map source schema properties to Guardian policy schema paths.

## Table of Contents

- [Overview](#overview)
- [Prerequisites and Setup](#prerequisites-and-setup)
- [Data Ingestion](#data-ingestion)
  - [Advanced Ingestion Options](#advanced-ingestion-options)
- [MCP Server](#mcp-server)
- [Claude Desktop Integration](#claude-desktop-integration)
- [Schema Generation Workflow](#schema-generation-workflow)
- [Schema Mapping Workflow](#schema-mapping-workflow)
- [Using the Tools](#using-the-tools)
- [Understanding AI Capabilities and Limitations](#understanding-ai-capabilities-and-limitations)
- [Typical Daily Workflow](#typical-daily-workflow)
- [Schema Ingestion](#schema-ingestion)
- [Troubleshooting](#troubleshooting)
- [Glossary](#glossary)
- [Quick Reference](#quick-reference)
- [Additional Resources](#additional-resources)

---

## Overview

### What This Toolkit Does

The Hedera Guardian AI Toolkit provides specialized tools for carbon credit methodology analysis and Guardian schema generation:

1. **You place methodology documents into a folder** - Your PDF and DOCX files go into a specific directory.
2. **The system processes and indexes them** - Documents are split into searchable chunks and stored in Qdrant.
3. **Claude searches those documents** - Natural language queries return exact document sources.
4. **Claude generates Guardian schemas** - Excel files are created based on methodology requirements.

### System Architecture

```text
PDF Documents → Document Ingestion → Qdrant Database → MCP Server → Claude Desktop
```

**Key Components:**
- **Qdrant** - Vector database for semantic search
- **Document Ingestion Worker** - Processes PDFs into searchable chunks
- **MCP Server** - Exposes search and schema tools to Claude Desktop
- **Schema Builder** - Generates Guardian-compatible Excel files

### What Makes This Different

| Regular Claude | Claude with MCP Tools |
|---------------|-------------------------------|
| Uses general internet knowledge | Searches your local documents |
| May make educated guesses | Shows exact document sources |
| Cannot create files | Generates Excel schema files |
| Generic responses | Methodology-specific answers |

This setup turns Claude into a **controlled research assistant** that only uses information from the documents you provide.

> **Quick start:** For a streamlined setup path, see [QUICKSTART.md](QUICKSTART.md).

### Available Tools

| Tool | Purpose |
|------|---------|
| **Search** | |
| `methodology_documents_search` | Search methodology documents by semantic query |
| `schema_properties_search` | Search JSON schema properties |
| **Index Status** | |
| `methodology_documents_get_index_status` | Check document ingestion status |
| `schema_properties_get_index_status` | Check schema indexing status |
| **Schema Builder** | |
| `schema_builder_create_schemas` | Create or extend Guardian-compatible Excel schemas |
| `schema_builder_get_schema_list` | List schemas in an Excel file |
| `schema_builder_get_schema_field_list` | List fields for a specific schema |
| `schema_builder_get_schema_field_by_keys` | Get full field definitions by key |
| `schema_builder_add_schema_fields` | Add fields to existing schemas |
| `schema_builder_patch_schema_fields` | Patch existing fields in a schema |
| `schema_builder_remove_schema_fields` | Remove specific fields from a schema |
| `schema_builder_remove_schemas` | Remove schemas (sheets) from an Excel file |

---

## Prerequisites and Setup

### Required Software

Before you begin, install:

**1. Docker Desktop**
- Download: https://www.docker.com/products/docker-desktop/
- Requires ~5-10 GB disk space
- Must be running whenever you use the toolkit

> **Docker in simple terms:** Docker is like a shipping container for software. It packages everything the MCP tools need to run, so they work the same on any computer without changing your system. It's safe (runs in isolation), reversible (uninstall anytime), and only needs about 5-10 GB of disk space. **How to tell if Docker is running:** look for the whale icon in your system tray (Windows) or menu bar (macOS).

**2. Node.js** 22+
- Download: https://nodejs.org/ (LTS recommended)
- Required for the MCP bridge between Claude Desktop and the server
- Verify installation: `node --version`

> **Why Node.js is needed:** The Claude Desktop configuration uses `npx` (Node Package eXecute) to run `mcp-remote`, a bridge that connects Claude Desktop to the MCP server running in Docker. Without Node.js installed, the `npx` command won't be available. Just install it once - no configuration needed.

> **Python and Poetry are not required** for the Docker-based setup described here. They are only needed if you plan to run services locally for development. See [CONTRIBUTING.md](CONTRIBUTING.md) for local development prerequisites.

**3. Claude Desktop**
- Download: https://claude.ai/download
- Sign in with your Anthropic account

**4. Project Repository**
- Clone: `git clone <repository-url>`
- Or download ZIP from GitHub

### Starting the Services

**Step 1: Open a terminal and navigate to the project folder**

Windows:
```bash
cd C:\Projects\hedera-guardian-ai-toolkit
```

macOS/Linux:
```bash
cd ~/Projects/hedera-guardian-ai-toolkit
```

**Step 2: Start Qdrant and MCP Server**
```bash
docker compose up -d
```

On first run, Docker builds the MCP server image and pulls the Qdrant image. The MCP server also downloads its embedding model (~2.3 GB) on first start. Subsequent runs start in seconds.

> **Note:** This starts only the two persistent infrastructure services. Ingestion workers run on-demand separately (see [Data Ingestion](#data-ingestion)).

**Step 3: Verify services are healthy**
```bash
docker compose ps
```

Both `qdrant` and `hedera-guardian-mcp-server` should show `(healthy)`.

> **Tip:** The MCP server takes up to ~60 seconds to become healthy on first start while loading its embedding model. If it shows `(health: starting)`, wait and re-check. See [DOCKER.md](DOCKER.md#health-checks) for details.

**Step 4: Open Qdrant dashboard**
```text
http://localhost:6333/dashboard
```

If you see the Qdrant interface, the database is running correctly.

### Rebuilding After Updates

The toolkit is under active development. After pulling updates, rebuild:

```bash
# Standard rebuild
docker compose up -d --build

# Clean rebuild (if experiencing issues)
docker compose build --no-cache
docker compose up -d
```

> For advanced Docker configuration (health checks, volume management, GPU setup), see [DOCKER.md](DOCKER.md).

---

## Data Ingestion

Before searching documents, they must be processed and indexed.

### How Ingestion Works

The system:
1. Opens each PDF or DOCX file
2. Extracts text content
3. Splits it into meaningful chunks (typically a few paragraphs each)
4. Stores chunks in Qdrant with metadata (source, page numbers, etc.)

**Why chunks?** Precise results at the paragraph level, not just "page 47".

### Pre-Ingestion Checklist

| Check | Why It Matters |
|-------|---------------|
| PDF has selectable text | Scanned PDFs need OCR enabled (see [Advanced Ingestion Options](#advanced-ingestion-options)) |
| Tables are real tables | Image tables cannot be searched |
| One version per methodology | Multiple versions create conflicts |
| File isn't password-protected | Protected files fail |
| File opens normally | Corrupted files fail |

### Common Document Issues

**"My search can't find table data"**
Tables saved as images (screenshots) are not searchable. The original document needs real table formatting.

**"I'm getting contradictory results"**
You may have multiple versions of the same methodology. Keep only the version you want to use.

**"Important sections are missing"**
Scanned PDFs require OCR to extract text. The system has built-in OCR support via Tesseract — enable it by setting `DOCUMENT_INGESTION_DO_OCR=true` in your `.env` file. The Docker image includes Tesseract automatically; for local development, install Tesseract manually. Alternatively, find a text-based version of the document.

### Step 1: Prepare Your Documents

Create the input folder:

Windows:
```bash
mkdir data\input\documents
```

macOS/Linux:
```bash
mkdir -p data/input/documents
```

### Step 2: Add Your Files

Copy PDF and/or DOCX files into `data/input/documents/`.

**Recommended naming convention:**
- Pattern: `{Standard}-{Code}-{Type}-v{Version}.{ext}`
- Examples:
  - `VCS-VM0042-Methodology-v2.2.pdf`
  - `VCS-Project-Description-Template-v4.4.docx`
  - `CDM-AMS-III.D-Methodology-v21.0.pdf`

### Step 3: Run Document Ingestion

```bash
docker compose run --rm document-ingestion-worker
```

> **First run:** Docker builds the worker image and downloads ML models (~3.7 GB total). This can take 10-15 minutes. Subsequent runs start immediately, reusing cached images and models.

**What you'll see:**
```text
Processing documents...
[OK] VM0042-methodology: 45 chunks, 45 vectors, 12.3s
[OK] VM0048-methodology: 38 chunks, 38 vectors, 10.1s

Execution Summary
================================================
Total documents:      2
Successful:           2
Failed:               0
Total chunks:         83
```

Processing time varies based on document size and quantity.

### Step 4: Verify Ingestion

Open your browser:
```text
http://localhost:6333/collections/methodology_documents
```

The `points_count` should match the total chunks from ingestion.

### Updating Documents

**Adding new documents:**
1. Copy new files to `data/input/documents/`
2. Run ingestion again: `docker compose run --rm document-ingestion-worker`

**Updating existing documents:**
1. Remove old file from `data/input/documents/`
2. Add new version
3. Run ingestion

The system processes all files in the input folder each time.

### Advanced Ingestion Options

#### OCR for Scanned Documents

The system includes built-in OCR support via Tesseract for processing scanned PDFs. OCR is disabled by default since digital PDFs already have embedded text.

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `DOCUMENT_INGESTION_DO_OCR` | `false` | Enable Tesseract OCR for scanned documents |
| `DOCUMENT_INGESTION_OCR_LANG` | `["eng"]` | OCR language(s) — use ISO 639-3 codes |
| `DOCUMENT_INGESTION_FORCE_FULL_PAGE_OCR` | `false` | Force OCR on full page even if text is detected |

> **Note:** The Docker image includes Tesseract. For local development, install Tesseract manually and optionally set `DOCUMENT_INGESTION_TESSERACT_CMD` to the executable path.

#### GPU Acceleration

For faster processing on systems with an NVIDIA GPU, use the GPU compose override:

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml run --rm document-ingestion-worker
```

This requires the NVIDIA Docker runtime and provides:
- CUDA acceleration for ML models
- Higher batch sizes (OCR: 32, layout: 32, table: 4, embedding: 10)
- Parallel file processing (`MAX_PARALLEL_FILES=4`)
- Higher resolution rendering (`PDF_IMAGES_SCALE=4.0`)

#### Memory Profiles

The document ingestion worker ships with pre-configured environment profiles:

| Profile | RAM Target | File | Key Settings |
|---------|-----------|------|--------------|
| Low Memory | ~8 GB | `.env.low-memory.example` (local) or `docker-compose.low-memory.yml` (Docker) | Disables Surya formula enrichment, 5 GB subprocess limit, scale 2.0 |
| Balanced | ~16 GB | Default settings | All features enabled, scale 2.0, standard batch sizes |
| High Quality | 16+ GB / GPU | `.env.high-quality.example` | Scale 4.0, larger batch sizes, auto accelerator detection |

**Usage:** Copy the desired example file to `.env` in the `packages/document_ingestion_worker/` directory, then run ingestion.

#### Table and Formula Extraction

Table and formula extraction are enabled by default:

| Feature | Environment Variable | Default | Description |
|---------|---------------------|---------|-------------|
| Table structure | `DOCUMENT_INGESTION_DO_TABLE_STRUCTURE` | `true` | TableFormer model for table structure recognition |
| Formula extraction | `DOCUMENT_INGESTION_DO_FORMULA_ENRICHMENT` | `true` | Extracts equations as LaTeX |
| Surya formulas | `DOCUMENT_INGESTION_USE_SURYA_FORMULA_ENRICHMENT` | `true` | Higher-quality formula extraction via Surya RecognitionPredictor |
| Table mode | `DOCUMENT_INGESTION_TABLE_STRUCTURE_MODE` | `"accurate"` | `"accurate"` for complex tables, `"fast"` for simple ones |

#### Pipeline Resume

If ingestion is interrupted or you want to re-process from an intermediate stage, use the resume feature:

| Start Point | Environment Variable | Description |
|-------------|---------------------|-------------|
| `beginning` | `DOCUMENT_INGESTION_START_FROM=beginning` | Full pipeline (default) |
| `parsed` | `DOCUMENT_INGESTION_START_FROM=parsed` | Skip PDF parsing — useful for re-chunking with different settings |
| `chunked` | `DOCUMENT_INGESTION_START_FROM=chunked` | Skip parsing and chunking — useful for re-embedding only |

This requires that intermediate results were saved from a previous run (saved by default to `data/staged/documents/`).

> For the full environment variable reference, see [packages/document_ingestion_worker/README.md](../packages/document_ingestion_worker/README.md).

---

## MCP Server

The MCP (Model Context Protocol) server exposes search and schema tools to Claude Desktop.

### Server Configuration

The MCP server runs on port 9000 and provides:
- HTTP transport for remote connections
- Stdio transport for direct integration
- Automatic health checks (waits for Qdrant)

### Testing the Server

**Check server logs:**
```bash
docker compose logs -f hedera-guardian-mcp-server
```

Look for: "Server listening on port 9000"

**Test with MCP Inspector:**
```bash
npx @modelcontextprotocol/inspector --server-url http://localhost:9000/mcp
```

---

## Claude Desktop Integration

Configure Claude Desktop to use the MCP server.

### Step 1: Locate Configuration File

**Windows:**
- Press `Windows + R`
- Type `%APPDATA%\Claude` and press Enter
- Or: Settings → Developer → Edit Config

**macOS:**
- `~/Library/Application Support/Claude/claude_desktop_config.json`
- Or: Claude menu → Settings → Developer → Edit Config

**Linux:**
- `~/.config/Claude/claude_desktop_config.json`

### Step 2: Add MCP Server Configuration

Edit or create `claude_desktop_config.json`:

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

**If you have other servers:**
```json
{
  "mcpServers": {
    "your-existing-server": {
      "command": "...",
      "args": ["..."]
    },
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

### Step 3: Restart Claude Desktop

Completely quit (not just close):
- **Windows**: Right-click system tray icon → Exit
- **macOS**: Claude menu → Quit (or Cmd+Q)
- **Linux**: Quit from menu

Then reopen Claude Desktop.

### Step 4: Verify Connection

1. Open Claude Desktop
2. Click the "+" button at the bottom of the chat box, then select "Connectors"
3. "hedera-guardian-mcp-server" should be listed with its tools
4. Alternatively, visit Settings → Developer to check connection status and logs

### Understanding Claude Desktop with MCP

**How to check connected tools:**
Click the "+" button at the bottom of the chat box and select "Connectors" to see which MCP servers are connected and what tools they provide. You can also check connection status and logs via Settings → Developer.

**Why Claude asks for permission:**
When Claude needs to search your documents or generate a file, it asks permission first. This is a safety feature - Claude won't access your data without your approval. Click "Allow" to let Claude use the tool. These permissions only last for your current conversation.

**Your documents stay local:**
All document processing and searching happens on your computer. Your methodology documents never leave your machine.

---

## Schema Generation Workflow

This recommended setup streamlines schema generation with file preview and optimized instructions.

### Step 1: Enable Filesystem Extension

1. **Open Claude Desktop Settings:** Settings → Extensions
2. **Enable Filesystem:** Find "Filesystem" and click Enable
3. **Configure Allowed Directory:**
   - Add your project's `data` folder
   - **Windows**: `C:\Projects\hedera-guardian-ai-toolkit\data`
   - **macOS**: `/Users/yourname/projects/hedera-guardian-ai-toolkit/data`
   - **Linux**: `/home/yourname/projects/hedera-guardian-ai-toolkit/data`
4. **Save and Restart:** Quit Claude Desktop completely and reopen

### Step 2: Create a Dedicated Project

1. **Create Project:**
   - Click project selector in top-left
   - Select "New Project"
   - Name it (e.g., "Guardian Schema Generator")

2. **Enable Extended Thinking:**
   - Open project settings (gear icon)
   - Enable "Extended thinking"

### Step 3: Add Custom Instructions

In project settings, add these instructions to the "Custom instructions" field:

```text
Guardian Schema Design & Excel Generation
When a user requests a Guardian Schema and its corresponding Excel file, follow the workflow below.

Prerequisites
Before starting, thoroughly inspect the Hedera Guardian MCP server and its tool definitions. The tool descriptions contain critical workflow guidance, usage hints, parameter requirements, and prerequisite steps (e.g., calling index-status endpoints before constructing filters). Failing to review these definitions may lead to incorrect tool usage, malformed requests, or missed steps. Always treat the tool descriptions as the authoritative reference for how each tool should be called.

Constraints
Do not use the "Search Schema Properties" tools in this workflow.
Do not generate Excel files manually (e.g., with Python code). Use only the Hedera Guardian Schema Builder MCP tools.
Do not make assumptions when designing a schema — use only information found in the template and/or methodology documents. If something is unclear, ask the user for clarification or leave a [CLARIFICATION NEEDED] marker.
Workflow
General rule: Before every search, plan your filter criteria thoroughly — determine the appropriate metadata keys, match operators, and values before constructing the query.

1. Search for the matching template
Use the Search Methodology Documents tool to find the data-structure template that corresponds to the user's request. Actively use metadata filters to narrow results to the specific methodology or template document, document section, page range, or content flags.

{
  "must": {
    "key": "metadata.source_name",
    "match": {
      "value": "<document name>"
    }
  }
}

2. Compose the schema from the template
Build the schema using only the fields defined in the template:
Question — Use a concise, user-friendly description.
Answer — Leave empty, or populate with an example or default value when known.
Field Type — Choose the most appropriate type for each field carefully. Consider the nature of the data (e.g., String, Number, Integer, Date, Enum, Boolean, URL, etc.) and match it precisely to what the template expects. Do not default everything to String.
Help Text fields — Use the Help Text field type only id requested or in schemas with multiple fields to create section headings that visually group logically related fields. These fields carry no data; they serve only as organizational separators within the schema.

3. Review with the user
Present the proposed schema to the user and wait for approval before proceeding.

4. Generate the Excel file
Once approved, generate the file using the Hedera Guardian Schema Builder MCP tools. Refer back to the tool definitions to ensure correct parameter structure and sequencing.

5. Delivering Generated Schema Files
After schema creation, retrieve the file using the Filesystem MCP tools:
Filesystem:list_allowed_directories → get root path
Filesystem:list_directory → {allowed_path}\output → find the .xlsx file
Filesystem:copy_file_user_to_claude → copies to /mnt/user-data/uploads/
bash_tool: cp /mnt/user-data/uploads/{file}.xlsx /mnt/user-data/outputs/
present_files → deliver to user
Note: Ignore the download_url returned by the schema builder — use Filesystem tools instead.
```

---

## Schema Mapping Workflow

This recommended setup streamlines schema-to-schema mapping — finding the Guardian policy schema path that corresponds to each source payload path.

### Prerequisites

Schema mapping requires **Guardian JSON schemas** to be indexed (not methodology documents). If you haven't done this yet:

```bash
# Place JSON schema files in data/input/schemas/
docker compose run --rm schema-ingestion-worker
```

Verify indexing:
```text
http://localhost:6333/collections/schema_properties
```

The `points_count` should be 1500+ for a typical methodology like VM0042.

### Step 1: Create a Dedicated Project

1. **Create Project:**
   - Click project selector in top-left
   - Select "New Project"
   - Name it (e.g., "Guardian Schema Mapping")

2. **Enable Extended Thinking:**
   - Open project settings (gear icon)
   - Enable "Extended thinking"

### Step 2: Add Custom Instructions

In project settings, add the mapping instructions to the "Custom instructions" field. These instructions encode a systematic search strategy that ensures consistent, high-quality mappings.

The full instructions are available in the repository at `internal/demo/claude-desktop-mapping-instructions.md`. Copy the entire file contents into the Custom Instructions field.

**What the instructions provide:**
- **Multi-context search strategy** — Claude searches each property against multiple schema contexts (project description, monitoring report, etc.) before deciding
- **Score comparison methodology** — When multiple schemas score similarly, Claude applies discriminating tests (uniformity test, unique properties, structural patterns)
- **Structured table output** — Results are always returned as a Markdown table with Payload Path, Policy Path, Confidence, and Comment columns
- **Confidence scoring guide** — Standardized confidence: numeric 0.0–1.0 (where 1.0 = exact match) or the sentinel `NO_MATCH` (no viable candidate)

### Step 3: Map Properties

Start a conversation in the project and provide the payload paths you need to map.

**Single property:**
```text
Map this payload path to its Guardian policy schema equivalent:
projectDescription
```

**Group of related properties:**
```text
Map these payload paths to their Guardian policy schema equivalents:

1. creditPeriod.startDate
2. creditPeriod.endDate
3. locations[*].country
4. locations[*].stateProvince
5. locations[*].latitudeDD
6. locations[*].longitudeDD
7. locations[*].acresHectares
8. projectProponentsWithDetails[*].organizationName
```

**What Claude does:**
1. Analyzes target path structure for schema type indicators
2. Searches with 3+ different contexts per property
3. Compares scores across schema candidates
4. Applies uniformity test for close decisions
5. Returns a structured mapping table

**Output format:** Claude returns results as a Markdown table with 4 columns:
- **Payload Path** — The original source path (preserved exactly as given)
- **Policy Path** — The matched Guardian schema path
- **Confidence** — Match confidence: numeric 0.0–1.0, or `NO_MATCH` if no viable candidate exists
- **Comment** — Brief reasoning for the match

**Example output:**

| Payload Path | Policy Path | Confidence | Comment |
|---|---|---|---|
| `projectDescription` | `vcs_project_description.projectDescription` | 0.95 | Exact property name match in project description context |
| `creditPeriod.startDate` | `vcs_project_description.G14.projectCreditingPeriodstartDate` | 0.95 | Semantic equivalent — Guardian uses compound naming convention |

### Understanding the Results

**Reading the mapping table:**
- **Confidence >= 0.90** — High confidence, likely correct
- **Confidence 0.70-0.89** — Good match, worth a quick review
- **Confidence < 0.70** — Needs human review; check the Comment column for reasoning
- **NO_MATCH** — No viable candidate found; the property may not exist in indexed schemas

**Score comparison tables:**
When Claude encounters ambiguous properties (same concept in multiple schemas), it shows its analysis as a score comparison table before the final mapping. This transparency helps you understand and verify close decisions.

### Tips for Effective Mapping

1. **Group related properties** — Properties from the same parent path should be mapped together so Claude can apply the uniformity test
2. **Start with clear cases** — Map straightforward properties first to establish the schema context, then tackle ambiguous ones
3. **Review low-confidence mappings** — Scan the Confidence column and focus review on anything below 0.85
4. **Provide context** — If you know the source schema type (e.g., "these are from a monitoring report payload"), mention it to help Claude focus its search
5. **Iterate** — If a mapping doesn't look right, ask Claude to re-search with different terms or show alternative candidates

### Validating Mappings

After mapping is complete, validate the results by:
1. **Reviewing low-confidence items** — Focus on mappings with Confidence below 0.85
2. **Cross-checking with Qdrant** — Use `schema_properties_search` to verify specific mappings
3. **Consulting domain experts** — Hand the consolidated table to someone familiar with the Guardian schema structure

---

## Using the Tools

### Semantic Search

Ask Claude to search through ingested documents using natural language.

**Example prompts:**
```text
Search the methodology documents for baseline emission calculations
```

```text
What monitoring parameters are required for renewable energy projects?
```

```text
Search for additionality requirements in VM0042
```

```text
Find the formula for calculating emission reductions
```

**How search works:**
The toolkit uses **hybrid search**, combining two retrieval methods for better accuracy:
- **Semantic search** (dense vectors) — finds content that is conceptually similar to your query, even if the exact words differ
- **Keyword matching** (sparse vectors) — finds content containing your exact terms

Results from both methods are merged using Reciprocal Rank Fusion (RRF) to produce a single, optimized ranking. This means a search for "VM0042 baseline" matches both conceptually similar content and documents containing those exact terms.

**Understanding results:**
- Content: Actual text from documents
- Source: Which document (filename, page)
- Relevance: How closely content matches query

**Tips for effective searches:**
1. Be specific: "Find baseline emission calculation for grid-connected solar"
2. Use domain terminology: "additionality," "crediting period," "monitoring parameters"
3. Ask follow-up questions to refine results
4. Specify methodology if you have multiple: "Search only in VM0042"
5. Edit and re-run prompts for iteration

**Filtering by document:**

Searches can be filtered by document metadata. The `filter` parameter supports matching on these fields:

| Metadata Field | Description | Example Value |
|---------------|-------------|---------------|
| `metadata.source_name` | Document name (without extension) | `VM0042-methodology` |
| `metadata.page_no` | Page number | `42` |
| `metadata.heading` | Most specific heading | `Baseline Emissions` |
| `metadata.headings` | Full heading hierarchy | `["8. Quantification", "8.1 Baseline"]` |
| `metadata.source_format` | File format | `pdf`, `docx` |

```text
Search for emission factors only in the VM0042 methodology document
```
```text
Find all content from page 15 of the VCS Project Description template
```

**Getting more results (default is 5):**
```text
Search for all monitoring parameters and return up to 15 results
```

### Generating Guardian Schemas

Ask Claude to create Guardian-compatible Excel schema files through conversation.

**Example conversation:**

**You:** Create a Guardian schema for the VM0042 methodology PDD template

**Claude:** [Searches documents and presents proposed schema]

**You:** Add a field for verification date and make emission readings required

**Claude:** [Shows updated schema]

**You:** Generate the Excel file

**Claude:** [Generates file and shows preview]

**Generated files location:** `data/output/` in your project directory

### Schema Building Patterns

**Direct approach:**
```text
Add a "Verification Date" field and generate the updated Excel file
```

**Design-and-review approach:**
```text
Show me what verification fields you would add before generating the file
```

**Incremental building:**
```text
Add monitoring fields to my existing solar-project-schema.xlsx file.
Use the extend_existing option to merge with the existing file.
```

**Listing fields in a schema:**
```text
Show me all fields in the Project Description schema from solar-project-schema.xlsx
```

**Inspecting field details:**
```text
Get the full definition of the "Emission Factor" and "Baseline Year" fields from my schema
```

**Updating an existing field:**
```text
Change the Verification Date field type to DateTime in my Project Info schema
```

**Removing fields:**
```text
Remove the deprecated "Legacy ID" field from the Project Info schema
```

**Removing a schema sheet:**
```text
Remove the "Draft Notes" sheet from solar-project-schema.xlsx
```

### Setting Expectations: You Remain the Expert

**Claude accelerates your work - it doesn't replace your expertise.**

What Claude does well:
- Finds relevant sections in methodology documents quickly
- Extracts field names and structures from templates
- Generates properly formatted Excel files
- Handles tedious formatting consistently

What requires your expertise:
- Deciding which sections are relevant to your project
- Interpreting methodology requirements in context
- Validating that the schema matches your actual needs
- Making judgment calls about edge cases

### [CLARIFICATION NEEDED] Is Normal

When Claude finds information in documents that requires interpretation, it may mark fields with `[CLARIFICATION NEEDED]`. This is **correct behavior**, not a failure.

**Example scenario:**
```text
Claude: I found that the methodology requires "project boundary coordinates"
but the template doesn't specify the exact format.
[CLARIFICATION NEEDED: Should this be a single GeoJSON field or separate lat/long fields?]
```

This means Claude found the requirement but needs your decision on implementation. Respond with your preference, and Claude will update the schema.

### What Can Be in a Schema

Guardian schemas support 21 field types, organized by category:

| Category | Field Types | Description |
|----------|-------------|-------------|
| **Text** | String, Pattern | Free text or regex-validated text |
| **Numeric** | Number, Integer | Decimal or whole numbers |
| **Boolean** | Boolean | Yes/No values |
| **Date/Time** | Date, Time, DateTime, Duration | Date, time, combined, or duration values |
| **Selection** | Enum | Dropdown selections and multiple choice |
| **Links** | URL, URI, Email | Web addresses, URIs, and email addresses |
| **Media** | Image, File | Image uploads and file attachments |
| **Special** | GeoJSON, HederaAccount, Auto-Calculate | Geographic coordinates, Hedera account IDs, and computed values |
| **Display** | Help Text, Prefix, Postfix | Instructional text, field prefixes, and suffixes |

Schemas also support **conditional visibility** — fields that appear based on other answers.

**Example requests:**
- "Add an enum field for project type with options: Solar, Wind, Hydro"
- "Make the 'Verification Date' field only visible when 'Verification Complete' is Yes"
- "Add a calculated field that sums the monthly emission values"

### Complex Schema Example

Build a VCS Project Description schema across multiple prompts:

1. **Create root schema:**
```text
Design Root Schema "Project Description" with:
- Project Title
- Project Hub Account ID
- Certification type (VCS v4.4, CCB v3.0 & VCS v4.4)
- Sub-schema placeholders for each type
```

2. **Discover structure:**
```text
Discover the structure of the VCS Project Description Template as defined in TOC
```

3. **Design sub-schemas:**
```text
Design schema for VCS Project Description with:
- General sub-schema (Title Page fields)
- Empty sub-schemas following template sections
- Omit section numbers from names
```

4. **Add details incrementally:**
```text
Suggest schema design for Risk Assessment section
```

5. **Update file:**
```text
Update the Risk Assessment placeholder in the existing Excel file
```

---

## Understanding AI Capabilities and Limitations

### Working with Large Documents

Methodology documents and PDD templates are often very large (100-200+ pages). Keep these practical considerations in mind:

**Search results are chunked:**
- Documents are split into smaller searchable pieces called "chunks"
- Each search returns the most relevant chunks, not entire documents
- You may need multiple searches to find all relevant information

**Schema generation is iterative:**
- Don't expect a complete schema covering all template sections in one conversation
- Complex schemas (like a full PDD) should be built section by section
- Example approach:
  1. First conversation: Create the "Project Information" section
  2. Second conversation: Add "Baseline Scenario" fields
  3. Continue building incrementally

**Conversation length limits:**
- Claude has a limit on how much conversation it can process at once
- In very long conversations, Claude may forget details from earlier messages
- For complex tasks, it's often better to start a fresh conversation for each major section

**Signs you're hitting conversation limits:**
- Claude asks you to repeat information you already provided
- Responses become less accurate or miss earlier context
- You see messages about the conversation being too long

**What to do:**
- Start a new conversation for your next task
- Your generated files are saved - you don't lose any work
- Reference the file name in your new conversation: "Continue working on solar-monitoring-schema.xlsx"

**Continuing work across conversations:**
When you start a new conversation, Claude doesn't automatically know about your previous work. To continue extending a schema file:
1. Start a new conversation
2. Tell Claude which file to extend: "I have an existing schema file called `solar-monitoring-schema.xlsx`. Add the following fields to it..."
3. Use the `extend_existing` option so Claude merges new fields into your existing file

**Best practices for large schemas:**
1. **Break it down**: Create one schema section per conversation
2. **Be specific**: "Create fields for Section 3.1 of the PDD" is better than "Create the entire PDD schema"
3. **Iterate**: Generate, review, refine in cycles
4. **Save progress**: Download Excel files after each successful generation
5. **Use extend_existing**: The tool can merge new fields into existing Excel files

---

## Typical Daily Workflow

Here's what a normal day looks like when using these tools.

### Starting Your Day

1. **Start Docker Desktop**
   - Open Docker Desktop from your applications
   - Wait for the whale icon to appear in your system tray/menu bar

2. **Start the services** (in terminal):
   ```bash
   docker compose up -d
   ```

3. **Open Claude Desktop**
   - Verify your MCP tools are connected via the "+" button → "Connectors" in the chat box

4. **Start working**
   - Search documents, generate schemas, ask questions

### Ending Your Day

When you're done working:

```bash
docker compose down
```

This stops the services and frees up computer resources. Your documents and generated files are saved - nothing is lost.

### When to Re-Run Ingestion

You only need to run ingestion again when:
- You add new PDF/DOCX files to the input folder
- You replace a document with a newer version
- You remove documents and want them gone from search

You do NOT need to re-run ingestion:
- Every day when you start
- After generating schemas
- After restarting Docker

### Tomorrow

When you return tomorrow:
1. Start Docker Desktop
2. Run `docker compose up -d`
3. Open Claude Desktop
4. Continue where you left off

All your ingested documents are still there. All generated schemas are still in `data/output/`.

---

## Schema Ingestion (Secondary Use Case)

If you need to ingest JSON schemas (separate from methodology documents), you can use the schema ingestion worker. This is optional and independent of the primary document ingestion workflow above.

```bash
docker compose run --rm schema-ingestion-worker
```

Place your JSON schema files in `data/input/schemas/` before running. After ingestion, schema properties become searchable via the `schema_properties_search` tool.

### Ingestion Modes

Schema ingestion supports two modes, controlled by the `SCHEMA_INGESTION_MODE` environment variable:

| Mode | Description |
|------|-------------|
| **override** (default) | Clears the existing collection and re-indexes all schemas from scratch. Validates new data before clearing to prevent data loss on error. Use when you want a clean, authoritative index. |
| **append** | Adds new data without removing existing entries. Running multiple times with the same data creates duplicates. Use for incremental additions. |

Set the mode in your `.env` file or pass it as an environment variable:
```bash
SCHEMA_INGESTION_MODE=append docker compose run --rm schema-ingestion-worker
```

For details on input structure and configuration, see [packages/schema_ingestion_worker/README.md](../packages/schema_ingestion_worker/README.md).

### Document Ingestion Modes

Document ingestion supports the same two modes, controlled by the `DOCUMENT_INGESTION_MODE` environment variable:

| Mode | Description |
|------|-------------|
| **override** (default) | Clears the existing collection and re-indexes all documents from scratch. Use when you want a clean, authoritative index. |
| **append** | Adds new data without removing existing entries. Running multiple times with the same data creates duplicates. Use for incremental additions. |

Set the mode in your `.env` file or pass it as an environment variable:
```bash
DOCUMENT_INGESTION_MODE=append docker compose run --rm document-ingestion-worker
```

For details on configuration, see [packages/document_ingestion_worker/README.md](../packages/document_ingestion_worker/README.md).

---

## Troubleshooting

### MCP Server Not Connecting

**Check 1: Configuration file location**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Verify filename is exactly `claude_desktop_config.json`

**Check 2: JSON validity**
- Validate at https://jsonlint.com/
- All brackets `{}` properly closed
- Commas between items (not after last item)

**Check 3: Complete restart**
- Quit application completely (not just close window)
- Windows: Right-click tray icon → Exit
- macOS: Cmd+Q or menu → Quit

**Check 4: MCP server running**
```bash
docker compose ps
```
`hedera-guardian-mcp-server` should show "Up"

### npx Not Recognized

Node.js not installed or not in PATH.

**Solution:**
1. Install Node.js from https://nodejs.org/ (LTS version)
2. Restart terminal/command prompt
3. Verify: `node --version`
4. If still failing, restart computer

**If Node.js is installed but still not working:**
- Try clearing the npm cache: `npm cache clean --force`
- Test npx manually to see the error: `npx mcp-remote@latest http://localhost:9000/mcp`

### Server Disconnected Error

Claude Desktop can't reach MCP server.

**Check 1: Docker running**
```bash
docker compose ps
```
Both services should show "Up"

**Check 2: Start services**
```bash
docker compose up -d
```

**Check 3: View logs**
```bash
docker compose logs -f hedera-guardian-mcp-server
```
Look for "Server listening on port 9000"

**Check 4: Test port**
```bash
curl http://localhost:9000
```

**Check 5: Qdrant running**
```bash
curl http://localhost:6333/collections
```

### No Search Results

**Check 1: Documents ingested**
- Open http://localhost:6333/collections/methodology_documents
- `points_count` should be > 0

**Check 2: Try broader terms**
- Instead of "VM0042 Section 8.1.2 baseline"
- Try "baseline calculation"

**Check 3: Verify ingestion**
```bash
docker compose logs document-ingestion-worker
```
Look for success messages

### Document Ingestion Issues

**"No documents found"**
- Verify files in `data/input/documents/`
- Check file extensions: `.pdf` or `.docx`
- Open files in reader to verify not corrupted

**"Ingestion stuck"**
```bash
docker compose logs -f document-ingestion-worker
```
Check for progress. Large documents take longer.

**"Some documents failed"**
1. Note which failed (in terminal output)
2. Move failed documents to temporary folder
3. Run ingestion with successful documents only
4. Try failed documents individually
5. Common causes: corrupted, password-protected, unusual formatting

**"First ingestion run is very slow"**
On the first run, Docker builds the worker image (includes document processing libraries). This takes ~10-15 minutes and only happens once. After that, the actual document processing begins. Subsequent runs skip the build step entirely.

**"Out of memory"**
- Process fewer documents at a time
- **Docker:** Use the low-memory compose override:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.low-memory.yml run --rm document-ingestion-worker
  ```
- **Local:** Copy `.env.low-memory.example` to `.env` in `packages/document_ingestion_worker/`
- See the document ingestion worker's [README](../packages/document_ingestion_worker/README.md) and [DOCKER.md](DOCKER.md) for details

**"Connection refused to Qdrant"**
```bash
docker compose up -d qdrant
```
Wait 30 seconds, then run ingestion.

### Getting More Help

- Check logs: `docker compose logs <service-name>`
- Review Claude Desktop logs: Settings → Developer → Open Logs Folder
- Create GitHub issue with error messages and steps tried

---

## Quick Reference

### Service Commands

```bash
# Start services
docker compose up -d

# Start with rebuild (after updates)
docker compose up -d --build

# Stop services
docker compose down

# Check status
docker compose ps

# View logs
docker compose logs <service-name>

# Restart services
docker compose restart

# Clean rebuild
docker compose build --no-cache
docker compose up -d
```

### Ingestion Commands

```bash
# Ingest methodology documents
docker compose run --rm document-ingestion-worker
```

### Useful URLs

| Service | URL |
|---------|-----|
| Qdrant Dashboard | http://localhost:6333/dashboard |
| Methodology Collection | http://localhost:6333/collections/methodology_documents |

### Configuration Files

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

### Example Search Prompts

```text
Search methodology documents for baseline emission calculations
```

```text
Find monitoring requirements for renewable energy projects
```

```text
What are additionality requirements in VM0042?
```

```text
Search for crediting period requirements
```

```text
Find formula for emission reductions
```

---

## Additional Resources

- **Claude Desktop**: https://claude.ai/download
- **Model Context Protocol**: https://modelcontextprotocol.io
- **Node.js**: https://nodejs.org/
- **Docker Desktop**: https://www.docker.com/products/docker-desktop/

---

## Glossary

Technical terms explained in plain language.

| Term | Meaning |
|------|---------|
| **Chunk** | A small section of a document (typically a few paragraphs). Documents are split into chunks to enable precise searching. |
| **Collection** | A group of related chunks in the database. Your methodology documents are stored in the `methodology_documents` collection. |
| **Container** | An isolated environment where software runs. Docker containers keep the MCP tools separate from your regular computer programs. |
| **Docker** | Software that creates and manages containers. Think of it as a "virtual shipping container" for applications. |
| **extend_existing** | An option to add new fields to an existing Excel schema file instead of creating a new one. |
| **Hybrid Search** | A retrieval method that combines semantic meaning (dense vectors) and keyword matching (sparse vectors) for more accurate results. |
| **Ingestion** | The process of reading documents, splitting them into chunks, and storing them in the searchable database. |
| **MCP** | Model Context Protocol - the technical standard that allows Claude Desktop to use external tools like search and file generation. |
| **Metadata** | Information about data. For documents, metadata includes the filename, page numbers, and section headings. |
| **OCR** | Optical Character Recognition — technology that converts scanned document images into searchable text. The toolkit supports OCR via Tesseract when enabled. |
| **Qdrant** | The search database that stores your document chunks and makes them searchable by meaning (not just keywords). |
| **RRF** | Reciprocal Rank Fusion — an algorithm that merges ranked results from different search methods (semantic and keyword) into a single, optimized ranking. |
| **Schema** | A structured definition of data fields, like a form template. Guardian schemas define what information to collect. |
| **Semantic Search** | Searching by meaning rather than exact words. "Find emission calculations" can match "GHG reduction formulas" because they mean similar things. |
| **Vector** | A mathematical representation of text meaning. Vectors allow the system to find content that is conceptually similar to your query. |

---

## See Also

- [QUICKSTART.md](QUICKSTART.md) — Quick setup and first search
- [DOCKER.md](DOCKER.md) — Docker architecture, GPU setup, memory tuning
- [MODELS.md](MODELS.md) — ML/AI models inventory and configuration
- [CONTRIBUTING.md](CONTRIBUTING.md) — Developer guide for code contributions
- [Root README](../README.md) — Project overview and package index

---

*This guide is designed for domain experts working with carbon credit methodologies and Guardian schemas. For technical details and advanced configuration, see the developer documentation in the repository.*
