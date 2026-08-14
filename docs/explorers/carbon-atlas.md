---
description: >-
  A public dashboard for verified emission reductions, with per-methodology
  policy views and cross-registry market analytics.
---

# Carbon Atlas

Public dashboard for exploring verified emission reductions across Guardian policies. Built on Hedera Guardian, an open-source MRV platform using Hedera Hashgraph DLT.

**Live:** [https://atlas.carbonmarketshq.com](https://atlas.carbonmarketshq.com/)

***

### Who it's for

* Project developers and VVBs — track issuances, monitoring reports, and verification status for specific methodologies
* Carbon credit buyers — browse and compare projects and credits across registries
* Sustainability researchers — explore credit issuance and retirement trends across the voluntary carbon market
* Policy auditors — trace any issuance back through its full verification chain

***

### Policy Explorer

Per-methodology views of Guardian data, with a dedicated dashboard for each supported methodology. Currently supports **Gold Standard MECD 431** and **Verra VM0033**.

* Config-driven architecture — adding a new methodology requires creating two files
* Trust Chain Explorer — trace any issuance back to its project origin through the full Verifiable Credential chain
* Project Lifecycle Timeline — visual progress through PDD → Validation → Monitoring → Verification → Crediting
* Dedicated views for monitoring reports, verification reports, device MRV data, and VVB registrations
* VM0033 PDD Viewer — tabbed view with project boundary tables, 40-year VCU projections, and GeoJSON map
* Device Data Table — browse metered cooking device records with search, sort, and pagination
* Hedera Proof Links — every document links to its on-chain Hedera Consensus Service message
* Switch between mainnet and testnet per methodology

### Market Explorer

Cross-registry analytics across the voluntary carbon market.

* 10,570+ projects across Verra, Gold Standard, ACR, CAR, and ART TREES
* 3,700+ project developer entities with portfolio views and cross-registry aggregation
* CORSIA eligibility derived from raw registry data
* Interactive world map showing global project distribution by country
* Credit analytics: issuances and retirements over time, vintage analysis, category breakdown
* Deep project detail: SDG goals, crediting periods, CCB certifications, credit transactions

***

### Source code

https://github.com/hashgraph/guardian/tree/main/carbon-atlas

The `carbon-atlas/` folder contains setup instructions, architecture documentation, and a developer guide for adding new policies.

***

### Contributor

Built by [CarbonMarketsHQ](https://www.carbonmarketshq.com).
