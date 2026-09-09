# Sustainability Atlas Documentation

Entry point for everything written about the Atlas. End-user material and developer material are kept
apart — start with the section that matches why you are here.

## For people using the Atlas

The [User Manual](user-manual/README.md) covers the application from a user's point of view: finding
and filtering projects, reading a credit record, building a portfolio, exporting data, and what every
page on the site is for. No technical background assumed.

| Start here | If you want to |
|---|---|
| [Getting started](user-manual/01-getting-started.md) | Take the guided tour, create an account, sign in |
| [Navigating the Atlas](user-manual/02-navigating-the-atlas.md) | Understand the sidebar, search and the network selector |
| [FAQ and troubleshooting](user-manual/15-faq-and-troubleshooting.md) | Work out why something looks wrong |

## For people building the Atlas

| Document | Covers |
|---|---|
| [Architecture overview](architecture/README.md) | Multi-network topology, the ingest pipeline, deduplication, leader election, horizontal scaling, database entities |
| [Guardian topic hierarchy](architecture/guardian-topic-hierarchy.md) | How Guardian's HCS topic tree is shaped, with a traced mainnet example. Canonical reference for the topic model |
| [Decode flow](architecture/decode-flow.md) | Message types, the five-queue decode pipeline, reparse endpoints, and fields dropped during normalization |
| [Decode method design](architecture/decode-method.md) | How field mappings are derived from policy schemas, and how the M1–M4 resolver chain attributes each VC to a project |
| [Policy decode](architecture/policy-decode.md) | How a policy becomes schema and field mappings; retry, re-decode and storage decisions |
| [Mapping module](architecture/mapping-module.md) | The field-mapping strategy layer and how to add a strategy |

## Service documentation

These stay next to the code they describe:

- [Frontend](../frontend/README.md) — Nuxt app: tech stack, project layout, shadcn-vue conventions
- [Snapshot](../snapshot/README.md) — exporting and importing a database and IPFS snapshot

## Planning

- [Feature backlog](backlog.md) — proposed features with acceptance criteria. A roadmap, **not** a
  record of what has shipped; git history is the changelog.

## Conventions

Documentation here is **plain portable Markdown**. This tree is not GitBook-published, so it uses
blockquote callouts (`> **NOTE:** ...`) rather than GitBook hint blocks. Every fenced code block
carries a language tag, structured comparisons go in tables, and there are deliberately no
screenshots — see the [user manual's conventions](user-manual/README.md) for why.
