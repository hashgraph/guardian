---
icon: map
---

# Mapping\_And\_Transformation

## Mapping & Transformation

Mapping & Transformation is an advanced MCP server capability designed to accelerate integration between Guardian and external systems.

It is **not part of the standard policy development workflow**.

Instead, it enables:

* Exporting Guardian policy data
* Mapping deeply nested Guardian JSON structures
* Transforming Guardian payloads into external JSON formats
* Preparing data for use in Transformation Workflow policy blocks

This guide documents the open-source Mapping & Transformation capability independent of any demo recording.

***

## Why Mapping Is Hard

Guardian policy data is represented as a single deeply nested JSON object.

Challenges include:

* Long, deeply nested paths
* Non-human-readable property names
* Repeated property names in different schema sections
* Multiple workflow states containing similar structures
* Ambiguity across project description vs monitoring schemas

Traditionally, integration requires manual work:

* Reviewing source schema JSON
* Identifying corresponding target properties
* Building Excel mapping tables line by line
* Manually verifying correctness

This process is time-intensive and error-prone.

***

## How the Toolkit Solves It

The Mapping & Transformation capability combines:

* Schema ingestion
* Vector search via Qdrant
* Full-path indexing
* Hierarchical ancestor metadata
* MCP search tools
* LLM-assisted structured decision logic

Instead of manually inspecting schema files, the LLM queries indexed schema properties using semantic search and structured comparison logic.

***

## Architecture Overview

Schema ingestion stores each property in Qdrant with critical metadata:

#### full\_path

The complete JSON path from root to property.

Example:

```
projectDescription.monitoring.ghgEmissions.year
```

This uniquely identifies where a property lives in the Guardian hierarchy.

Without this, properties like:

* emissionFactor
* value
* year

would be ambiguous.

#### ancestors

An ordered chain of parent objects from root to property.

Each ancestor includes:

* Name
* Description
* Type

Ancestors provide semantic context and disambiguation during search.

For example:

* emissionFactor under project description
* emissionFactor under monitoring report

are distinguished by ancestor chains.

***

{% stepper %}
{% step %}
### Step 1 — Schema Ingestion

Before mapping can occur:

* Place Guardian policy schemas into the schema ingestion input folder.
* Create a subfolder named after the methodology.
* Run the schema ingestion worker.

The methodology name is stored as metadata in Qdrant.

This allows:

* Multiple methodologies in the same vector database
* Context-aware filtering during search
* Preventing cross-methodology confusion

After ingestion:

* Schema properties are indexed
* full\_path and ancestor metadata are stored
* The MCP server can query them
{% endstep %}

{% step %}
### Step 2 — Confirm Index Status

Before mapping, confirm:

* Qdrant is running
* Schema index exists
* Collections are populated
* MCP server is connected

The MCP server exposes tools to check schema index readiness.

Mapping should only begin once indexing is confirmed operational.
{% endstep %}

{% step %}
### Step 3 — Multi-Context Semantic Search

Mapping uses structured semantic search.

Each property must be searched multiple times using different contextual frames:

* Parent context
* Project description context
* Monitoring report context

This prevents selecting the first semantically similar result.

Guardian schemas often contain overlapping structures such as:

* ghgEmissions
* quantification
* carbonStocks

These appear in multiple schema sections.

Multi-context search gathers comparative evidence before making a decision.
{% endstep %}

{% step %}
### Step 4 — Score Comparison & Uniformity Test

When similarity scores are close between candidates, the system enforces structured comparison.

Instead of arbitrary selection:

* Similarity scores are tabulated
* Competing contexts are compared
* Consistency across property groups is evaluated

If one schema context consistently scores higher across related properties, that consistent advantage is treated as valid evidence.

This creates:

* Transparent reasoning
* Auditable decisions
* Reduced hallucination risk
{% endstep %}

{% step %}
### Step 5 — Mapping Output

For each source path, the system returns:

* Candidate target paths
* Semantic similarity scores
* Contextual analysis
* Disambiguation reasoning

These results can be:

* Exported into mapping tables
* Compared with manual mappings
* Used to generate transformation logic

In practice, generated mappings align closely with manually created Excel mapping sheets.
{% endstep %}

{% step %}
### Step 6 — Transformation Use Case

Once mappings are validated, they can be used to:

* Generate transformation scripts
* Convert Guardian JSON payloads
* Structure data for third-party systems
* Feed Transformation Workflow policy blocks

This enables:

Guardian Instance A → External JSON → Guardian Instance B (Transformation Workflow)

The Mapping capability acts as the semantic bridge between systems.
{% endstep %}
{% endstepper %}

***

## Relationship to Policy Development

Mapping & Transformation is:

* Separate from schema design
* Separate from methodology digitization
* Separate from formula extraction

It is an integration acceleration layer.

Typical policy digitization flow:

1. Ingest methodology
2. Search documents
3. Generate schemas
4. Build policy logic

Mapping & Transformation supports:

5. System-to-system integration
6. Data export/import pipelines

***

## What Success Looks Like

You have successfully completed this stage when:

* Schema properties are indexed
* Multi-context search is operational
* Mapping tables are generated semantically
* Ambiguous fields are resolved systematically
* Transformation payloads can be constructed programmatically

At this point, Guardian policy data can be integrated into external systems with dramatically reduced manual effort.

***

## Summary

Mapping & Transformation provides:

* Semantic schema matching
* Hierarchical disambiguation
* Structured decision logic
* Accelerated integration workflows
* Support for transformation policy blocks

It extends the MCP server beyond research and schema building into integration enablement.

This is an advanced capability designed to reduce one of the most time-consuming parts of Guardian system integration.
