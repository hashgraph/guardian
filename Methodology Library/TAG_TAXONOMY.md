# Tag Taxonomy — Guardian Methodology Library

This document provides guidance for choosing `tags` values in `policy.yml` manifests. Tags drive search and filtering in the catalog UI and any tooling built on top of the manifest index.

---

## Naming convention

Tags must be **lowercase and hyphenated** — no spaces, no uppercase, no underscores, no dots.

```
# Good
forest, redd-plus, dynamic-baseline, latin-america

# Bad
Forest, REDD+, dynamic_baseline, Latin America
```

Tags are validated against the `pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$"` regex in `policy.schema.json`. Any tag that does not match this pattern will fail schema validation and block CI.

---

## CI behaviour

- **Unrecognized tags** (i.e., tags not listed in this document) trigger a **warning** in CI but do **not** fail the build.
- Schema-invalid tags (wrong format) **do** fail CI.
- The intent is to keep the taxonomy open and evolving without blocking contributors. Warnings surface in the PR check output so reviewers can decide whether a new tag should be canonicalized.

---

## Proposing a new canonical tag

1. Open a PR adding your tag to the relevant section of this file with a one-line description.
2. Link the PR to the policy that first uses the tag.
3. Maintainers will merge if the tag is broadly useful (likely to appear in 3+ policies), not redundant with an existing tag, and follows the naming convention.

You do not need to wait for approval to use a tag — use it in your `policy.yml` and let CI warn. Canonicalization is a catalog quality concern, not a contribution blocker.

---

## Canonical tag categories

### Standard bodies

Tags that identify the issuing standards organization. Use the organization's commonly recognized short name.

| Tag | Description |
|-----|-------------|
| `verra` | Verra (Verified Carbon Standard / VCS program) |
| `gold-standard` | Gold Standard Foundation |
| `cdm` | UNFCCC Clean Development Mechanism |
| `unfccc` | United Nations Framework Convention on Climate Change (non-CDM) |
| `gcc` | Global Carbon Council |
| `climate-action-reserve` | Climate Action Reserve (CAR) |
| `iso-14064` | ISO 14064 series (GHG quantification and reporting) |
| `gs` | Alias for `gold-standard` — prefer the full form |
| `ieta` | International Emissions Trading Association |
| `car` | Alias for `climate-action-reserve` — prefer the full form |
| `irec` | International Renewable Energy Certificate standard |

---

### Thematic / project activity

Tags describing what the project activity does or the environmental asset type.

| Tag | Description |
|-----|-------------|
| `forest` | Forest-based projects generally |
| `redd-plus` | REDD+ (Reducing Emissions from Deforestation and Forest Degradation) |
| `cookstoves` | Clean cooking / improved cookstove projects |
| `agriculture` | Agricultural activities (crop, livestock, soil) |
| `landfill` | Landfill gas capture and destruction |
| `renewable-energy` | Renewable electricity generation |
| `water` | Safe drinking water, water treatment |
| `transport` | Transport-sector emission reductions |
| `plastic` | Plastic waste recovery and recycling |
| `mangrove` | Mangrove conservation and restoration |
| `rice` | Methane reduction from rice cultivation |
| `biochar` | Biochar production and soil application |
| `soil-carbon` | Soil carbon sequestration (broader than biochar) |
| `clean-energy` | Clean energy access (broader than renewable-energy) |
| `e-waste` | Electronic waste recovery and recycling |
| `end-of-life-vehicles` | End-of-life vehicle recycling |
| `biodiversity` | Biodiversity co-benefits or primary focus |
| `blue-carbon` | Ocean/coastal carbon (mangrove, seagrass, salt marsh) |
| `agroforestry` | Combined agriculture and forestry activities |
| `living-income` | Farmer living-income price frameworks |
| `fair-trade` | Fair-trade aligned supply-chain policies |
| `social-impact` | Primary focus on social outcomes |
| `farmer-payments` | Direct farmer payment mechanisms |

---

### Technical / methodological approach

