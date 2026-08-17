---
description: >-
  An introduction to Guardian's explorer tools and how each serves a different
  audience.
tags:
  - concept
---

# Explorers Overview

Guardian produces data as activity flows through the platform. This includes primatives such as projects, credits, policies, methodologies, organizations, and verification documents.&#x20;

**Explorers** are dedicated applications that surface data published to the [Hedera Network](https://hedera.com/) for different audiences, each presenting the same underlying information through a lens suited for specific jobs and purposes.

Three explorers exist today, ranging from a technical developer tool to polished, business-focused market intelligence platforms. All three are open source and hosted in the Guardian repository.

***

### The three explorers

<table><thead><tr><th width="221.25390625">Explorer</th><th>Audience</th><th>Focus</th></tr></thead><tbody><tr><td>Sustainability Atlas</td><td>Carbon market participants e.g. buyers, auditors, ESG officers</td><td>Business intelligence e.g. projects, credits, methodologies, and reporting through a market lens</td></tr><tr><td>Guardian Indexer</td><td>Developers, registry operators, technical users</td><td>Complete on-chain record e.g. every document, policy, schema, and token, searchable in raw form</td></tr><tr><td>Carbon Atlas</td><td>Policy-specific users and market analysts</td><td>Per-methodology deep dives and cross-registry market analytics</td></tr></tbody></table>

***

### Why multiple explorers?

Guardian's data is rich and context specific. A developer debugging a policy workflow can inspect raw Verifiable Credentials and topic hierarchies. A carbon credit buyer can compare projects by vintage, geography, and SDG alignment. An asset manager or compliance officer can generate a  reports with traceability references.&#x20;

Each explorer is an independent application with its own data model, interface, and deployment which all draw from the same Guardian-generated data on Hedera and IPFS.

***

### At a glance

**Sustainability Atlas** — A business intelligence platform that translates on-chain data into the language of the carbon market: Projects, Credit Issuances, Retirements, Methodologies, and Organizations. Built for market participants who need to find, analyze, and report on carbon credits without blockchain expertise.

**Guardian Indexer** — The foundational explorer. Indexes the complete output of every Guardian instance and presents it as a searchable, navigable record. The Indexer is the primary source of truth for technical users who need to inspect the on-chain state of any policy, credential, or account.

**Carbon Atlas** — A policy-specific explorer focused on verified emission reductions. Provides deep per-methodology views (trust chain, project lifecycle, monitoring reports) alongside a cross-registry market overview spanning projects across major carbon standards.





