# Guardian Indexer

A comprehensive search and exploration tool for all data recorded through Guardian — every policy, credential, account, schema, token, and on-chain document, searchable in a single interface.

***

### Who it's for

* Developers — inspect policy structures, schemas, and credential documents during development
* Registry operators — monitor activity across a Standard Registry and all associated policies
* Technical auditors — trace relationships between documents and verify credential chains
* VVBs — locate and review policy records, verification documents, and token activity
* Researchers — query across the full history of Guardian's on-chain output

***

### Features

* Global search across the entire dataset: policy IDs, schema names, VC content, schema properties, and more
* Per-section keyword search with AND logic across Accounts, Methodologies, Documents, and Others
* Standard Registry detail pages with full activity summaries linking through to all associated records
* Policy detail pages covering activity, schemas, tokens, and roles
* Schema pages with a field tree diagram and list of all credentials issued against each schema
* VC and VP detail pages with document content, full history, and a relationship map
* NFT transaction history and topic content listings
* Policy comparison view — inspect structural differences between two policy versions
* Priority loading queue — push any document, topic, or policy ahead of the standard sync schedule

***

### Source code

The Indexer spans several folders in the Guardian monorepo: https://github.com/hashgraph/guardian

Relevant directories: `indexer-frontend/`, `indexer-service/`, `indexer-api-gateway/`, `indexer-common/`, `indexer-interfaces/`, `indexer-worker-service/`, `indexer-web-proxy/`. The `docker-compose-indexer.yml` file in the repository root is the starting point for running the stack locally.
