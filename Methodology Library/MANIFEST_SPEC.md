# Guardian Policy Manifest Specification

> **Audience**: policy contributors and methodology authors adding or updating a policy in the Guardian Methodology Library.
> [See PRD for additional context](../docs/guardian/community-standards/rfcs/POLICY_MANIFEST_PRD.md).
> **Schema**: [policy.schema.json](./policy.schema.json)

---

## Quick start — minimal valid `policy.yml`

Drop this file alongside your `.policy` bundle. Fill in the required fields; all others are optional.

```yaml
id: my-policy-slug          # kebab-case, globally unique, stable
name: My Policy Name        # human-readable display name
version: "1.0.0"            # semver of this Guardian implementation
description: >
  One-to-three sentences explaining what this policy does and
  which upstream methodology it implements.
policy_type: standard-implementation   # see policy_type guide below
status: active                         # draft | candidate | active | deprecated | superseded
license: Apache-2.0                    # SPDX identifier
category: carbon-credits               # see category enum below
authors:
  - name: Your Organization
tags:
  - your-tag
  - another-tag
```

That is the complete minimum. Everything else is optional but strongly encouraged for published policies.

---

## Field reference

### Required fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Kebab-case unique slug. Must be stable across versions — never change once published. | `verra-vm0007-redd-plus` |
| `name` | string | Human-readable display name (3–120 chars). | `Verra VM0007 REDD+ Methodology Framework` |
| `version` | string | Semver of this Guardian implementation. See [versioning](#versioning-convention). | `3.0.0` |
| `description` | string | 1–3 sentence plain-English summary (20–600 chars). | |
| `policy_type` | enum | See [policy_type guide](#policy_type-guide). | `standard-implementation` |
| `status` | enum | `draft` \| `candidate` \| `active` \| `deprecated` \| `superseded` | `active` |
| `license` | string | SPDX license identifier. | `Apache-2.0` |
| `category` | enum | `carbon-credits` \| `emission-reporting` \| `renewable-energy` \| `supply-chain` \| `sustainable-agriculture` \| `water` \| `biodiversity` \| `waste` \| `other` | `carbon-credits` |
| `authors` | array | One or more `{name, url?, type?, github?}` objects. | See below |
| `tags` | array | Lowercase-hyphenated strings. See [TAG_TAXONOMY.md](./TAG_TAXONOMY.md). | `[verra, redd-plus, forest]` |

### Optional fields (strongly recommended for active policies)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `category_note` | string | **Required when `category: other`.** Short label for the actual category — used to identify candidates for future enum promotion. | `parametric insurance` |
| `policy_type_note` | string | **Required when `policy_type: other`.** Short label for the actual policy type — used to identify candidates for future enum promotion. | `registry bridge` |
| `standard_body` | string | Standards organization owning the upstream methodology. | `Verra` |
| `methodology_id` | string | Upstream methodology identifier. | `VM0007` |
| `methodology_version` | string | Upstream version verbatim. | `7.0` |
| `token_type` | string | Token symbol minted by this policy. | `VCU` |
| `token_standard` | enum | `fungible` \| `HIP-412-NFT` \| `none` | `fungible` |
| `registry_status` | enum | `none` \| `pending` \| `validated` \| `revoked` | `validated` |
| `registry_body` | string | Registry that validated (when `registry_status: validated`). | `Verra` |
| `registry_reference` | string | Formal registry reference number. | `VCS-1234` |
| `registry_accepted_date` | string | ISO 8601 date of registry acceptance. | `2024-03-15` |
| `hedera_timestamp` | string | Hedera consensus timestamp of the most recent mainnet publication (testnet if not yet on mainnet). Full history lives in `publications.json`. | `"1707207286.119377003"` |
| `sdg_alignment` | array | UN SDG numbers 1–17. | `[13, 15]` |
| `sector` | string | `energy` \| `transport` \| `waste` \| `land-use` \| `industrial` \| `agriculture` \| `water` \| `other` | `land-use` |
| `guardian_version_min` | string | Minimum Guardian platform version required. | `2.20.0` |
| `roles` | array | Role name strings defined in the workflow. | `["Admin", "Project Proponent", "VVB"]` |
| `dependencies` | array | `{id, version_min?}` — other Guardian module IDs required. | |
| `supersedes` | string \| null | ID of the policy this replaces. | `gold-standard-mecd-v1` |
| `superseded_by` | string \| null | ID of policy that replaces this one. | |
| `resources` | array | External links. See [resources array](#resources-array). | |
| `contributors` | array | `{name, url?, type?, github?}` contributors beyond primary authors. | |
| `maintainers` | array | `{name, email?, url?}` current maintainers. | |
| `thumbnail` | string | Relative path to thumbnail image. See [thumbnails](#thumbnail-conventions). | `assets/thumbnail.png` |
| `homepage` | string | Upstream methodology or project homepage URL. | |
| `support` | string | Support URL or email address. | |

---

## `policy_type` guide

| Value | Use when... | Examples |
|-------|-------------|---------|
| `standard-implementation` | The policy faithfully implements a published methodology from a recognized standards body (Verra, Gold Standard, CDM, etc.). The methodology_id and standard_body fields should always be populated. | VM0007 REDD+, GS MECD, CDM AMS-III.BA |
| `novel-methodology` | The policy implements a new methodology not yet (or not fully) covered by an external standard, or a hybrid/extension of existing methodologies. May or may not have a registry_status. | EUDR Pre-Check, MMCM combined methodology, LIP |
| `mrv-template` | A reusable skeleton or scaffolding policy for a class of MRV projects. Not a complete policy on its own — intended to be forked and parameterized. | DOVU MMCM, generic dMRV templates |
| `proof-of-concept` | An exploratory or demonstration policy, not intended for production use. Typically found in Hackathon/ or Work In Progress/. | Hackathon submissions |
| `toolkit` | A set of schemas, modules, or utilities that support policy development but do not constitute a stand-alone policy workflow. | Modules/, reusable schema packs |
| `other` | Does not fit any of the above. `policy_type_note` is required — describe the actual type in plain English. | |

---

## Status lifecycle

Policies move through the following states:

```
                              ┌─────────┐
              initial commit  │         │
         ─────────────────►   │  draft  │
                              │         │
                              └────┬────┘
                                   │ ready for review
                                   ▼
                           ┌────────────┐
                           │            │
                           │ candidate  │
                           │            │
                           └──────┬─────┘
                                  │ passes review / live on testnet
                                  ▼
                            ┌──────────┐
             ┌──────────────│          │──────────────────────────┐
             │   issues     │  active  │  newer version published  │
             │   found      │          │                           │
             ▼              └──────────┘                           ▼
      ┌────────────┐                                      ┌────────────────┐
      │            │                                      │                │
      │ deprecated │                                      │   superseded   │
      │            │                                      │                │
      └────────────┘                                      └────────────────┘
```

- **draft** — work in progress; schema may be incomplete.
- **candidate** — implementation complete and under review; suitable for testnet use.
- **active** — production-ready; approved for mainnet publication.
- **deprecated** — no longer recommended; kept for reference. Set `superseded_by` if a replacement exists.
- **superseded** — explicitly replaced by another policy. Set `superseded_by` to the new policy's `id`.

When a policy moves to `superseded`, set `superseded_by` in the old manifest and `supersedes` in the new one.

---

## Versioning convention

Two version fields serve different purposes:

| Field | Tracks | Example |
|-------|--------|---------|
| `version` | The Guardian **implementation** — policy file, schemas, workflow logic, bug fixes | `3.0.0` |
| `methodology_version` | The **upstream methodology** version as published by the standards body | `7.0` |

Increment `version` using standard semver rules:
- **Patch** (`x.y.Z`): bug fixes, documentation, minor schema corrections.
- **Minor** (`x.Y.0`): new roles, new optional fields, workflow improvements that are backward-compatible.
- **Major** (`X.0.0`): breaking schema changes, workflow redesign, major methodology version bump.

`methodology_version` is copied verbatim from the upstream standard (e.g., `"7.0"` for VM0007 v7, `"2.0"` for MECD v2.0). It does not follow semver; it mirrors whatever the standard body publishes.

---

## Publication records

Publication history is split across two files with different ownership:

| File | Who writes it | How |
|---|---|---|
| `policy.yml` (`hedera_timestamp`) | Policy author | Manually — paste the most recent mainnet timestamp (or testnet if not yet on mainnet) |
| `publications.json` | The `record-publication` script | Automatically — run once after each Guardian publish action |

### `hedera_timestamp` in `policy.yml`

A single convenience field for the most recent mainnet publication — used by Guardian's one-click import. Update it whenever a new mainnet version is published.

```yaml
# Most recent Hedera consensus timestamp. Full history in publications.json.
hedera_timestamp: "1707207286.119377003"
```

For testnet-only policies, use the testnet timestamp. The absence of a mainnet entry in `publications.json` is itself a visible signal in the catalog (no "Live on mainnet" badge).

### `publications.json` — the full history

After publishing in Guardian, run:

```bash
node scripts/record-publication.js \
  --policy verra-vm0007-redd-plus \
  --network mainnet \
  --version 3.0.0 \
  --hedera-timestamp 1707207286.119377003 \
  --topic-id 0.0.5678901
```

The script appends one record to `publications.json` in the policy folder. **Never edit `publications.json` by hand.**

The file is validated against `publications.schema.json`. See `Verra/Verified Carbon Standard (VCS)/VM0007/publications.json` for a worked example with multiple network entries across three versions.

---

## Resources array

Link to external references that help users understand or verify the policy:

```yaml
resources:
  - type: methodology
    label: "Verra VM0007 REDD+ Methodology Framework"
    url: "https://verra.org/methodologies/vm0007-redd-methodology-framework-redd-mf/"
  - type: demo-guide
    label: "Guardian Demo Guide — Verra REDD+"
    url: "https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/verra-redd+-demo-guide"
  - type: research
    label: "Berkeley Cookstove Overcrediting Study (2023)"
    url: "https://assets.researchsquare.com/files/rs-2606020/v1/c2e6a772-b013-49f9-9fc4-8d7d82d4bebc.pdf"
```

Allowed `type` values: `methodology`, `regulation`, `research`, `demo-guide`, `api-docs`, `tool`, `dataset`, `other`.

---

## Thumbnail conventions

- Place the thumbnail in an `assets/` subdirectory next to `policy.yml`.
- Reference it as a relative path: `thumbnail: assets/thumbnail.png`
- Recommended dimensions: **400 × 300 px** (4:3 ratio).
- Accepted formats: PNG (preferred) or JPEG.
- Maximum file size: 200 KB.
- If `thumbnail` is omitted, the catalog falls back to a generated icon based on `category` and `policy_type`.

---

## Tag guidance

See [TAG_TAXONOMY.md](./TAG_TAXONOMY.md) for the full canonical tag list and naming rules.

Key rules:
- All tags must be lowercase and hyphenated: `redd-plus`, not `REDD+` or `redd_plus`.
- Include at least one standard-body tag if `standard_body` is set.
- Include at least one thematic tag.
- Include a geographic tag if the policy is region-specific.

---

## Validation

### Validate locally with AJV

Install the AJV CLI (requires Node.js 18+):

```bash
npm install -g ajv-cli ajv-formats
```

Validate a single `policy.yml`:

```bash
# Convert YAML to JSON first (requires js-yaml or yq)
yq -o=json . path/to/policy.yml > /tmp/policy.json

# Validate against the schema
ajv validate \
  --spec=draft2020 \
  -c ajv-formats \
  -s "Methodology Library/policy.schema.json" \
  -d /tmp/policy.json
```

### Validate all manifests at once

```bash
find "Methodology Library" -name "policy.yml" | while read f; do
  yq -o=json . "$f" > /tmp/policy.json
  echo -n "$f: "
  ajv validate --spec=draft2020 -c ajv-formats \
    -s "Methodology Library/policy.schema.json" \
    -d /tmp/policy.json 2>&1 | tail -1
done
```

### CI

A GitHub Actions workflow (`.github/workflows/validate-manifests.yml`) runs this check on every PR that touches a `policy.yml` file. Failures block merge. Tag warnings (unrecognized tags from `TAG_TAXONOMY.md`) are reported as annotations but do not block merge.
