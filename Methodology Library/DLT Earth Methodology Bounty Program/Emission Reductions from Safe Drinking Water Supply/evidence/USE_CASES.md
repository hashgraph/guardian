# Use Cases — VMR0015 v1.0 Safe Drinking Water dMRV

This document describes who can use this policy, what it produces, and the operational scenarios it supports.

---

## 1. Who Uses It

### 1.1 Project Participant (PP)

A registered project developer that operates safe-drinking-water infrastructure (filtration, UV, membrane, ozone, or hybrid systems) supplying water to households which previously relied on boiling, chemical disinfection, or chlorinated supply.

**Examples**

- A non-profit running 50 community water-purification kiosks across rural districts.
- A municipal utility deploying point-of-entry filtration in low-income housing blocks.
- A private operator selling subscription-based safe water through household-level devices.

The PP creates a Project Description, runs the system, and submits Monitoring Reports each crediting period.

### 1.2 Validation/Verification Body (VVB)

An accredited third party that audits the PP's data. The VVB:
1. Validates the Project Description before crediting begins.
2. Verifies each Monitoring Report against the methodology and the actual on-site evidence.
3. Either approves the report (which triggers the mint) or rejects it back to the PP.

**Examples**

- A Verra-accredited body operating in South Asia (TÜV SÜD South Asia, EPIC Sustainability).
- An ISO 14065 verifier authorised under Verra's VCS programme.

### 1.3 Programme Owner / Standards Body

The Verra-equivalent role inside Guardian. Approves PP and VVB profiles; performs final issuance approval that authorises the on-chain mint.

**Examples**

- Verra (in production)
- A national carbon registry pilot
- A corporate buyer running an internal pilot programme

### 1.4 Token Holder / Buyer

The downstream account that holds CER tokens after issuance. Outside the policy boundary, but the policy's audit trail (HCS topic) is exactly what a buyer needs to validate authenticity before purchase.

**Examples**

- Corporate Scope-3 offset buyers
- Sustainability fund managers
- ESG bond issuers needing verifiable retirement evidence

---

## 2. Sectors and Geography

| Sector | Fit |
|---|---|
| Rural water access | Direct fit — primary VMR0015 target |
| Refugee camps and humanitarian water programmes | Direct fit |
| Urban informal settlements (chlorinated supply with quality issues) | Direct fit |
| Schools and health centres | Fit when paired with household profiles |
| Industrial process water | Out of scope |
| Bottled water distribution | Out of scope per VMR0015 §3 |

| Region | Notes |
|---|---|
| South Asia (India, Bangladesh, Nepal, Sri Lanka) | Primary market; high baseline of woody-biomass boiling |
| Sub-Saharan Africa | Large opportunity, often electric-baseline → leakage conditional matters |
| Southeast Asia (Indonesia, Cambodia, Vietnam) | Mixed baselines — woody + LPG |
| Latin America (Andean and Central American highlands) | Predominantly woody-biomass baselines |

---

## 3. Scenarios Supported

### Scenario A — single project, single reporting period

The minimum lifecycle. PP registers, deploys, files one monitoring report covering the calendar year. VVB verifies. Owner approves. Tokens mint to PP's account.

### Scenario B — multi-year project, quarterly reports

PP submits four monitoring reports per year. Each goes through the same VVB → Owner pipeline. Tokens accumulate across reports. The Project Description schema records the full crediting period; each Monitoring Report covers a sub-period.

### Scenario C — electric-baseline project (no woody biomass)

PP sets `f_woody = 0` in the Baseline Fuel Mix schema. The VMR0015 conditional leakage logic excludes `LE_woody` from `LE_total`. Tokens correctly reflect the smaller leakage adjustment. (See `EMISSIONS_CALCULATION.md` §7.)

### Scenario D — failed water-quality period

