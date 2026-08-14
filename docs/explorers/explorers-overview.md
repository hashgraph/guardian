---
description: >-
  An introduction to Guardian's explorer tools and how each serves a different
  audience.
tags:
  - new
---

# Explorers Overview

Guardian produces a large amount of data as activity flows through the platform. This includes primatives such as projects, credits, policies, methodologies, organizations, and verification documents.&#x20;

**Explorers** are dedicated applications that surface data published to the Hedera Network for different audiences, each presenting the same underlying information through a lens suited for specific jobs and purposes.

Three explorers exist today, ranging from a technical deep-dive tool to polished, business-focused market intelligence platforms. All three are open source.

***

### The three explorers

| Explorer             | Audience                                                    | Focus                                                                                         |
| -------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Guardian Indexer     | Developers, registry operators, technical users             | Complete on-chain record — every document, policy, schema, and token, searchable in raw form  |
| Sustainability Atlas | Carbon market participants — buyers, auditors, ESG officers | Business intelligence — projects, credits, methodologies, and reporting through a market lens |
| Carbon Atlas         | Policy-specific users and market analysts                   | Per-methodology deep dives and cross-registry market analytics                                |

***

### Why multiple explorers?

Guardian's data is rich but heterogeneous. A developer debugging a policy workflow needs to inspect raw Verifiable Credentials and topic hierarchies. A carbon credit buyer needs to compare projects by vintage, geography, and SDG alignment. An ESG officer needs to generate a compliance report with traceability references. No single interface serves all of these well.

Each explorer is an independent application with its own data model, interface, and deployment — but all draw from the same Guardian-generated records on Hedera and IPFS.

***

### At a glance

**Carbon Atlas** — A policy-specific explorer focused on verified emission reductions. Provides deep per-methodology views (trust chain, project lifecycle, monitoring reports) alongside a cross-registry market overview spanning projects across major carbon standards.

**Guardian Indexer** — The foundational explorer. Indexes the complete output of every Guardian instance and presents it as a searchable, navigable record. The Indexer is the primary source of truth for technical users who need to inspect the on-chain state of any policy, credential, or account.

**Sustainability Atlas** — A business intelligence platform that translates on-chain data into the language of the carbon market: Projects, Credit Issuances, Retirements, Methodologies, and Organizations. Built for market participants who need to find, analyze, and report on carbon credits without blockchain expertise.

