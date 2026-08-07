# Decode Method Design

How a Guardian policy and its Verifiable Credentials become a single project row: how field mappings
are derived from policy schemas, and how each VC is attributed to the right project through the
four-stage resolver chain (M1–M4).

## Overview

Guardian publishes documents to Hedera as Verifiable Credentials. Nothing in a VC says *"this belongs
to project X"* in a form the Atlas can read directly, and nothing says *"this field is the project
name."* Both have to be derived. The Atlas does that in two independent passes:

| Pass | Question it answers | When it runs | Output |
|---|---|---|---|
| **Policy decode** | Which schema field holds each value we display? | Once per published policy version | `policyMapping` + `schemaFields` on the `policy` row |
| **Project-key resolution** | Which project does this VC belong to? | Once per VC, at IPFS-fetch time | `projectKey` + `decodeMethod` + `metadata` on `business_view` |

The two are deliberately separate. A mapping is a property of the *policy*; an attribution is a
property of the *document*. Re-deriving one does not require re-deriving the other — which is exactly
what the re-decode / re-parse split in [Policy decode](policy-decode.md) exposes operationally.

## Pass 1 — Deriving the field mapping

Triggered by an `Instance-Policy` / `publish-policy` message. `policy-decode.processor.ts` pulls the
policy ZIP from IPFS and runs the pipeline in `src/worker/mapping/`.

### Steps

1. **Flatten** — `flatten-schema-fields.ts` walks every schema in the policy and produces a flat
   `FlattenedSchemaField[]`: `{ schemaIri, schemaName, path, title, description, type, isGeoJson }`.
   Nested Guardian sub-schemas flatten to **dotted paths** (`field0.field3`), which is what makes
   nested field labels resolvable later.
2. **Classify each schema** — `classify-schema-type.ts` assigns a coarse `schemaType`:
   `project` | `mintToken` | `standardRegistry` | `other`. This decides whether a schema feeds project
   extraction at all.
3. **Classify each document** — `document-type-classifier.ts` assigns a `DocumentType`:
   `pdd` | `monitoringReport` | `validationReport` | `verificationReport` | `registration` | `unknown`.
   This is a *lifecycle role*, orthogonal to `schemaType` (which is a *data class*).
4. **Match fields** — the injected `IMapFieldsStrategy` scores each flattened field against the
   canonical target set in `PROJECT_EXTRACT_FIELDS` (`name`, `description`, `country`, `developer`,
   `category`, `scale`, `sector`, `vintageRaw`, `creditingPeriod{,Start,End}`, `sdgOrCobenefits`,
   `geo`). See [Mapping module](mapping-module.md) for the strategies and how to add one.
5. **Derive project meta** — `derive-project-meta.ts` picks the policy's designated project schema
   and geo key.
6. **Persist** — the result is written to the `policy` row as `policyMapping` and `schemaFields`.

### Mapping shape

`PolicyMapping` is `Partial<Record<ProjectFieldKey | string, PolicyMappingEntry[]>>` — each target
field holds **multiple ranked candidates**, ordered by descending `score`, not a single winner. The
`isProjectSchema` flag on an entry is a **priority hint, not a hard filter**; a policy whose project
schema is misidentified still extracts, just with weaker ranking.

## Pass 2 — Resolving which project a VC belongs to

Runs per VC in `ipfs-fetch.processor.ts` → `ProjectMapperService.upsertProjectFromVc()`. The
attribution work is delegated to `ProjectKeyResolverChain`, which runs four strategies **in order and
short-circuits on the first `resolved`**.

Each strategy returns one of three outcomes:

| Outcome | Meaning | Chain behaviour |
|---|---|---|
| `resolved` | This VC belongs to project `projectKey` | Stop; use it |
| `pass` | This strategy has no opinion | Try the next strategy |
| `reject` | This VC must **not** be attributed by this route | Stop; do not fall through |

