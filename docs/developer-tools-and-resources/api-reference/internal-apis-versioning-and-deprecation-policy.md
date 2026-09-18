---
description: This policy comes into effect once the specific APIs reach versions 1.0.
---

# Internal APIs Versioning & Deprecation Policy

Guardian ecosystem is expanding, community-developed new applications and Guardian customizations, targeting custom integration use-cases specific for the customisation authors, are frequently introduced. The pace and breadth of innovation in the ecosystem requires coordination to ensure compatibility of different Guardian instances and versions, and maintainability of their codebases. Thus, this policy introduces a set of principles and rules which will ensure the long-term compatibility and co-evolution of mainstream and customised Guardian codebases.&#x20;

## **Internal APIs ‘in-scope’ of this policy:**&#x20;

**Secret Manager** – API to access functions of managing secrets, and methods for storage and retrieval of secret (e.g. signing) keys.&#x20;

**Policy Engine** – APIs for Guardian Policy blocks which enable introduction of new block types (which in turn introduce new Policy workflow functionality):&#x20;

* Auto-registration of new Policy block types in the Policy configurator&#x20;
* Specification of their decorators&#x20;

**DB Engine** – APIs for the application components to access the internal storage system in Guardian which provides ‘local cache’ for the externally published Guardian data and stores temporary Policy flow state information during policy execution. This API enables ‘drop-in’ replacement of the default DB engine with another compatible DB (e.g. AWS-managed Document DB service). &#x20;

**Authorization** – APIs to enforce user roles and permissions configuration for user actions.&#x20;

**Notifications** – APIs to enable user and 3rd party system notifications, enabling the introductions of custom communication channels.&#x20;

**IPFS** – APIs to access (for read/write) decentralized storage via various access providers, to enable the introduction of new storage provides should this be required.&#x20;

## API Versioning&#x20;

Guardian internal APIs are semantic versioning in the major.minor.micro format. Each number incremented sequentially to denote the following changes:&#x20;

* major: the API version contains breaking changes.&#x20;
* minor: the API version contains notable new capabilities and non-breaking changes.&#x20;
* micro: the API release contains non-breaking changes only.&#x20;

Guardian build system does not generate versions automatically, it is the responsibility of the code authors to keep track API versions and correctly reflect their changes in the version number.&#x20;

## Compatibility policy&#x20;

Wherever possible, API data structures, resources, operations, parameters, models, etc are kept backward compatible with earlier versions. A new API element is created if/when it is necessary to make a non-backward compatible change. The old API element is maintained in accordance with the API deprecation policy.&#x20;

## Deprecation policy&#x20;

Deprecation notice is used to inform the API users that a specific API facility is now considered obsolete and thus no longer advised for the use in applications. The notice is issued at least 3 months before the end-of-life date.&#x20;

The notice is issued via the applicable method (depending on the API type) and is marked with the deprecated tag (if appropriate). The notice is also recorded in the Release Notes, in which the end-of-life date for the deprecated API facility is also specified.&#x20;

An API may be changed without prior warnings if the existing behaviour is invalid or to patch a security vulnerability.&#x20;
