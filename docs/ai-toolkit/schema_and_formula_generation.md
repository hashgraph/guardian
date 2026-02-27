---
icon: text-width
---

# Schema\_And\_Formula\_Generation

## Schema & Formula Generation

This guide documents how to move from semantic search to structured Guardian schema generation using the Hedera Guardian AI Toolkit.

***

## Overview

At this stage:

* Documents have already been ingested
* Semantic search is working
* The MCP server is connected to your AI client

You will now:

* Design schemas using natural language
* Generate Guardian-compatible Excel schema files
* Extract formulas from methodologies
* Translate formulas into structured schema components
* Iteratively refine schema structures

***

## Prerequisites

Before generating schemas, ensure:

* MCP server is running
* Document ingestion is complete
* Your AI client supports MCP
* The File System extension (if using Claude Desktop) is enabled
* The output directory is allowed for file access

Schema files are written to:

```
data/output/
```

Each generated schema includes:

* An Excel (.xlsx) file
* A JSON representation (source of truth)

***

{% stepper %}
{% step %}
### Step 1 — Configure Your AI Client

For structured schema workflows:

* Use a dedicated project workspace
* Add persistent instructions to guide tool usage
* Ensure the AI uses MCP schema tools instead of generating raw Excel via Python

Best practice instructions include:

* Always inspect available tools first
* Use search tools before schema generation
* Use schema builder tools for Excel creation
* Do not manually generate Excel via scripting
* Validate schema updates before overwriting files

This ensures controlled and repeatable schema construction.
{% endstep %}

{% step %}
### Step 2 — Design a Root Schema

You may begin with a high-level root schema.

Example natural language prompt:

* Create a root schema for a project description.
* Include project title (string).
* Include project hub account ID.
* Include certification type dropdown with options VCS and CCP.
* Add placeholder subschemas for future expansion.

The AI will:

1. Draft schema structure in JSON
2. Suggest field types
3. Define enum options
4. Propose visibility logic (if applicable)

You can refine field types and requirements before generating the file.
{% endstep %}

{% step %}
### Step 3 — Generate the Excel Schema File

Once the structure is approved:

* The AI calls the schema builder MCP tool
* JSON schema metadata is converted into Excel format
* Validation is applied
* The file is written to disk

The generated file includes:

* Field definitions
* Data types
* Enum sheets
* Visibility conditions
* Subschema references

Both the Excel and JSON versions are stored.
{% endstep %}

{% step %}
### Step 4 — Extract Structure from Methodology Documents

To extend schemas properly, first analyze the methodology structure.

Ask the AI to:

* Inspect section headings
* Extract table of contents
* Identify subsection hierarchy
* Discover required vs optional fields

The AI will:

1. Explore metadata fields
2. Use filtered semantic search
3. Identify section names and structure
4. Propose corresponding subschemas

This allows schema structure to mirror document structure.
{% endstep %}

{% step %}
### Step 5 — Create Subschemas

Subschemas can be created incrementally.

Best practice:

* Create in small batches
* Validate after each update
* Avoid large multi-schema generation in one step

This reduces hallucination risk and improves schema correctness.

If a placeholder schema is referenced elsewhere, validation prevents unsafe removal and enforces safe updates.
{% endstep %}

{% step %}
### Step 6 — Transform Tables into Structured Fields

Many methodology sections are presented as tables.

Instead of copying table structure directly:

* Convert logical rows into structured fields
* Use help text fields for grouping
* Define risk or category groupings explicitly
* Convert qualitative tables into structured input/output fields

This creates machine-readable structure rather than static formatting.
{% endstep %}

{% step %}
### Step 7 — Extract and Interpret Formulas

You can ask:

* How is net emission reduction calculated?
* What formulas are involved?
* Explain each variable.
* Propose a schema capturing all inputs and outputs.

The AI will:

1. Perform targeted semantic search
2. Filter by document name
3. Retrieve LaTeX-converted formulas
4. Identify dependencies
5. Break formulas into calculation chains
6. Propose input and computed fields

Formula extraction includes:

* Root equations
* Intermediate equations
* Parameter definitions
* Dependency structure

You can then:

* Design schemas for calculated parameters
* Separate user inputs from computed outputs
* Build multi-schema dependency structures
{% endstep %}

{% step %}
### Step 8 — Iterative Refinement

You remain the domain expert.

The AI assists by:

* Drafting structure
* Translating formulas
* Suggesting schema layouts
* Maintaining validation rules

You review and refine before finalizing.

Generated schema files can be:

* Extended
* Edited
* Connected via subschema references
* Updated safely through MCP tools
{% endstep %}
{% endstepper %}

***

## Validation & Safety

Schema updates are validated automatically.

If:

* A referenced schema is removed
* A required field is missing
* A type mismatch occurs

The tool returns a validation error and forces correction.

This ensures structural integrity of Guardian-compatible files.

***

## Output Structure

Each generated schema results in:

```
data/output/
├── project_description_schema.xlsx
├── project_description_schema.json
```

The JSON file is the canonical editable representation.\
The Excel file is the exported Guardian-compatible snapshot.

***

## Recommended Workflow

1. Search methodology
2. Extract structure
3. Draft root schema
4. Generate Excel file
5. Extend with subschemas
6. Extract formulas
7. Create calculation schemas
8. Refine iteratively

***

## What Success Looks Like

You have successfully completed this stage when:

* Root schema exists
* Subschemas mirror document structure
* Formulas are interpreted correctly
* Inputs and calculated outputs are structured
* Excel files are valid and Guardian-compatible

At this point, methodology understanding has been transformed into structured, machine-readable schema artifacts.

***

## What Comes Next

The final step in the open-source workflow is:

**Schema Ingestion & Mapping (Transformation)**

This stage enables:

* Matching external JSON inputs to Guardian schema fields
* Structured mapping logic
* Controlled transformation pipelines