`reject` is what prevents a weaker downstream strategy from silently mis-attributing a document that
a stronger one has already ruled out.

### The chain

| # | Strategy | `method` | Basis for the key |
|---|---|---|---|
| **M1** | `DynamicTopicResolver` | `topic` | The VC sits on a project-dedicated dynamic topic. Keys on that topic's **canonical project `cs.id`** — the earliest project-schema VC in the topic |
| **M2** | `CsRefResolver` | `csRef` | Walks the `credentialSubject.ref` chain to its anchor |
| **M3** | `RelationshipsResolver` | `relationships` | BFS over `options.relationships` to find an ancestor already keyed to a project |
| **M4** | `ProjectSchemaResolver` | `projectSchema` | The VC *is itself* a project-schema document — its own `cs.id` is the key |

Every VC is ultimately keyed by a **`cs.id`**, never a topic id. M1 records which dynamic topic it
merged on in `metadata.dynamicTopicId`; M2–M4 record the anchor VC's timestamp in
`metadata.rootVcTimestamp`. Both are persisted to `businessData.metadata`, so any project row can be
traced back to how it was resolved.

### M2's anchoring rule

The `cs.ref` walk does **not** simply climb to the chain root. Doing so collapsed distinct projects
under a shared registrant into one row: each per-project listing application referenced a
per-developer application, so every sibling project keyed on the developer's DID and overwrote its
predecessors through `ON CONFLICT (projectKey)`.

`resolveViaRef` therefore **anchors on the project-schema VC** and stops as soon as the next ancestor
is not a project schema. This keeps reports linked to their project and still merges genuine
multi-registration cases — it climbs only *through contiguous project-schema VCs*.

### Circuit breakers

Each strategy is wrapped in its own `CircuitBreaker` (threshold **5** consecutive failures, cooldown
**30 s**). An open breaker short-circuits that strategy to `pass` without calling it, so a strategy
failing against one malformed policy degrades to the next strategy instead of stalling ingestion.
After the cooldown a single half-open probe decides whether to close it again.

## How the two passes meet: field extraction

With a `projectKey` resolved and a `policyMapping` available, `ProjectMapperService` extracts values —
but not indiscriminately. Periodic reports carry their own `host_countries[]` and similar fields, and
letting them write descriptive data pollutes the project record.

The guard is `isDateOnlySource = docType === 'monitoringReport' || docType === 'verificationReport'`.
For those documents only `DATE_ONLY_FIELD_KEYS` (`vintageRaw`, `creditingPeriod`,
`creditingPeriodStart`, `creditingPeriodEnd`) are extracted; descriptive fields are skipped.
`validationReport` contributes nothing. `pdd` and `registration` remain the source of descriptive
fields.

`name` is exempt: it may gap-fill from any data-bearing VC, because a project whose project-schema VC
has not yet arrived would otherwise display a raw DID as its title.

Merge order matters — the project-schema VC's `businessData` overrides other sources, so
`decodeMethod` converges on the identity VC's method rather than whichever VC happened to arrive last.

## Operational notes

> **NOTE:** Resolver changes only affect VCs processed **after** a worker restart. Existing rows keep
> the key and `decodeMethod` they were written with, and show `Unknown` until reparsed. A full
> re-attribution needs `BACKFILL_PROJECTS_ON_BOOT=true` for one restart, or the methodology reparse
> endpoint.

Because the known-project check in M2/M3 depends on a project row already existing, attribution is
**order-dependent** and converges over repeated passes — the project-schema VC keys the row through
M4/M2 first, then later documents attach to it. A single reparse pass is not always sufficient on a
cold database.

## Additional documentation

- [Policy decode](policy-decode.md) — retry, re-decode and storage decisions for pass 1
- [Mapping module](mapping-module.md) — the field-matching strategy layer
- [Decode flow](decode-flow.md) — the queues and message types that drive both passes
- [Architecture overview](README.md) — where all of this sits in the wider pipeline