Tags describing the MRV approach, technical mechanisms, or Guardian-specific patterns.

| Tag | Description |
|-----|-------------|
| `dynamic-baseline` | Uses a dynamic (rather than fixed) baseline calculation |
| `additionality` | Explicit additionality test or tool embedded in the workflow |
| `mrv` | General MRV / monitoring-reporting-verification emphasis |
| `monitoring` | Continuous or device-level monitoring (use alongside mrv) |
| `nfc` | Near-field communication data capture |
| `deforestation` | Deforestation avoidance or detection |
| `afforestation` | Planting trees on previously non-forested land |
| `reforestation` | Replanting trees after deforestation |
| `revegetation` | Vegetation restoration (broader category) |
| `suppressed-demand` | Suppressed demand baseline methodology |
| `geospatial` | Polygon / GIS / satellite-data driven workflows |
| `metered-monitoring` | Device-level metered data collection |
| `paris-aligned` | Explicit alignment with Paris Agreement accounting |
| `ndc-aligned` | Aligned with national Nationally Determined Contributions |
| `mrv-template` | Reusable MRV scaffolding (policy_type: mrv-template) |

---

### Geographic

Tags identifying the primary geographic focus. Use the broadest applicable tag; add a more specific one if relevant.

| Tag | Description |
|-----|-------------|
| `global` | No specific geographic restriction |
| `africa` | Sub-Saharan Africa or African continent broadly |
| `east-africa` | East Africa specifically |
| `west-africa` | West Africa specifically |
| `asia` | Asia broadly |
| `south-asia` | South Asia (India, Pakistan, Bangladesh, etc.) |
| `southeast-asia` | Southeast Asia |
| `latin-america` | Latin America and the Caribbean |
| `europe` | European Union and/or broader Europe |
| `north-america` | United States, Canada, Mexico |
| `oceania` | Australia, New Zealand, Pacific Islands |

---

### Programme / origin

Tags describing how the policy entered the library or the initiative it belongs to.

| Tag | Description |
|-----|-------------|
| `hackathon` | Created as part of a Guardian hackathon |
| `bounty` | Created as part of a Guardian methodology bounty program |
| `template` | Intended as a reusable starting-point template |
| `community` | Community-contributed (not backed by a standards org) |
| `dovu` | Contributed by or in partnership with DOVU |
| `tymlez` | Contributed by or in partnership with Tymlez |
| `atec` | Contributed by or in partnership with ATEC |
| `envision` | Contributed by or in partnership with Envision Blockchain |
| `supply-chain` | Alias for use as a thematic marker in supply-chain policies |

---

### Output type / token

Tags describing what the policy mints or certifies.

| Tag | Description |
|-----|-------------|
| `carbon-credit` | Generic carbon credit output |
| `cer` | Certified Emission Reduction (CDM) |
| `vcu` | Verified Carbon Unit (Verra VCS) |
| `ver` | Verified Emission Reduction (Gold Standard) |
| `nft` | NFT output (use `HIP-412-NFT` in token_standard — this tag adds searchability) |
| `token` | General token output |
| `certificate` | Non-token certificate or credential issuance |
| `eudr` | EU Deforestation Regulation compliance output |

---

## Examples

A few sample tag lists to illustrate good practice:

```yaml
# Verra REDD+ — forest, standard-aligned
tags:
  - verra
  - redd-plus
  - forest
  - deforestation
  - dynamic-baseline
  - land-use

# Gold Standard cookstoves — geographic + thematic
tags:
  - gold-standard
  - cookstoves
  - clean-energy
  - africa
  - metered-monitoring
  - paris-aligned

# Community MRV template — origin + activity
tags:
  - dovu
  - agriculture
  - soil-carbon
  - mrv-template
  - template

# EUDR supply chain — regulation-driven
tags:
  - eudr
  - deforestation
  - supply-chain
  - geospatial
  - forest
  - europe
```

---

## Version history

| Date | Change |
|------|--------|
| 2026-06-11 | Initial taxonomy established |
