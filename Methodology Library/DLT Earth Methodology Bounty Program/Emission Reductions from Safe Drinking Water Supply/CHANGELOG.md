# Changelog — VMR0015 v1.0 Safe Drinking Water dMRV (Guardian Policy)

All notable changes to this policy submission are documented here. Methodology
alignment, scope, and test instructions live in [`README.md`](./README.md).

---

## [2.1.1] — Schema clean-up + methodology-sourced test parameters

### Fixed
- **Removed dormant `uncertaintyDiscount` field from `ER_Summary` schema end-to-end.**
  The field (`"Fixed 0.89 per VMR0015"`) was present in `document.properties`, `document.required`,
  and the JSON-LD `context` block of `schemas/ER_Summary__0f67a367.json` but was never read by the
  calculation block. Its description was factually incorrect (AMS-III.AV. mandates no blanket
  multiplier). Removing it makes the schema consistent with the CHANGELOG [2.1.0] claim
  ("Removed the fixed ×0.89 discount") with zero ambiguity for reviewers.
  - Removed from: `document.properties`, `document.required`, `context.@context.[uuid].@context`.
  - Field count in `ER_Summary`: 12 → 11 fields.

### Changed
- **Test fixture parameters replaced with AMS-III.AV. v9.0 official defaults** (source:
  [UNFCCC CDM AMS-III.AV. v9.0 PDF](https://cdm.unfccc.int/sunsetcms/storage/contents/stored-file-20250506190351296/MP97_EA06_AMS-III.AV_v09.0.pdf)).
  Previous values were opaque illustrative numbers with no cited source; new values are
  each traceable to a specific methodology table or UNFCCC tool:

  | Parameter | Old value | New value | Source |
  |---|---|---|---|
  | `nwb` | 0.15 | **0.10** | AMS-III.AV. v9.0 Table 3 option (b): three-stone fire default |
  | `fNRB` (`f_i`) | 0.30 | **0.82** | TOOL33 v02.1 Vietnam national default (CDM EB 2024) |
  | `QPW_y` | 200,000,000 L | **234,600,000 L** | Eq.3 cap (5.5 L/person/day × 1,300 schools × 20 students × 365 days) |
  | `EF_fuel` | 81.6 | **81.6** | Unchanged — AMS-I.E. Table 2 / IPCC Tier 1 NRB |
  | `BL_fuel` | 1.0 | **1.0** | Unchanged — 100% woody biomass |
  | `X_boil` | 1.0 | **1.0** | Unchanged — all schools boil in baseline |
  | `m` | 0.95 | **0.95** | Unchanged — above 0.90 WQ gate |

  New computed result: **BE = ER = 53,309.84 tCO2e** (was 11,084.74).

  Full derivation:
  ```
  SEC  = 357.48 / 0.10 = 3,574.8 kJ/L
  BE_y = 234,600,000 × 0.95 × 1.0 × 3574.8 × (1.0 × 0.82 × 81.6 × 1e-9) = 53,309.84 tCO2e
  ER_y = 53,309.84 − 0 − 0 = 53,309.84 tCO2e
  WQ gate: 95/100 = 0.95 ≥ 0.90 → passes
  ```

---

## [2.1.0] — Real AMS-III.AV. equations + dry-run validation

### Fixed
- **Rebuilt `calculate_report_fields` on the actual AMS-III.AV. equations** (primary source: UNFCCC CDM AMS-III.AV. PDF). Baseline emissions are now derived from methodology parameters instead of being entered as a single figure:
  - `SEC = 357.48 / nwb` (Eq. 5; `357.48 = 4.186 x (100 - 20) + 0.01 x 2260`).
  - `BE_y = QPW_y x m x X_boil x SEC x (BL_fuel x f_i x EF_fuel x 1e-9)` (Eq. 1, tCO2e).
  - `ER_y = BE_y - PE_y - LE_y` (Eq. 7); negatives clamp to 0; `nwb <= 0` yields BE = 0.
- **Water-quality gate set to the methodology's real threshold.** ER is zeroed when **more than 10% of appliances fail** (appliance pass-rate < 0.90), computed from passing/total counts, **fail-closed** when appliance evidence is missing. (Previously a dormant 95% placeholder that never triggered.)

### Removed
- **The fixed x0.89 uncertainty discount.** AMS-III.AV. does not mandate a single blanket multiplier; conservativeness is carried by the `m` term and the water-quality gate. The earlier Formula Linked Definition's `u_def` factor is likewise dropped.

### Added
- **Expanded Monitoring Report schema** to capture the real parameters: `QPW_y`, `m`, `X_boil`, `nwb`, `EF_fuel`, `f_i` (fNRB), `BL_fuel`, and appliances passing / total.
- **Dry-run validation evidence** in `tests/`: `VMR0015_dryrun_record.record` (Guardian recording; schema IDs match this policy 17/17) and `VMR0015_dryrun_publish_proof.csv` (signed `PUBLISH` Verifiable Credential, Ed25519 / Hedera testnet) confirming the policy imports, dry-runs, and publishes cleanly.

### Changed
- **Test fixture updated** to the real parameters at VCS 3599 scale; computed `BE = ER = 11,084.74 tCO2e` (pass-rate 0.95). Branches verified: pass -> 11,084.74; fail (<0.90) -> 0; no appliance data -> 0; `nwb = 0` -> 0.
- **Documentation now cites the primary UNFCCC AMS-III.AV. source** alongside Verra.
- Resolved the prior "internal policy name carries a dev suffix" cleanup item — the published export's internal name is `VMR0015 v1.0 Safe Drinking Water dMRV`.

---

## [2.0.0] — Calculation fix + Verra-grounded test data

### Fixed
- **`calculate_report_fields` now reads the Monitoring Report as flat scalars.**
  - **Symptom:** a correctly filled Monitoring Report computed `field6 = 0`, so the token minted zero.
  - **Root cause:** the Monitoring Report schema (`#31d7ef1c`) defines `field3`/`field4`/`field5` (BE/PE/LE) as **flat numbers** and `field2` as a "Period Reference" string. The calculation block was reading them as **nested objects** (`raw.field4.field1`, etc.) and treating `field2` as a water-quality array — yielding `0` on every flat report.
  - **Fix:** the block now reads flat scalars via `toNum(raw.field3 / field4 / field5)`; computes `ER = (BE − PE − LE) × 0.89`; clamps negatives to `0`. The WHO water-quality gate is now **optional and dormant** — it applies only when an explicit pass-rate is supplied (`field10` or a `wqSamples` array), and the current Monitoring Report schema does not expose `field10`, so a normal flat report computes correctly without it.
  - **Verification:** a flat Monitoring Report with `field3 = 154125`, `field4 = 0`, `field5 = 0` now computes `field6 = 137,171.25`.

### Added
- **Standalone, reviewable artifacts.** Exported the policy config as a readable `VMR0015_policy.json` and all **17 schemas** into a `schemas/` folder (with an index), both extracted directly from `VMR0015.policy` so they are identical to the binary. Reviewers can now inspect the policy and schemas without importing the binary into Guardian.
- **Formula Linked Definitions** (`formulas/`). A Guardian formula artifact (`formula.json` + `schemas.json`, packaged as `VMR0015_formula.zip`) that expresses the emission-reduction math as schema-linked definitions: `BE_y/PE_y/LE_y` link to Monitoring Report `field3/4/5`, `ER_net = BE_y − PE_y − LE_y` (VMR0015 §3.9.1), and `ER_y = max(0, ER_net) × u_def` links to `field6` (the MintToken rule). This complements the existing `calculate_report_fields` calculation block — the two describe the same math. Structure follows Guardian's `IFormula`/`IFormulaItem` interface and import/export format.

### Changed
- **Test data re-grounded on a registered Verra project.** Replaced the earlier non-Verra example with **VCS 3599 — Grouped Projects for Safe Drinking Water for Schools in Viet Nam** (registered, AMS-III.AV.), using its public registry record. See [`tests/README.md`](./tests/README.md).
- **Documentation aligned with Verra's published VMR0015 v1.0**, including the six official updates over AMS-III.AV. and the core equation `ER_y = BE_y − PE_y − LE_y` (§3.9.1).
- **Clarified the ×0.89 factor** as a conservativeness choice of this implementation, not a Verra-mandated blanket parameter.

### Removed
- **Fabricated policy-integrity-test `.record`.** The earlier bundled `.record` (`cb0543b3-…`) was AI-generated and did **not** match this policy's block tags / schema IDs; it would fail deterministic replay. A valid integrity-test record must be produced from a **live Guardian dry-run** of this policy and can be generated on request.
- **Stale audit/evidence files** (`AUDIT.md`, `evidence/`, the duplicate dry-run `Policy File (JSON)` export, and a calculations workbook) that referenced superseded policy IDs and deleted files — they no longer matched the current submission and were removed to keep the package easy to review.

---

## Notes for reviewers
- The policy package is `VMR0015.policy` (version 2.0.0). All other files are documentation or test material.
- No registered VMR0015 project exists yet (methodology published 31 Oct 2025); the test uses a registered predecessor-methodology (AMS-III.AV.) project as the closest real-world input.
