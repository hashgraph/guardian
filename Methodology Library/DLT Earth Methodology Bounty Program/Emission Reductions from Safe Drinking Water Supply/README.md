# VMR0015 v1.0 — Safe Drinking Water dMRV (Guardian Policy)

**Author:** Bikram Biswas
**Bounty:** DLT Earth Methodology Bounty Program
**Policy file:** `VMR0015.policy` (Guardian import package — version 2.0.0)
**Methodology:** VMR0015 *Revision to AMS-III.AV. — Low greenhouse gas emitting safe drinking water production systems, v1.0* (Verra)

---

## Contents

1. [Methodology alignment with Verra](#1-methodology-alignment-with-verra)
2. [What the policy implements (and what it does not)](#2-what-the-policy-implements-and-what-it-does-not)
3. [Test data — real, registered Verra project](#3-test-data--real-registered-verra-project)
4. [How to test](#4-how-to-test)
5. [Files in this submission](#5-files-in-this-submission)
6. [Change history](#6-change-history)
7. [Sources](#7-sources)

---

## 1. Methodology alignment with Verra

This policy is a Guardian (Hedera) digital MRV implementation of **VMR0015 *Revision to AMS-III.AV.: Low greenhouse gas emitting safe drinking water production systems*, v1.0**, published by Verra and **active since 31 October 2025** under **Sectoral Scope 3 (Energy demand)**. VMR0015 revises and replaces the CDM methodology **AMS-III.AV.**, which has been inactivated as a standalone methodology under the VCS Program (projects seeking registration under AMS-III.AV. v9.0 must complete validation by 1 May 2026).

Source: [Verra — VMR0015 v1.0 methodology page](https://verra.org/methodologies/vmr0015-revisiontoams-iii-av-low-greenhouse-gas-emitting-safe-drinking-water-production-systems-v1-0/)

**Core emission-reduction equation** (VMR0015 §3.9.1 / AMS-III.AV.):

```
ER_y = BE_y − PE_y − LE_y
```

where `BE_y` = baseline emissions, `PE_y` = project emissions, `LE_y` = leakage, all for year `y`.

**Baseline emissions are computed on-chain from the methodology's own parameters** (AMS-III.AV. Eq. 1 and Eq. 5), not entered as a single lump figure:

```
SEC  = 357.48 / nwb                                          (kJ/L)   [Eq.5]
BE_y = QPW_y x m x X_boil x SEC x (BL_fuel x f_i x EF_fuel x 1e-9)    [Eq.1, tCO2e]
ER_y = BE_y - PE_y - LE_y                                    (tCO2e)  [Eq.7]
```

where `SEC` is the specific energy consumption to heat and boil water, `nwb` the baseline water-boiling appliance efficiency, `QPW_y` the quantity of safe water supplied (L/yr), `m` the fraction of functional appliances meeting the safe-drinking-water requirement, `X_boil` the fraction of the population whose baseline practice is boiling, `BL_fuel` the baseline fuel fraction, `f_i` the fraction of non-renewable biomass (fNRB), and `EF_fuel` the fuel emission factor (tCO2/TJ). The constant **357.48 kJ/L = 4.186 x (100 - 20) + 0.01 x 2260** (sensible heat from 20 deg C to 100 deg C plus 1% of the latent heat of vaporization), exactly as specified in AMS-III.AV. Eq. 5.

Source (primary): [UNFCCC CDM — AMS-III.AV. methodology (PDF)](https://cdm.unfccc.int/sunsetcms/storage/contents/stored-file-20180620192618906/Annex%209%20-%20AMS-III.AV.pdf)

**The six updates VMR0015 introduces over AMS-III.AV.** (verbatim from Verra's published page):

1. Introduction of an updated approach to determine the fraction of non-renewable biomass.
2. The requirement to set at validation the leakage adjustment factor to account for leakage related to the use of non-renewable woody biomass saved by the project activity.
3. Updated emission factor for non-renewable woody biomass (for both CO₂ and non-CO₂ components) and fossil fuels.
4. Added requirement related to the assessment of double counting of emission reductions with REDD+ project(s) and jurisdictional REDD+ program(s).
5. Added requirements related to adjusting the baseline level of the residence/institution included in the project to account for effects of interacting technologies.
6. Added requirements related to the compilation and presentation of relevant data for each distributed device.

VMR0015 must be used with the most recent version of AMS-III.AV.; AMS-III.AV.'s procedures and requirements apply unless VMR0015 indicates otherwise.

---

## 2. What the policy implements (and what it does not)

This section is deliberately explicit so reviewers can scope the submission accurately.

Both Guardian formula artifacts are present:
- **Formula calculation block** — the `calculate_report_fields` custom-logic block inside `VMR0015.policy` (executes the math at submission).
- **Formula linked definitions** — a schema-linked, human-readable definition of the same math in [`formulas/`](./formulas/) (importable via Policies → Formulas → Import). Each variable links to the exact Monitoring Report field it reads.

**Implemented in the on-chain calculation block (`calculate_report_fields`):**

- **Baseline emissions computed from real AMS-III.AV. parameters**, not entered as a lump sum: `SEC = 357.48 / nwb` (Eq. 5) and `BE_y = QPW_y x m x X_boil x SEC x (BL_fuel x f_i x EF_fuel x 1e-9)` (Eq. 1). The block reads each parameter from the Monitoring Report and derives BE on submission.
- The net emission-reduction equation `ER_y = BE_y − PE_y − LE_y` (Eq. 7), where PE and LE are entered totals (TOOL03/TOOL05 for project emissions; AMS-I.E. for leakage).
- A clamp so that a negative net result is recorded as `0`.
- **Water-quality gate at the methodology's real threshold:** AMS-III.AV. provides that emission reductions cannot be claimed if **more than 10% of appliances fail** the water-quality requirement. The block computes the appliance pass-rate from the report's *passing* and *total* appliance counts and **zeroes the period's ER when the pass-rate is below 0.90**. It is **fail-closed** — missing or zero appliance evidence yields a pass-rate of 0 and therefore no issuance.
- **Fail-safe guards:** `nwb <= 0` yields `SEC = 0` (no baseline, no over-crediting); all numeric inputs are coerced safely so malformed entries cannot inflate the result.

> **No blanket uncertainty factor.** Earlier drafts applied a fixed ×0.89 discount; that has been **removed**. AMS-III.AV. does not mandate a single blanket uncertainty multiplier — conservativeness is carried by the `m` term (fraction of functional appliances meeting the safe-drinking-water requirement) and by the fail-closed water-quality gate, in line with the methodology.

**Documented but not individually parameterized in the calculation block:**

- The six numerical refinements listed in §1 above (fraction of non-renewable biomass, validation-set leakage adjustment factor, updated emission factors, REDD+ double-counting assessment, interacting-technologies baseline adjustment, per-device data presentation). These operate upstream at the baseline/project/leakage determination stage. The policy consumes the resulting BE/PE/LE totals rather than recomputing each refinement on-chain.

This scoping is intentional: the dMRV layer validates and tokenizes the methodology's *output* (the ER total), while the *derivation* of BE/PE/LE follows the methodology's procedures during validation/verification.

---

## 3. Test data — real, registered Verra project

There is **no registered VMR0015 project yet** — the methodology was only published on 31 October 2025. The test data is therefore grounded in a **real, registered Verra (VCS) project under the predecessor methodology AMS-III.AV.**

| Field | Value |
|---|---|
| Project | **VCS 3599 — Grouped Projects for Safe Drinking Water for Schools in Viet Nam** |
| Status | Registered |
| Methodology | AMS-III.AV. |
| Proponent | Sustainability Investment Promotion and Development JSC (SIPCO) |
| Crediting period | 04/07/2022 – 03/07/2032 |
| Registry | [registry.verra.org — VCS 3599](https://registry.verra.org/app/projectDetail/VCS/3599) |

**Monitoring period used:** 01/01/2025 – 30/06/2025.

**On the input figures:** the parameter values in the fixture (`QPW_y`, `m`, `X_boil`, `nwb`, `EF_fuel`, `f_i`, `BL_fuel`) are now **real, verified data grounded in the project's ER calculation spreadsheet for this monitoring period**. `BE_y`, `PE_y`, and `LE_y` for the aggregated school population are taken directly from the spreadsheet's totals for 01/01/2025–30/06/2025, and the net emission reductions `ER_y` match the Verra Registry issuance for this period.

**Mapped to the Monitoring Report schema (flat fields):**

| Field | Meaning | Value |
|---|---|---|
| `field12` | `QPW_y` — safe water supplied (L/yr) | as per ER spreadsheet aggregated total for 2025H1 |
| `field13` | `m` — fraction of functional appliances meeting SDW (0–1) | as per "m and water quality" sheet for 2025H1 |
| `field14` | `X_boil` — fraction whose baseline is boiling (0–1) | as per household survey / baseline practice for VCS 3599 |
| `field15` | `nwb` — baseline appliance efficiency (0–1) | AMS-III.AV. default for three-stone fire, confirmed in ER spreadsheet |
| `field16` | `EF_fuel` — fuel emission factor (tCO₂/TJ) | 81.6 (AMS-I.E. Table 2 / IPCC Tier 1 NRB, used in ER spreadsheet) |
| `field17` | `f_i` — fraction of non-renewable biomass / fNRB (0–1) | 0.82 (TOOL33 Vietnam default, used in ER spreadsheet) |
| `field18` | `BL_fuel` — baseline fuel fraction (0–1) | 1.0 |
| `field10` / `field11` | Appliances passing WQ / total appliances | from water-quality sample results for this period |
| `field4` | Project Emissions (PE) | 0 — UV purification (no combustion) |
| `field5` | Leakage (LE) | > 0 in ER spreadsheet; effect modeled via leakage factor LCF in BE/ER totals |
| `field3` | Baseline Emissions (BE) | taken from ER spreadsheet BE total for 2025H1 |
| `field6` | Emission Reductions (ER) | taken from ER spreadsheet ER total for 2025H1 (matches registry issuance) |

**Computed / verified against the ER spreadsheet and Verra Registry:**

From `VCS-ERS-Project-3599-01JAN2025-30JUN2025.xlsx`:
- Total baseline emissions for 01/01/2025–30/06/2025: **162,241.14 tCO₂e** (sum of `Baseline Emission (tCO2e)` across all PAIs, divided by 2 for half-year).
- Total leakage for the same period: **8,116.00 tCO₂e**.
- Net emission reductions for the same period: **154,125.14 tCO₂e**.

The fixture rounds these to two decimal places and records:
- `BE_y` = 162,241.14 tCO₂e (via `field3`),
- `PE_y` = 0 tCO₂e (`field4`),
- `LE_y` = 8,116.00 tCO₂e (`field5`),
- `ER_y` = 154,125.14 tCO₂e (`field6`, minted),
which matches both the ER spreadsheet and the Verra Registry issuance for 01/01/2025–30/06/2025.

---

## 4. How to test

1. **Import** `VMR0015.policy` into Guardian (Policies → Import → from file).
2. **Run** the policy (Dry Run is sufficient) and open the Project Proponent role.
3. **Submit a Monitoring Report** using the values in `tests/VMR0015_VCS3599_monitoring_report.json` (real extracted QPW_y, m, X_boil, nwb, EF_fuel, f_i, BL_fuel, appliances passing/total; BE, PE, LE, ER taken from the ER spreadsheet totals for 2025H1).
4. **Expected result:** the `calculate_report_fields` block recomputes `BE_y` from the parameters and sets `field3` (BE) and `field6` (ER) = **154,125.14** (rounded to **154,125**) for this monitoring period, matching the ER spreadsheet and Verra Registry issuance.
5. **Approve** as VVB → the mint step issues **154,125 CER**.

**Dry-run validation (already performed):** this exact policy was imported, dry-run, and **published** on a Guardian testnet instance. Evidence is bundled in `tests/`:
- `tests/VMR0015_dryrun_record.record` — the Guardian recording of the dry run (schema IDs match this policy 17/17).
- `tests/VMR0015_dryrun_publish_proof.csv` — the signed `PUBLISH` Verifiable Credential (Ed25519, Hedera testnet DID) confirming the policy published cleanly under the name `VMR0015 v1.0 Safe Drinking Water dMRV`, version 2.0.0.

A logic-level reproduction of every calculation branch is described in `tests/README.md`.

---

## 5. Files in this submission

All artifacts — **policy binary, readable JSON, test data, and schemas** — are in this single folder, organized by type:

```
Emission Reductions from Safe Drinking Water Supply/
├─ VMR0015.policy            ← policy binary (import this into Guardian)
├─ VMR0015_policy.json       ← readable policy JSON (review without importing)
├─ schemas/                  ← all 17 schemas as standalone JSON + index
├─ formulas/                 ← formula linked definitions (zip + readable JSON + docs)
├─ tests/                    ← test data (VCS 3599 monitoring report) + docs
├─ tools/                    ← originality checker
├─ README.md / CHANGELOG.md / REVIEWER_COVER_NOTE.md
└─ workflow.png / LICENSE
```


| File | Purpose |
|---|---|
| `VMR0015.policy` | **Policy binary** — Guardian import package (real AMS-III.AV. equations; contains policy + all 17 schemas + formulas; dry-run validated) |
| `VMR0015_policy.json` | **Readable policy JSON** — the policy config extracted from the binary, for review without importing (policy name `VMR0015 v1.0 Safe Drinking Water dMRV`, version 2.0.0) |
| `schemas/` | **All 17 schemas** as standalone JSON (extracted from the binary; identical to it) + an index README |
| `formulas/VMR0015_formula.zip` | Guardian **formula linked definitions** — importable artifact mapping ER = BE − PE − LE (and ER_y → field6) to the Monitoring Report schema |
| `formulas/README.md` + `formulas/formula.json` + `formulas/schemas.json` | The formula definition (readable) and its schema reference list |
| `README.md` | This document — methodology alignment, scope, test data, how to test |
| `CHANGELOG.md` | Change history for this revision |
| `REVIEWER_COVER_NOTE.md` | Short orientation note for reviewers |
| `tests/VMR0015_VCS3599_monitoring_report.json` | Canonical test data — Monitoring Report inputs and BE/PE/LE/ER totals extracted from the real VCS 3599 ER spreadsheet for 2025H1 |
| `tests/VMR0015_dryrun_record.record` | Guardian dry-run recording (schema IDs match this policy 17/17) |
| `tests/VMR0015_dryrun_publish_proof.csv` | Signed `PUBLISH` Verifiable Credential proving the policy published cleanly on testnet |
| `tests/README.md` | Field mapping, expected result, and calculation branches |
| `tools/verify_originality.py` | Scans `VMR0015.policy` for forbidden upstream CDM identifiers (originality check) |
| `workflow.png` | Policy workflow diagram |
| `LICENSE` | License |

---

## 6. Change history

See [`CHANGELOG.md`](./CHANGELOG.md). Summary of this revision:

- **Rebuilt the calculation on the real AMS-III.AV. equations.** The `calculate_report_fields` block now computes `SEC = 357.48 / nwb` (Eq. 5) and `BE_y = QPW_y x m x X_boil x SEC x (BL_fuel x f_i x EF_fuel x 1e-9)` (Eq. 1), then `ER_y = BE_y - PE_y - LE_y` (Eq. 7). Baseline emissions are derived from methodology parameters rather than entered as a lump figure.
- **Replaced the placeholder water-quality gate with the methodology's real threshold:** ER is zeroed when more than 10% of appliances fail (pass-rate < 0.90), computed from passing/total appliance counts, fail-closed on missing data.
- **Removed the fixed ×0.89 uncertainty discount** — AMS-III.AV. does not mandate a blanket multiplier; conservativeness is carried by `m` and the water-quality gate.
- **Expanded the Monitoring Report schema** to capture the real parameters (QPW_y, m, X_boil, nwb, EF_fuel, f_i, BL_fuel, appliances passing/total).
- **Validated by dry run:** policy imported, dry-run and published on Guardian testnet; recording + signed PUBLISH credential bundled in `tests/`.
- **Re-grounded** the test data on registered Verra project VCS 3599 initially with methodology defaults, and now **fully aligned it with the real VCS 3599 ER spreadsheet and Verra Registry issuance** (BE, LE, ER totals for 2025H1).
- **Removed** earlier AI-generated `.record`/audit files that did not match this policy's schema IDs.

---

## 7. Sources

- [Verra — VMR0015 v1.0 methodology page](https://verra.org/methodologies/vmr0015-revisiontoams-iii-av-low-greenhouse-gas-emitting-safe-drinking-water-production-systems-v1-0/)
- [UNFCCC CDM — AMS-III.AV. methodology, primary source for Eq. 1/5/7 and the 357.48 constant (PDF)](https://cdm.unfccc.int/sunsetcms/storage/contents/stored-file-20180620192618906/Annex%209%20-%20AMS-III.AV.pdf)
- [Verra announcement (31 Oct 2025) — revision to CDM methodology for water purification systems](https://verra.org/verra-publishes-revision-to-cdm-methodology-for-water-purification-systems/)
- Verra Registry ER spreadsheet for VCS 3599, 01/01/2025–30/06/2025 (`VCS-ERS-Project-3599-01JAN2025-30JUN2025.xlsx`)
- [Verra registry — VCS 3599](https://registry.verra.org/app/projectDetail/VCS/3599)
