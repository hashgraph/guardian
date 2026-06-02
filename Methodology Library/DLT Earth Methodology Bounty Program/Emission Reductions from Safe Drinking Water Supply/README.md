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

**The six updates VMR0015 introduces over AMS-III.AV.** (verbatim from Verra's published page):

1. Introduction of an updated approach to determine the fraction of non-renewable biomass.
2. Requirement to set, at validation, the leakage adjustment factor for leakage related to the use of non-renewable woody biomass saved by the project activity.
3. Updated emission factor for non-renewable woody biomass (both CO₂ and non-CO₂ components) and fossil fuels.
4. Added requirement on assessment of double counting of emission reductions with REDD+ project(s) and jurisdictional REDD+ program(s).
5. Added requirements on adjusting the baseline level of the residence/institution to account for the effects of interacting technologies.
6. Added requirements on the compilation and presentation of relevant data for each distributed device.

VMR0015 must be used with the most recent version of AMS-III.AV.; AMS-III.AV.'s procedures and requirements apply unless VMR0015 indicates otherwise.

---

## 2. What the policy implements (and what it does not)

This section is deliberately explicit so reviewers can scope the submission accurately.

Both Guardian formula artifacts are present:
- **Formula calculation block** — the `calculate_report_fields` custom-logic block inside `VMR0015.policy` (executes the math at submission).
- **Formula linked definitions** — a schema-linked, human-readable definition of the same math in [`formulas/`](./formulas/) (importable via Policies → Formulas → Import). Each variable links to the exact Monitoring Report field it reads.

**Implemented in the on-chain calculation block (`calculate_report_fields`):**

- The core net emission-reduction equation `ER_y = BE_y − PE_y − LE_y`, computed from the Monitoring Report's flat numeric fields.
- A clamp so that a negative net result is recorded as `0`.
- An **optional, currently dormant** WHO water-quality gate: the block checks for an explicit pass-rate (`field10`, or a `wqSamples` array) and, if one is present and below 95%, zeroes the period's ER. The current Monitoring Report schema (`#31d7ef1c`) does **not** expose `field10`, so on a standard report the gate never triggers — it is wiring kept ready for a future schema that captures water-quality sampling. A normal report is unaffected.
- A fixed **uncertainty discount of ×0.89** applied to the net ER before minting (see note below).

> **Note on the ×0.89 factor.** The ×0.89 discount is a **conservativeness choice made in this policy implementation** to keep issued volumes below the unadjusted estimate. It is **not** a single blanket parameter mandated by VMR0015. VMR0015's uncertainty and adjustment treatment is parameter- and context-specific (see §5 of the methodology). The factor is surfaced here so reviewers can adjust or remove it to match Verra's prescribed treatment if required.

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

**On the emission figure:** the value used for baseline emissions in the fixture, **154,125 tCO₂e**, reflects the project's reported scale for the period. It is an **illustrative input drawn from the project's public registry record; it has not been independently re-derived here from the underlying issuance/monitoring PDF.** Reviewers with registry access can substitute the exact verified figure from the project's Monitoring/Verification Report if a precise reconciliation is required.

**Mapped to the Monitoring Report schema** (`#31d7ef1c`, flat):

| Field | Meaning | Value |
|---|---|---|
| `field3` | Baseline Emissions (BE) | 154125 |
| `field4` | Project Emissions (PE) | 0 — passive purification, no project combustion |
| `field5` | Leakage (LE) | 0 |
| `field6` | Emission Reductions (ER) | `0` on import — **computed by the policy** |

**Computed on submission:**

```
field6 = (field3 − field4 − field5) × 0.89 = (154125 − 0 − 0) × 0.89 = 137,171.25 tCO₂e
```

This is the value the policy mints (token CER, 2 decimals → 13,717,125 base units).

---

## 4. How to test

1. **Import** `VMR0015.policy` into Guardian (Policies → Import → from file).
2. **Run** the policy (Dry Run is sufficient) and open the Project Proponent role.
3. **Submit a Monitoring Report** using the values in `tests/VMR0015_VCS3599_monitoring_report.json` (field3 = 154125, field4 = 0, field5 = 0, field6 = 0).
4. **Expected result:** the `calculate_report_fields` block sets `field6 = 137,171.25`.
5. **Approve** as VVB → the mint step issues **137,171.25 CER** (13,717,125 base units).

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
| `VMR0015.policy` | **Policy binary** — Guardian import package (calc fix applied; contains policy + all schemas + formulas; no fabricated record bundled) |
| `VMR0015_policy.json` | **Readable policy JSON** — the policy config extracted from the binary, for review without importing (policy name normalized to `VMR0015 v1.0 Safe Drinking Water dMRV`; see note below) |
| `schemas/` | **All 17 schemas** as standalone JSON (extracted from the binary; identical to it) + an index README |
| `formulas/VMR0015_formula.zip` | Guardian **formula linked definitions** — importable artifact mapping ER = BE − PE − LE (and ER_y → field6) to the Monitoring Report schema |
| `formulas/README.md` + `formulas/formula.json` + `formulas/schemas.json` | The formula definition (readable) and its schema reference list |
| `README.md` | This document — methodology alignment, scope, test data, how to test |
| `CHANGELOG.md` | Change history for this revision |
| `REVIEWER_COVER_NOTE.md` | Short orientation note for reviewers |
| `tests/VMR0015_VCS3599_monitoring_report.json` | Canonical test data — Monitoring Report credential subject (real VCS 3599 figures) |
| `tests/README.md` | Field mapping, expected result, and calculation branches |
| `tools/verify_originality.py` | Scans `VMR0015.policy` for forbidden upstream CDM identifiers (originality check) |
| `workflow.png` | Policy workflow diagram |
| `LICENSE` | License |

---

## 6. Change history

See [`CHANGELOG.md`](./CHANGELOG.md). Summary of this revision:

- **Fixed** the `calculate_report_fields` block to read the Monitoring Report's flat numeric fields (`field3/4/5`) instead of nested objects — previously a correctly filled report computed `field6 = 0` and minted zero.
- **Re-grounded** the test data on registered Verra project VCS 3599 (replacing an earlier non-Verra example).
- **Removed** an earlier AI-generated `.record` integrity-test file that did not match this policy's block tags/schema IDs (would fail deterministic replay), plus stale audit/evidence files with broken internal references.

---

## 6a. Known cleanup item

The importable binary `VMR0015.policy` currently carries an internal policy name with a dev suffix (`… Bikram1111 v3.3.2-CALC-FIX`). The readable `VMR0015_policy.json` shows the normalized name (`VMR0015 v1.0 Safe Drinking Water dMRV`). The binary's internal name is best corrected inside Guardian and re-exported (hand-editing the binary would change its hash and break import); this is a cosmetic label only and does not affect the calculation or schemas. Flagged here for transparency.

---

## 7. Sources

- [Verra — VMR0015 v1.0 methodology page](https://verra.org/methodologies/vmr0015-revisiontoams-iii-av-low-greenhouse-gas-emitting-safe-drinking-water-production-systems-v1-0/)
- [Verra announcement (31 Oct 2025) — revision to CDM methodology for water purification systems](https://verra.org/verra-publishes-revision-to-cdm-methodology-for-water-purification-systems/)
- [Verra registry — VCS 3599](https://registry.verra.org/app/projectDetail/VCS/3599)
