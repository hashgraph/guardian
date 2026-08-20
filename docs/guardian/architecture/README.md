---
description: Understand Guardian's services, data flows, integrations, and signing paths.
---

# Architecture

This section explains how Guardian's services, data, and external integrations work together.

* [High Level Architecture](architecture-2.md) introduces the platform's microservices and their relationships.
* [Deep Dive Architecture](reference-architecture.md) shows the component-level design and modular implementation.
* [Policies, Projects and Topics Mapping Architecture](schema-architecture.md) explains Hedera topic structures and policy data migration.
* [External Events](external-events/) covers event-driven integrations through NATS and webhooks.
* [MRV Splitting Logic](mrv-splitting-logic.md) visualizes how MRV data is split.
* The [Vault](internal-with-vault-signing-sequence-diagram.md) and [Fireblocks](fireblocks-signing-sequence-diagram.md) sequence diagrams show the available signing paths.
