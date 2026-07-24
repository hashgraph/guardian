---
description: >-
  PRD for the policy.yml sidecar manifest — structured, machine-readable
  metadata for every policy in the Guardian Methodology Library.
tags:
  - rfc
---

# Policy Manifest (policy.yml)

| Field            | Value                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **Status**       | [Merged](https://github.com/hashgraph/guardian/pull/6278)                                       |
| **Author**       | Guardian Platform Team                                                                          |
| **Date**         | 2026-06-11                                                                                      |
| **Version**      | 1.0                                                                                             |
| **Related docs** | MANIFEST\_SPEC.md, policy.schema.json, TAG\_TAXONOMY.md — see Methodology Library/ at repo root |

***

## Table of Contents

1. [Executive Summary](policy_manifest_prd.md#1-executive-summary)
2. [Problem Statement](policy_manifest_prd.md#2-problem-statement)
3. [Goals and Non-Goals](policy_manifest_prd.md#3-goals-and-non-goals)
4. [User Personas](policy_manifest_prd.md#4-user-personas)
5. [Proposed Solution](policy_manifest_prd.md#5-proposed-solution)
6. [Full Field Specification](policy_manifest_prd.md#6-full-field-specification)
7. [policy\_type Taxonomy](policy_manifest_prd.md#7-policy_type-taxonomy)
8. [Status and Registry Status Lifecycles](policy_manifest_prd.md#8-status-and-registry-status-lifecycles)
9. [Tag Taxonomy Guidance](policy_manifest_prd.md#9-tag-taxonomy-guidance)
10. [Versioning Convention](policy_manifest_prd.md#10-versioning-convention)
11. [Thumbnail Specification](policy_manifest_prd.md#11-thumbnail-specification)
12. [Publications Array](policy_manifest_prd.md#12-publications-array)
13. [Success Metrics](policy_manifest_prd.md#13-success-metrics)
14. [Phased Rollout](policy_manifest_prd.md#14-phased-rollout)
15. [Open Questions and Decisions Needed](policy_manifest_prd.md#15-open-questions-and-decisions-needed)

***

## 1. Executive Summary

The Guardian Methodology Library currently contains more than 90 policy folders containing `.policy` bundles, README files, and assorted supporting documents. None of this content is machine-readable in a structured way. Discovering, filtering, and comparing policies requires manually reading Markdown files or relying on institutional knowledge.

This PRD proposes introducing a `policy.yml` sidecar manifest as a first-class interface to every policy in the library. The manifest captures structured metadata — identity, versioning, policy type, token type, publication records, SDG alignment, tags, and more — in a format that can be validated, indexed, queried, and rendered without parsing free-form prose.

***

## 2. Problem Statement

### 2.1 Current state

| Pain point                         | Detail                                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **No machine-readable metadata**   | Policy identity, authorship, versioning, and methodology lineage exist only in README prose. No programmatic access is possible without LLM-assisted parsing.                        |
| **No filtering or discovery**      | A developer or policy buyer who wants "all active Verra REDD+ policies on mainnet" has no query path. They must read every folder.                                                   |
| **Inconsistent documentation**     | Some policies have detailed READMEs with workflow diagrams and IPFS timestamps; others have one paragraph. There is no enforcement of a minimum information set.                     |
| **No lineage tracking**            | When a policy supersedes an earlier version (e.g., MECD v2.0 supersedes v1.2), that relationship is buried in prose. Tools cannot follow the supersession chain.                     |
| **Publication records are ad-hoc** | IPFS timestamps and Hedera topic IDs appear in various formats across READMEs — sometimes in tables, sometimes inline. Multi-network awareness (testnet vs mainnet) is inconsistent. |
| **No SDG or sector indexing**      | There is no way to ask "show me all policies that contribute to SDG 13 in the energy sector" without manual reading.                                                                 |
| **No validation gate**             | A contributor can add a policy with any structure. There is no CI check enforcing a minimum metadata contract.                                                                       |

### 2.2 Why this matters now

The Guardian ecosystem is maturing. The Methodology Library is being used by:

* Registry bodies evaluating Guardian as a compliance infrastructure.
* Developers building policy catalogs, comparison tools, and carbon marketplaces on top of Guardian.
* New contributors who need clear onboarding signals.
* The Guardian team itself, for prioritizing documentation and support effort.

Without structured metadata, every downstream use case requires bespoke scraping or manual curation. The cost of that compounds as the library grows past 100 policies.

***

## 3. Goals and Non-Goals

### Goals

* Establish a single, validated, machine-readable metadata contract for every policy in the library.
* Enable filtering, search, and catalog rendering without parsing prose.
* Track policy lineage (supersession chains), publication history (multi-network), and registry validation status.
* Provide a contributor-facing spec that is lightweight enough that a new contributor can fill out a manifest in under 30 minutes.
* Enforce a minimum metadata floor via JSON Schema validation in CI.
* Create the foundation for a library mini-site (Phase 3) and Guardian platform integration (Phase 4) without requiring those phases to be completed first.

### Non-Goals

* Replacing the README. The manifest is a sidecar; prose documentation remains important and is not deprecated.
* Enforcing a closed tag set. Tags are guidance-driven, not a hard closed enum (see Section 9).
* Automating policy import/export into Guardian. The manifest is a metadata layer, not a deployment mechanism.
* Defining the schema of the `.policy` file itself. The manifest describes the policy; it does not replace the policy bundle format.
* Providing a UI in this phase. The manifest is infrastructure; a catalog UI is Phase 3.

***

## 4. User Personas

### 4.1 Ravi — Methodology Expert and Prospective Contributor

**Who**: A data scientist or environmental researcher at an international NGO with deep expertise in monitoring frameworks for smallholder agriculture. Comfortable with data pipelines and familiar with standards like Gold Standard and Verra. Has been experimenting with blockchain-adjacent tools and arrives at Guardian with genuine intent to contribute a methodology that isn't well served by anything currently in the library.

**Goals**:

* Understand where his work would fit relative to the existing library.
* Find a legible starting point — what the minimum bar looks like and what a complete entry looks like.
* Contribute without reinventing the documentation structure from scratch.
* Know his work will be discoverable and won't look equivalent to a weekend hackathon entry.

**Pain points today**:

* No template to follow; README structure is invented from scratch each time.
* No validation to confirm important fields haven't been missed.
* The library reads like an unmaintained inbox rather than a curated platform — a qualified expert recalibrates their estimate of how much effort adoption will take and quietly deprioritises it.

**How `policy.yml` helps**: A structured file with required/optional fields, inline comments, and `policy_type` classification gives Ravi a legible on-ramp. The `novel-methodology` type explicitly positions his work as a first-class category, not a deficit state relative to registry-validated entries.

***

### 4.2 Maya — Sustainability Manager, Food & Beverage

**Who**: ESG lead at a mid-size food company with a complex agricultural supply chain, under increasing pressure from buyers and regulators to prove traceability claims. Technically literate but not a developer. Moves fast, judges platforms quickly, and has learned to trust her instincts about whether something is production-ready or still a science project.

**Goals**:

* Identify whether any production-grade Guardian policies exist for her supply chain use case.
* See at a glance who built them, whether they are live on mainnet, and whether a recognised body has validated them.
* Make a go/no-go recommendation to her team without needing a developer to translate.

**Pain points today**:

* Must open dozens of README files to find anything relevant — no filtering by sector or status.
* No trust signal distinguishes a production implementation from a hackathon prototype.
* When she can't find that signal quickly, she doesn't dig deeper. She hands it to a consultant.

**How `policy.yml` helps**: Catalog tooling (Phase 3) renders filterable cards from manifest data. `status`, `registry_status`, mainnet publication indicators, and `standard_body` are immediately visible without opening a README — Maya gets her signal in under three minutes.

***

### 4.3 Priya — Programme Officer, Standards Registry

**Who**: A programme officer at Gold Standard or Verra whose remit includes monitoring the digital ecosystem around their published methodologies. She didn't build Guardian and doesn't operate it day-to-day, but she periodically needs to know which Guardian implementations claim to be based on their standards, at which version, and whether anyone is using a `validated` signal without going through the proper endorsement process.

**Goals**:

* Find all Guardian policies claiming to implement their methodologies, with version information.
* Verify that `methodology_id`, `methodology_version`, and `standard_body` fields are accurate.
* Identify who to contact about implementations that misrepresent the methodology version or status.
* Track which implementations have been through the formal validation process.

**Pain points today**:

* No way to query "all Guardian policies implementing MECD at any version" — requires manually reading every folder.
* Registry status is not recorded at all; there is no distinction between a community demo and a formally endorsed implementation.
* She hears Guardian mentioned in a partner conversation, searches the library, finds three policies claiming to implement their methodology, can't tell which are accurate or current, and makes a note to follow up manually — which never happens.

**How `policy.yml` helps**: Fields `standard_body`, `methodology_id`, `methodology_version`, `registry_status`, `registry_body`, and `registry_reference` give Priya a structured, queryable view of all policies claiming to implement her standard. The `registry_status: validated` field is the formal signal she controls — and the schema makes clear who set it and when.

***

### 4.4 Omar — Engineer, Carbon Marketplace

**Who**: A software engineer at a carbon marketplace or ESG data platform tasked with building a "browse Guardian policies" feature for their product. He is comfortable with APIs and JSON but has no deep Guardian expertise. He needs a stable, queryable index he can depend on — consistent IDs, machine-readable status, IPFS timestamps he can pass directly to an import API.

**Goals**:

* Index all policies without scraping Markdown.
* Filter by category, sector, token type, network, and status programmatically.
* Follow supersession chains to show users when a policy has been replaced.
* Retrieve IPFS timestamps and Hedera topic IDs reliably for downstream import flows.

**Pain points today**:

* Zero machine-readable data — every integration requires custom parsing of inconsistent prose.
* IPFS timestamps appear in different formats across READMEs; some policies have none at all.
* No canonical policy ID — names vary across files, issues, and forum posts.
* He builds a scraper, ships it, and it silently breaks the next time someone adds a policy in an unexpected format. He files it as tech debt and deprioritises Guardian integrations.

**How `policy.yml` helps**: A JSON Schema-validated YAML file with a stable `id` field, consistent field shapes, and a generated `catalog.json` provides the stable contract Omar needs. Supersession chains, network-aware publication records, and semver versioning are all machine-readable without parsing prose.

***

## 5. Proposed Solution

### 5.1 Overview

Introduce a `policy.yml` sidecar manifest file in every policy folder. The file lives alongside the `.policy` bundle and README. It is:

* **YAML** for human readability and inline comments.
* **Validated** against `policy.schema.json` (JSON Schema draft 2020-12) in CI.
* **Stable** — the `id` field is a permanent slug that never changes once a policy is published.
* **Additive** — only a small core of fields is required; all others are opt-in.
* **Versioned** — the schema itself is versioned via the `$id` URI.

### 5.2 File placement

```
Methodology Library/
  Verra/
    Verified Carbon Standard (VCS)/
      VM0007/
        policy.yml          ← manifest (this PRD)
        readme.md           ← existing prose docs (unchanged)
        Policies/
          Verra VM0007 (3.0.0 - groups).policy
  Gold Standard/
    Metered Energy Cooking/
      MECD v2.0/
        policy.yml
        readme.md
        MECD-v2.0.policy
```

### 5.3 Relationship to other files

| File                       | Role                                            | Changed by this PRD?  |
| -------------------------- | ----------------------------------------------- | --------------------- |
| `policy.yml`               | Machine-readable manifest (author-maintained)   | New                   |
| `publications.json`        | Append-only publication log (script-maintained) | New per policy folder |
| `README.md`                | Human-readable prose documentation              | No — unchanged        |
| `*.policy`                 | Guardian policy bundle (import artifact)        | No                    |
| `policy.schema.json`       | JSON Schema for `policy.yml` validation         | New (library root)    |
| `publications.schema.json` | JSON Schema for `publications.json` validation  | New (library root)    |
| `TAG_TAXONOMY.md`          | Tag naming guidance                             | New (library root)    |
| `MANIFEST_SPEC.md`         | Contributor-facing spec                         | New (library root)    |

***

## 6. Full Field Specification

### 6.1 Required fields

| Field         | Type   | Pattern / Enum                                                                                                                   | Description                                                                     | Example                                    |
| ------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------ |
| `id`          | string | `^[a-z0-9]+(?:-[a-z0-9]+)*$`                                                                                                     | Globally unique kebab-case slug. Permanent — never changed after first publish. | `verra-vm0007-redd-plus`                   |
| `name`        | string | 3–120 chars                                                                                                                      | Human-readable display name.                                                    | `Verra VM0007 REDD+ Methodology Framework` |
| `version`     | string | semver regex                                                                                                                     | Semver of this Guardian implementation.                                         | `3.0.0`                                    |
| `description` | string | 20–600 chars                                                                                                                     | 1–3 sentence plain-English summary.                                             |                                            |
| `policy_type` | enum   | See Section 7                                                                                                                    | Classification relative to upstream standards.                                  | `standard-implementation`                  |
| `status`      | enum   | `draft\|candidate\|active\|deprecated\|superseded`                                                                               | Implementation lifecycle state.                                                 | `active`                                   |
| `license`     | string | SPDX identifier                                                                                                                  | Open source license.                                                            | `Apache-2.0`                               |
| `category`    | enum   | `carbon-credits\|emission-reporting\|renewable-energy\|supply-chain\|sustainable-agriculture\|water\|biodiversity\|waste\|other` | Primary domain.                                                                 | `carbon-credits`                           |
| `authors`     | array  | See 6.3                                                                                                                          | Primary authors/organizations.                                                  | `[{name: Envision Blockchain}]`            |
| `tags`        | array  | `^[a-z0-9]+(?:-[a-z0-9]+)*$` each                                                                                                | Discovery tags.                                                                 | `[verra, redd-plus, forest]`               |

### 6.2 Optional fields

| Field                    | Type   | Pattern / Enum                                                              | Description                                                                                                                                    | Example                                 |
| ------------------------ | ------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `category_note`          | string | —                                                                           | Required when `category` is `other`. Short label describing the actual category — used to identify candidates for future enum promotion.       | `parametric insurance`                  |
| `policy_type_note`       | string | —                                                                           | Required when `policy_type` is `other`. Short label describing the actual policy type — used to identify candidates for future enum promotion. | `registry bridge`                       |
| `standard_body`          | string | —                                                                           | Standards organization owning the upstream methodology.                                                                                        | `Verra`                                 |
| `methodology_id`         | string | —                                                                           | Upstream methodology identifier.                                                                                                               | `VM0007`                                |
| `methodology_version`    | string | —                                                                           | Upstream version verbatim as published.                                                                                                        | `7.0`                                   |
| `token_type`             | string | —                                                                           | Token symbol minted by this policy.                                                                                                            | `VCU`                                   |
| `token_standard`         | enum   | `fungible\|HIP-412-NFT\|none`                                               | Hedera token standard.                                                                                                                         | `fungible`                              |
| `registry_status`        | enum   | `none\|pending\|validated\|revoked`                                         | Status with external registry.                                                                                                                 | `validated`                             |
| `registry_body`          | string | —                                                                           | Registry that validated.                                                                                                                       | `Verra`                                 |
| `registry_reference`     | string | —                                                                           | Formal registry reference number.                                                                                                              | `VCS-1234`                              |
| `registry_accepted_date` | string | ISO 8601 date                                                               | Date of registry acceptance.                                                                                                                   | `2024-03-15`                            |
| `hedera_timestamp`       | string | `^[0-9]+\.[0-9]+$`                                                          | Hedera consensus timestamp of the most recent mainnet publication (testnet if not yet on mainnet). Full history in `publications.json`.        | `"1707207286.119377003"`                |
| `sdg_alignment`          | array  | integers 1–17                                                               | UN SDG numbers supported.                                                                                                                      | `[13, 15]`                              |
| `sector`                 | enum   | `energy\|transport\|waste\|land-use\|industrial\|agriculture\|water\|other` | Primary economic sector.                                                                                                                       | `land-use`                              |
| `guardian_version_min`   | string | semver                                                                      | Minimum Guardian platform version.                                                                                                             | `2.20.0`                                |
| `roles`                  | array  | strings                                                                     | Named workflow roles.                                                                                                                          | `["Admin", "Project Proponent", "VVB"]` |
| `dependencies`           | array  | See 6.5                                                                     | Required Guardian modules.                                                                                                                     |                                         |
| `supersedes`             | string | kebab-case                                                                  | ID of policy this replaces. Omit if this is the first version.                                                                                 | `gold-standard-mecd-v1`                 |
| `superseded_by`          | string | kebab-case                                                                  | ID of policy that replaces this. Omit until superseded.                                                                                        | `gold-standard-mecd-v2`                 |
| `resources`              | array  | See 6.6                                                                     | External reference links.                                                                                                                      |                                         |
| `contributors`           | array  | See 6.7                                                                     | Non-author contributors.                                                                                                                       |                                         |
| `maintainers`            | array  | See 6.8                                                                     | Current maintainers.                                                                                                                           |                                         |
| `thumbnail`              | string | relative path                                                               | Path to thumbnail image.                                                                                                                       | `assets/thumbnail.png`                  |
| `homepage`               | string | URI                                                                         | Upstream methodology homepage.                                                                                                                 |                                         |
| `support`                | string | URI or email                                                                | Support URL or email.                                                                                                                          |                                         |

### 6.3 authors / contributors / maintainers objects

```
authors / contributors:
  name:    string  required  display name
  url:     string  optional  website or profile URL
  type:    string  optional  "organization" | "individual" | "community"
  github:  string  optional  GitHub handle (without @)

maintainers:
  name:    string  required
  email:   string  optional  email address
  url:     string  optional  website URL
```

### 6.4 hedera\_timestamp

A nanosecond-precision Hedera consensus timestamp returned by Guardian's publish API. Stored as a quoted string to preserve decimal precision. This is the timestamp of the Hedera message that carries the IPFS CID. Points to the most recent mainnet publication; use the testnet timestamp if the policy has not yet reached mainnet. Full multi-network history is in `publications.json` — see Section 12.

### 6.5 dependencies array items

```
id:           string  required  kebab-case ID matching the dependency's own id field
version_min:  string  optional  minimum semver of the dependency
```

### 6.6 resources array items

```
type:   string  required  "methodology"|"regulation"|"research"|"demo-guide"|"api-docs"|"tool"|"dataset"|"other"
label:  string  required  human-readable link label
url:    string  optional  URI (omit if resource has no URL)
```

### 6.7 sdg\_alignment

Array of integers between 1 and 17 inclusive, with unique values. Maps to the 17 UN Sustainable Development Goals.

### 6.8 tags

Array of unique strings, each matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`. No maximum count is enforced by the schema, but 3–10 tags is typical. See TAG\_TAXONOMY.md for canonical values.

***

## 7. `policy_type` Taxonomy

The `policy_type` field classifies the policy's fundamental relationship to upstream standards. It affects how the catalog presents the policy and which fields are most meaningful.

| Value                     | Description                                                                                                                                                                                                 | Required companion fields                                                     | Example policies                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| `standard-implementation` | Faithfully implements a methodology published and maintained by a recognized external standards body. The implementation may extend or digitize the methodology but does not fundamentally deviate from it. | `standard_body`, `methodology_id`, `methodology_version` strongly recommended | VM0007, MECD v2.0, CDM AMS-III.BA                        |
| `novel-methodology`       | Implements a new or hybrid methodology that is not (fully) covered by any single external standard, or that originated within the Guardian ecosystem. May seek registry validation in future.               | None required but `registry_status: none\|pending` typical                    | EUDR Pre-Check, MMCM (combined CDM), Living Income Price |
| `mrv-template`            | A reusable template or scaffolding for a class of MRV projects. Not a complete policy on its own — designed to be forked, parameterized, and specialized by downstream implementors.                        | None strictly required; `methodology_id` may be present                       | DOVU generic dMRV template, MMCM                         |
| `proof-of-concept`        | Exploratory or demonstration policy. Typically created during hackathons or bounty programs. Not intended for production use.                                                                               | None                                                                          | Hackathon submissions, Work In Progress entries          |
| `toolkit`                 | A collection of schemas, modules, or Guardian configuration utilities that support policy development but are not stand-alone policy workflows.                                                             | None                                                                          | Modules/ entries, reusable schema packs                  |
| `other`                   | Does not fit any of the above types. `policy_type_note` is required — describe the actual type in plain English.                                                                                            | `policy_type_note` required                                                   |                                                          |

### Disambiguation notes

* A policy that implements CDM AMS-III.BA and adds novel Guardian-specific automation is still `standard-implementation` — the novel automation is an implementation detail, not a methodology deviation.
* A policy that _combines_ AMS-III.BA and AMS-III.AJ into a new blended approach for a new project type (e.g., MMCM's ELV recycling) is `novel-methodology` or `mrv-template` depending on whether it is production-ready.
* `proof-of-concept` and `toolkit` policies are excluded from registry status tracking — `registry_status` may be omitted.

***

## 8. Status and Registry Status Lifecycles

### 8.1 `status` — Implementation lifecycle

This tracks the state of the Guardian implementation itself.

```
                    ┌─────────────────────────────────────────────────────┐
                    │                    STATUS LIFECYCLE                 │
                    └─────────────────────────────────────────────────────┘

  [contributor opens PR]        [review passes / testnet publish]
         │                               │
         ▼                               ▼
    ┌─────────┐   ready for review  ┌────────────┐   approved + mainnet-ready
    │  draft  │ ──────────────────► │ candidate  │ ──────────────────────────►  ┌────────┐
    └─────────┘                     └────────────┘                               │ active │
                                                                                  └───┬────┘
                                                                                      │
                               ┌──────────────────────────────┤
                               │                              │
                    known issues /                  newer version published
                    no longer maintained            (supersedes: <old-id>)
                               │                              │
                               ▼                              ▼
                         ┌────────────┐               ┌───────────────┐
                         │ deprecated │               │   superseded  │
                         └────────────┘               └───────────────┘
```

State transition rules:

* Only `active` policies should have mainnet `publications` entries.
* `deprecated` means the policy still functions but is not recommended for new projects.
* `superseded` means a direct replacement exists. Set `superseded_by` to the replacement's `id`.
* `draft` and `candidate` are testnet-only states.

### 8.2 `registry_status` — External registry validation

This tracks whether the underlying methodology/project has been formally validated by an external registry body (e.g., Verra, Gold Standard). It is independent of `status`.

```
    ┌──────────────────────────────────────────────────────────────────────┐
    │                    REGISTRY_STATUS LIFECYCLE                        │
    └──────────────────────────────────────────────────────────────────────┘

  [community/novel method]    [submitted to registry]    [registry approves]
          │                          │                          │
          ▼                          ▼                          ▼
       ┌──────┐   application    ┌─────────┐   validation   ┌───────────┐
       │ none │ ───────────────► │ pending │ ─────────────► │ validated │
       └──────┘                  └─────────┘                └─────┬─────┘
                                                                   │
                                                        methodology withdrawn /
                                                        compliance failure
                                                                   │
                                                                   ▼
                                                             ┌─────────┐
                                                             │ revoked │
                                                             └─────────┘
```

Notes:

* `registry_status` is most meaningful for `standard-implementation` and `novel-methodology` policy types.
* For `mrv-template`, `proof-of-concept`, and `toolkit` types, omit `registry_status` or set to `none`.
* `validated` implies `registry_body` should be populated.
* `revoked` does not necessarily mean the Guardian implementation is broken; it means the upstream registry has withdrawn validation. The Guardian `status` should be updated to `deprecated` or `superseded` accordingly.

***

## 9. Tag Taxonomy Guidance

Tags drive catalog filtering and search. The full taxonomy lives in TAG\_TAXONOMY.md. Key principles:

### Naming convention

All tags must be lowercase and hyphenated: `redd-plus`, `land-use`, `south-asia`. No uppercase, no underscores, no dots, no spaces.

### Enforcement model

Tags are validated for _format_ by the JSON Schema (any malformed tag fails CI). Tags are validated for _content_ by a separate lint step that compares against TAG\_TAXONOMY.md:

* **Unknown tags** → warning annotation in PR, does not block merge.
* **Malformed tags** → schema validation failure, blocks merge.

### Required coverage

A complete manifest should include at least:

1. One **standard-body** tag (if `standard_body` is set).
2. One **thematic** tag describing the activity type.
3. One **geographic** tag if the policy is region-specific.
4. Optionally, one **programme/origin** tag for community or hackathon submissions.

### Proposing canonical tags

Tags not yet in the taxonomy can be used freely. To canonicalize a tag, open a PR adding it to TAG\_TAXONOMY.md with a description. Maintainers merge if the tag is useful across 3+ policies and not redundant.

***

## 10. Versioning Convention

### Two version fields

```
version             semver of the Guardian implementation
methodology_version upstream version as published by the standard body
```

These fields track different things and must not be conflated.

### `version` — Guardian implementation semver

Follows standard [semver](https://semver.org/):

| Increment     | When                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| Patch `x.y.Z` | Bug fixes, documentation corrections, minor schema field additions that don't change validation logic            |
| Minor `x.Y.0` | New roles, new optional fields, workflow additions that are backward-compatible with existing `.policy` imports  |
| Major `X.0.0` | Breaking schema changes, workflow redesign, or implementation of a new major version of the upstream methodology |

### `methodology_version` — upstream verbatim

This is copied literally from the standard body's published document. It follows whatever versioning scheme the standards body uses (e.g., `7.0` for Verra VM0007 version 7.0, `2.0` for MECD v2.0). It is a string, not a semver.

### Version and lineage example

```
gold-standard-mecd-v1  (version: "1.2.0", methodology_version: "1.2")
        │
        │  supersedes: gold-standard-mecd-v1
        ▼
gold-standard-mecd-v2  (version: "2.0.0", methodology_version: "2.0")
```

When releasing v2, set:

* New manifest: `version: "2.0.0"`, `supersedes: "gold-standard-mecd-v1"`
* Old manifest: `status: superseded`, `superseded_by: "gold-standard-mecd-v2"`

***

## 11. Thumbnail Specification

### Purpose

Thumbnails are used by catalog UIs to give policies a visual identity at a glance — useful for grid/card layouts.

### File conventions

| Aspect                 | Requirement                                     |
| ---------------------- | ----------------------------------------------- |
| Location               | `assets/` subdirectory adjacent to `policy.yml` |
| Path format            | Relative: `assets/thumbnail.png`                |
| Recommended dimensions | 400 × 300 px (4:3 ratio)                        |
| Accepted formats       | PNG (preferred), JPEG                           |
| Maximum file size      | 200 KB                                          |
| Background             | Transparent (PNG) or white/light neutral        |
| Minimum dimensions     | 200 × 150 px                                    |

### Fallback logic

If `thumbnail` is omitted from the manifest, the catalog falls back in order:

1. `assets/thumbnail.png` (convention path — checked automatically).
2. `assets/thumbnail.jpg` (JPEG convention).
3. Generated icon based on `category` and `policy_type` (rendered server-side).

Fallback (3) is always available, so thumbnails are never strictly required.

### Recommendations

* For standard implementations, use the standard body's logo or a representative diagram (check IP rights — most standards bodies permit non-commercial use with attribution).
* For community/novel policies, a simple icon representing the activity type (cookstoves, forest, supply chain) is effective.
* Do not include text in the thumbnail — it will not render well at small sizes.

***

## 12. Publication Records

### Design: two-file split

Publication history is split across two files with different ownership and update cadences:

| File                              | Owned by                    | Updated how   | Contents                                                                              |
| --------------------------------- | --------------------------- | ------------- | ------------------------------------------------------------------------------------- |
| `policy.yml` (`hedera_timestamp`) | Policy author               | Manually      | Single convenience timestamp — most recent mainnet (or testnet if not yet on mainnet) |
| `publications.json`               | `record-publication` script | Automatically | Full append-only log of every network × version publication event                     |

This separation exists because **the Hedera timestamp is generated by Guardian at publish time** — the contributor cannot know it before publishing. Asking contributors to manually maintain a structured YAML array inside `policy.yml` after every publish action is error-prone and will not be done consistently. The script removes the manual step entirely.

### `hedera_timestamp` in `policy.yml`

A single string field. Update it by hand whenever a new mainnet version is published (copy-paste from the Guardian publish confirmation screen). For testnet-only policies, use the testnet timestamp.

```yaml
# Most recent Hedera consensus timestamp. Full history in publications.json.
hedera_timestamp: "1707207286.119377003"
```

### `publications.json` — the append-only log

Validated against `publications.schema.json`. Written exclusively by `scripts/record-publication.js`. Never edited by hand.

**Structure:**

```json
{
  "policy_id": "verra-vm0007-redd-plus",
  "entries": [
    {
      "network": "testnet",
      "version": "1.1.0",
      "hedera_timestamp": "1707207018.434778003",
      "published_by": "Knowhere",
      "recorded_at": "2024-02-06T10:00:00Z",
      "notes": "Initial demonstration"
    },
    {
      "network": "mainnet",
      "version": "3.0.0",
      "hedera_timestamp": "1707207286.119377003",
      "hedera_topic_id": "0.0.5678901",
      "published_by": "Knowhere",
      "recorded_at": "2024-02-06T14:00:00Z"
    }
  ]
}
```

**Recording a new publication:**

```bash
node scripts/record-publication.js \
  --policy verra-vm0007-redd-plus \
  --network mainnet \
  --version 3.0.0 \
  --hedera-timestamp 1707207286.119377003 \
  --topic-id 0.0.5678901
```

The script appends one entry and commits the file. The contributor also updates `hedera_timestamp` in `policy.yml` if this is a mainnet publication.

### Testnet-only signal

A policy whose `publications.json` contains no mainnet entry has never been published to production. Catalog tooling surfaces this as the absence of a "Live on mainnet" badge — the missing entry is itself an informative signal, not a gap.

### hedera\_timestamp format

Nanosecond-precision Hedera consensus timestamp as returned by Guardian's publish API. Stored as a quoted YAML/JSON string — not a number — to preserve decimal precision: `"1707207149.487956003"`, not `1707207149.487956003`.

### File placement example

```
Verra/Verified Carbon Standard (VCS)/VM0007/
  policy.yml           ← hedera_timestamp: "1707207286.119377003"  (author-maintained)
  publications.json    ← full 4-entry history across 3 versions    (script-maintained)
  readme.md
  Policies/
    Verra VM0007 (3.0.0 - groups).policy
```

***

## 13. Success Metrics

### Phase 1 — Schema and examples

| Metric                                                         | Target                                          |
| -------------------------------------------------------------- | ----------------------------------------------- |
| JSON Schema validates without errors                           | Pass on day 1                                   |
| 5 sample `policy.yml` files pass schema validation             | Pass on day 1                                   |
| MANIFEST\_SPEC.md accessible to contributor in < 10 min review | Qualitative — validated by contributor feedback |

### Phase 2 — Backfill and tooling

| Metric                                                   | Target                                         |
| -------------------------------------------------------- | ---------------------------------------------- |
| Percentage of library policies with a valid `policy.yml` | ≥ 80% within 90 days of Phase 2 launch         |
| CI check running on all PRs that touch `policy.yml`      | Pass/fail signal on 100% of relevant PRs       |
| Mean time to fill out a manifest (new contributor)       | ≤ 30 minutes (measured via contributor survey) |
| Schema validation error rate on submitted manifests      | < 5% after first 30 days                       |

### Phase 3 — Mini-site

| Metric                                        | Target                                            |
| --------------------------------------------- | ------------------------------------------------- |
| Catalog pages indexed by search engines       | ≥ 90% of active policies within 60 days           |
| Filter usage (category, sector, SDG, network) | ≥ 40% of catalog sessions use at least one filter |
| Time-to-find a specific policy (user test)    | < 2 minutes for a non-expert user                 |

### Phase 4 — Guardian integration

| Metric                                                      | Target                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| Policies importable via manifest reference (vs file upload) | Available for all policies with a mainnet publication entry        |
| Developer adoption of manifest-first import                 | ≥ 50% of new policy imports use manifest reference within 6 months |

***

## 14. Phased Rollout

### Phase 1 — Schema and examples

**Scope**: Infrastructure only. No policy backfill required.

Deliverables:

* `policy.schema.json` — JSON Schema draft 2020-12 at library root.
* `MANIFEST_SPEC.md` — contributor-facing field reference.
* `TAG_TAXONOMY.md` — tag naming guidance.
* `POLICY_MANIFEST_PRD.md` — this document.
* Five sample `policy.yml` files (VM0007, MECD v2.0, EUDR Pre-Check, DOVU MMCM, Living Income Price).

Success criteria: All five sample files pass `ajv validate` against the schema.

***

### Phase 2 — Backfill and tooling

**Scope**: Systematically add `policy.yml` to all existing policies and add CI validation.

Deliverables:

* GitHub Actions workflow: `.github/workflows/validate-manifests.yml`
  * Triggers on PR touching any `policy.yml`.
  * Runs schema validation; fails PR if invalid.
  * Runs tag lint; annotates PR if unknown tags present.
* Backfill all existing policies via a dedicated initiative (issues created per policy folder).
* Contribute script: `tools/scaffold-manifest.js` — interactive CLI to generate a starter `policy.yml` from prompts.
* Documentation: update contributing guide to reference manifest requirement for new policies.

Success criteria: ≥ 80% of existing policies have valid manifests; CI green on all new PRs.

***

### Phase 3 — Mini-site

**Scope**: Consumer-facing catalog UI driven by manifest data.

Deliverables:

* Static site generator (e.g., Astro or Next.js static export) that:
  * Traverses the library and indexes all valid `policy.yml` files.
  * Renders a filterable card grid (filter by category, sector, SDG, token type, network, status).
  * Renders individual policy detail pages with full manifest data and links to README.
  * Embeds publications table with IPFS timestamps and Hedera topic links.
* Hosted at a Guardian docs subdomain (TBD).
* Search (static — lunr.js or pagefind).

Success criteria: Catalog publicly accessible; 3+ filters working; all active policies rendered.

***

### Phase 4 — Guardian platform integration

**Scope**: Surfacing manifest data inside the Guardian application itself.

Deliverables:

* Guardian API endpoint: `GET /api/v1/policies/manifest/{id}` — returns parsed manifest JSON.
* Policy import dialog enhanced to accept: (a) file upload (existing), (b) IPFS timestamp (existing), (c) manifest `id` lookup against the catalog index (new).
* Guardian policy list view enhanced with category/sector/SDG badges sourced from manifest.
* Webhook / event: `manifest.updated` — emitted when a `policy.yml` changes in the library, enabling Guardian instances to refresh their local catalog cache.

Success criteria: Policy import by manifest ID works end-to-end on testnet; Guardian UI surfaces category and SDG badges.

***

## 15. Open Questions and Decisions Needed

| #  | Question                                                                                                                | Options                                                                                                    | Owner         | Priority |
| -- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------- | -------- |
| 1  | **ID stability**: Can `id` ever be changed after first publish?                                                         | (a) Never — tombstone the old id. (b) Allowed with a deprecated alias.                                     | Platform team | High     |
| 2  | **Schema versioning**: How do we version the schema itself as fields are added?                                         | (a) `$id` URI includes version; old schemas stay. (b) Single schema with optional additions.               | Platform team | High     |
| 3  | **Methodology version format**: Should `methodology_version` be validated by pattern or free string?                    | (a) Free string (current — simplest). (b) Pattern per standard body.                                       | Platform team | Medium   |
| 4  | **registry\_status ownership**: Who is authorized to set `registry_status: validated`?                                  | (a) Anyone (honor system). (b) Only maintainers (via CODEOWNERS). (c) Registry body sign-off via GPG.      | Governance    | High     |
| 5  | **Thumbnail IP**: Do we need a formal IP policy for thumbnails using standards body logos?                              | (a) Require original artwork only. (b) Allow with attribution.                                             | Legal         | Medium   |
| 6  | **Closed vs open tag set**: Should we eventually move to a closed tag enum in the schema?                               | (a) Keep open (warning-only). (b) Harden to error after Phase 2.                                           | Platform team | Low      |
| 7  | **hedera\_timestamp as string vs number**: YAML parsers can truncate float precision. Is quoting convention sufficient? | (a) String (current). (b) Add schema `type: string` with note.                                             | Platform team | Medium   |
| 8  | **Guardian version compatibility matrix**: Should `guardian_version_min` be checked programmatically?                   | (a) Documentation only. (b) CI reads Guardian release tags and warns.                                      | Tooling team  | Low      |
| 9  | **Internationalization**: Should `description` and `name` support i18n keys or localized variants?                      | (a) English-only (current). (b) `description_i18n: {fr: "...", es: "..."}` optional fields.                | Platform team | Low      |
| 10 | **Manifest signing**: Should published manifests be cryptographically signed?                                           | (a) No — trust the Git history. (b) Yes — GPG sign merged manifests. (c) Hedera DID signature in manifest. | Governance    | Medium   |