PP submits a monitoring report with `wq_pass_rate = 0.91` (below VMR0015's 0.95 floor). VVB rejects the report at `approve_report_btn`. No tokens mint. PP can re-submit with corrected data or accept the partial-period reduction.

### Scenario E — partial period due to outage

PP reports actual operating days < period length. The Operating Performance schema captures `days_in_service` and `days_in_period`. Custom logic prorates baseline and leakage by `days_in_service / days_in_period`. Tokens reflect actual operating days only.

### Scenario F — high-volume issuance

A single Monitoring Report can drive a mint of any size (limited by HTS supply key). Decimals = 2 give 0.01 CER granularity. Largest tested in dry-runs: 50,000 tCO₂e period.

### Scenario G — split retirement

Tokens are minted to PP's account. PP can subsequently retire portions of the supply by sending to a known retirement account or executing HTS wipe (admin key holds wipe). The Guardian policy's role is exhausted at issuance; retirement happens via standard HTS operations and is auditable on Hashscan.

### Scenario H — non-compliant water quality

If the PP attempts to ship a report with `wq_pass_rate < 0.95`, in v1.0.0 the VVB review step rejects the report; v1.1.0 will additionally hard-gate at the customLogicBlock so the mint is refused even if a VVB approval slips through.

---

## 4. Project Sizing Guide

Per-household yield ~0.04–0.08 tCO₂e/HH/yr for woody-mix baselines (Verra VMR0015 §6). The canonical TC1 pilot (200 HH, see [`CANONICAL_TC1.md`](CANONICAL_TC1.md)) yields 10.00 tCO₂e/yr net at a mid-range per-HH rate of 0.05 tCO₂e/HH/yr, minting 1000 base units (10.00 CER) on token `0.0.8865898`.

### Archetypes

| Archetype | Households | Baseline mix | Indicative ER/yr | Notes |
|---|---|---|---|---|
| Rural village kiosk (woody+LPG) | 200 | f_woody=0.60, f_fossil=0.40 | ~10 tCO₂e | TC1 canonical |
| Refugee camp (LPG-dominant) | 1,000 | f_woody=0.10, f_fossil=0.90 | ~30–40 tCO₂e | low woody leakage |
| Peri-urban estate (electric baseline) | 500 | f_woody=0, f_fossil=0 | small / zero | demonstrates LE_woody exclusion |
| School cluster | 50 | f_woody=0.80 | ~3 tCO₂e | small project |
| Failed-WQ scenario | 200 | wq_pass_rate=0.85 | 0 (refused) | documentation gate v1.0.0; math-layer gate v1.1.0 |
| Multi-village programme | 5,000 | f_woody=0.50 | ~250 tCO₂e | aggregated |

Numbers depend on woody fraction, local emission factor, average household water consumption, and fraction of demand served. The policy supports any of these sizes; the only hard cap is HTS supply-key authorisation per transaction (~9 quintillion units, far above any realistic project).

---

## 5. Operational Examples

### Example 1 — Rural Bengal pilot (the canonical TC1 worked example)

- 200 households in West Bengal
- UF + UV system
- f_woody = 0.60, f_fossil = 0.40, wq_pass_rate = 0.98
- ER_total = 10.00 tCO₂e/yr → mint 1000 base units (10.00 CER) on token `0.0.8865898`
- Full input/output table: [`CANONICAL_TC1.md`](CANONICAL_TC1.md)

### Example 2 — Andean village programme

- 500 households across 8 villages
- Slow-sand filtration with chlorination
- 100 % woody-biomass displacement (no fossil baseline)
- ~120 tCO₂e/yr → ~12,000 CER/yr

### Example 3 — refugee camp (electric baseline)

- 5,000 households in a camp with chlorinated grid water that frequently fails quality testing
- Membrane + UV deployed
- `f_woody = 0` → conditional leakage exclusion applies
- ~2,000 tCO₂e/yr → ~200,000 CER/yr

### Example 4 — corporate ESG offtake

- Buyer commits to 50,000 tCO₂e/yr from a portfolio of three project sites
- Guardian policy issues against three Project Descriptions
- Each VVB-verified period mints to the buyer's downstream Hedera account
- Buyer retires tokens via HTS wipe and references the topic timeline in Scope-3 disclosure

---

## 6. Why On-Chain dMRV Matters Here

Safe-drinking-water credits are historically considered low-quality because:
- baselines are easy to inflate;
- leakage is often guessed;
- water quality data is rarely available to the registry.

The on-chain dMRV layer addresses this by:

1. Forcing the PP to commit baseline parameters in a signed VC at project registration. Subsequent baseline modifications create new on-chain VCs with timestamps; the registry can reject revisions.
2. Forcing every monitoring report to carry the actual computed `ER_total`, with the math executed by the policy (not by the PP's spreadsheet).
3. Documenting a 0.95 water-quality threshold enforced by VVB review in v1.0.0; v1.1.0 will move the gate into the customLogicBlock so issuance is refused at the math layer regardless of VVB approval.
4. Issuing a Verifiable Credential at every state transition; the buyer can replay the credential chain end-to-end before purchasing.

This shifts the trust boundary from "trust the PP's numbers" to "trust the methodology code" and the methodology code is open and reviewable.
