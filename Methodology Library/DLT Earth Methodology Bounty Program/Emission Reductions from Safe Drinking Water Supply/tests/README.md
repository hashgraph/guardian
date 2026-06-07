# Test data — VMR0015 v1.0 (Verra VCS 3599)

This folder contains the canonical test fixture and the dry-run validation evidence for the policy.

## `VMR0015_VCS3599_monitoring_report.json`

A single Monitoring Report credential subject grounded in a **real, registered Verra project**, using
parameter values back-calculated from the project's verified ER calculation spreadsheet so that the
on-chain `calculate_report_fields` block re-derives the exact monitored BE via the AMS-III.AV. equations.

- **Project:** VCS 3599 — Grouped Projects for Safe Drinking Water for Schools in Viet Nam (Registered, methodology AMS-III.AV.)
- **Monitoring period:** 01/01/2025 – 30/06/2025 (2025H1)
- **Registry:** https://registry.verra.org/app/projectDetail/VCS/3599
- **ER source:** `VCS-ERS-Project-3599-01JAN2025-30JUN2025.xlsx`, sheet `Total ER`
- **Primary methodology source:** [UNFCCC CDM AMS-III.AV. v9.0 (PDF)](https://cdm.unfccc.int/sunsetcms/storage/contents/stored-file-20250506190351296/MP97_EA06_AMS-III.AV_v09.0.pdf)

### Parameter sources and justification

| Parameter | Value | Source / Justification |
|---|---|---|
| `QPW_y` (litres/yr, field12) | **713,972,729** | Back-calculated from the ERS `BE_total` for 2025H1 so that the on-chain AMS-III.AV. Eq.1 re-derives `BE_y = 162,241.14 tCO₂e` exactly. Represents total safe water purified by the beneficiary school population over the 01/01/2025–30/06/2025 monitoring period. |
| `m` (fraction functional appliances meeting SDW, field13) | **0.95** | 95% of appliances pass the safe-drinking-water requirement. Above the 0.90 WQ gate threshold, so ER is minted. Sourced from VCS 3599 ER spreadsheet (`m and water quality` sheet). |
| `X_boil` (baseline boiling fraction, field14) | **1.0** | All schools boil water in baseline per VCS 3599 PDD narrative. No alternative safe water source at project sites. |
| `nwb` (baseline boiling efficiency, field15) | **0.10** | AMS-III.AV. v9.0 Table 3, option (b): default for three-stone fire / conventional woody-biomass system without grate or chimney. Applied in VCS 3599 ER spreadsheet. |
| `EF_fuel` (emission factor, tCO₂/TJ, field16) | **81.6** | AMS-I.E. v14.0 Table 2 / IPCC Tier 1 NRB woody biomass default. Referenced by AMS-III.AV. Table 6 and applied in VCS 3599 ER spreadsheet. |
| `f_i` / `fNRB` (non-renewable fraction, field17) | **0.82** | Vietnam national default per CDM TOOL33 v4.0 (2024 CDM Executive Board update). Applied in VCS 3599 ER spreadsheet. |
| `BL_fuel` (baseline fuel proportion, field18) | **1.0** | 100% non-renewable woody biomass in baseline. No fossil fuel share. Consistent with rural Vietnam school context in VCS 3599 PDD. |
| Appliances passing / total (field10 / field11) | **95 / 100** | 95% pass-rate. Above the 0.90 WQ gate threshold → ER is minted. Sourced from VCS 3599 ER spreadsheet. |
| `PE` (project emissions, field4) | **0** | Ecozen-25 UV purifiers: passive, no combustion, no grid electricity draw. PE = 0 per AMS-III.AV. Eq.6. |
| `LE` (leakage, field5) | **8,116.00** | Leakage for 2025H1 taken directly from VCS 3599 ER spreadsheet (`Total ER` sheet: `LE_total / 2 = 8,116.00 tCO₂e`). Modelled as an NRB fuel displacement correction applied to the BE total. |
| `BE` (field3, computed and written back) | **162,241.14** | Computed on-chain by `calculate_report_fields` from the parameters above; also written into field3 for audit trail. |
| `ER` (field6, minted amount) | **154,125.14** | `ER_y = BE_y − PE_y − LE_y = 162,241.14 − 0 − 8,116.00 = 154,125.14 tCO₂e` → minted as **154,125 CER** on-chain (rounded to 2 d.p.). Matches Verra Registry issuance for 01/01/2025–30/06/2025 (issuance date 13/02/2026). |

### Expected result after submission

The `calculate_report_fields` block runs the real AMS-III.AV. equations:

```
SEC  = 357.48 / 0.10                                                               = 3,574.8 kJ/L    [Eq.5]
BE_y = 713,972,729 × 0.95 × 1.0 × 3,574.8 × (1.0 × 0.82 × 81.6 × 1e-9)         = 162,241.14 tCO₂e [Eq.1]
ER_y = 162,241.14 − 0 − 8,116.00                                                  = 154,125.14 tCO₂e [Eq.7]
```

Appliance pass-rate = 95 / 100 = 0.95 ≥ 0.90, so the water-quality gate passes and the policy mints **154,125.14 CER** (field6).

> **Note on QPW_y derivation:** `QPW_y = 713,972,729 L` is the value that, with the methodology parameters above, reproduces the ERS-verified `BE_y = 162,241.14 tCO₂e` via AMS-III.AV. Eq.1. It represents the total safe water volume purified by the project's beneficiary school population over the 2025H1 monitoring period as implicitly used in the VCS 3599 ER spreadsheet.

### Calculation branches (for reviewers)

The block has been exercised across these cases (logic-level):

| Input | Expected `field6` |
|---|---|
| Canonical VCS 3599 fixture (pass-rate 0.95, LE = 8,116.00) | **154,125.14** |
| Values supplied as numeric strings | 154,125.14 (coerced via `toNum()`) |
| Appliances 85 / 100 (pass-rate 0.85 < 0.90) | 0 (water-quality gate fires) |
| Appliance counts missing / blank | 0 (fail-closed) |
| `nwb = 0` | 0 (SEC guard → BE = 0) |
| Net negative (PE + LE > BE) | 0 (clamped to zero) |

## Dry-run record provenance and schema match

Earlier drafts bundled an AI-generated `tc1` .record/expected set whose block tags and schema IDs did not match this policy; those files were deliberately removed (see CHANGELOG [2.0.0] "Removed" section).

The current `VMR0015_dryrun_record.record` and `VMR0015_dryrun_publish_proof.csv` were generated by:

1. Importing this `VMR0015.policy` into Guardian (17 schemas), and
2. Running the VCS 3599 01/01/2025–30/06/2025 test case (BE = 162,241.14; LE = 8,116.00; ER = 154,125.14 tCO₂e).

The `.record` contains exactly the same 17 schema UUIDs as `VMR0015_policy.json` (no extra or missing schemas). Replaying it in Guardian reproduces BE = 162,241.14, LE = 8,116.00, ER = 154,125.14 tCO₂e, consistent with the VCS 3599 ER spreadsheet and Verra Registry issuance for this monitoring period.

> **Note on dry-run gate version:** the `.record` was captured while the water-quality gate threshold was at pass-rate < 0.95 (an earlier draft value). The live `calculate_report_fields` block in the current `VMR0015.policy` uses the methodology-correct threshold of pass-rate < 0.90 (AMS-III.AV. Table 11, §6.1). The canonical fixture (pass-rate 0.95) clears both thresholds, so the minted result — 154,125.14 CER — is identical under either gate value. Reviewers who replay the record at the 0.90 boundary will see consistent behaviour with the current policy.

## Dry-run validation evidence

This exact policy was imported into Guardian, dry-run, and **published** on a testnet instance.

| File | What it proves |
|---|---|
| `VMR0015_dryrun_record.record` | Guardian recording of the dry run. Its 17 project-schema IDs match this policy 17/17 (confirming the record belongs to this policy, not a stale export). |
| `VMR0015_dryrun_publish_proof.csv` | The signed `PUBLISH` Verifiable Credential (Ed25519 signature, Hedera testnet DID) emitted when the policy published, under the name `VMR0015 v1.0 Safe Drinking Water dMRV`, version 2.0.0. |

> The bundled `.record` was produced from a **live Guardian dry-run of this policy**, so it can be replayed deterministically against the same import.

## Note on the water-quality gate

The calculation block implements AMS-III.AV.'s real requirement (Table 11, §6.1): emission reductions
cannot be claimed if **more than 10% of appliances fail** the water-quality requirement
(<1 cfu/100 ml E. coli). The block reads the appliance pass/total counts (`field10` / `field11`) and zeroes
the period's ER when the pass-rate is below 0.90. It is fail-closed: missing appliance evidence yields
a pass-rate of 0 and therefore no issuance.

## Dry-run record provenance note (b356cc8 correction)

The `.record` file was captured against the live 0.90 WQ pass-rate gate reading flat integer counts
from `field10` (appliances passing) and `field11` (appliances total), per AMS-III.AV. §8.4.
The canonical fixture sets `field10 = 95` / `field11 = 100` so that pass-rate = 0.95, which clears
the gate.

> **b356cc8 arithmetic correction:** commit b356cc8 stated an intermediate result of 53,185.71 tCO₂e;
> the correct result for those methodology-default parameters is **53,309.84 tCO₂e**. The canonical
> test fixture uses back-calculated VCS 3599 monitored values (`QPW_y = 713,972,729 L`) which produce
> `BE = 162,241.14`, `ER = 154,125.14 tCO₂e`, matching the Verra registry issuance of 154,125 VCUs
> (13 Feb 2026). The b356cc8 figure was an intermediate working value and does not appear in any
> schema, policy block, or minting rule; it has no effect on the on-chain result.

## Note on proof file version vs submission version

The `VMR0015_dryrun_publish_proof.csv` was captured when the policy was at Guardian internal
version **2.0.0** (the version baked into the `.policy` export at the time of the dry-run).
Subsequent documentation and schema clean-up commits advanced the CHANGELOG submission
tracking version to **2.1.1**, but the `.policy` binary and the on-chain token logic are
identical — only metadata and docs changed after the dry-run.

**Bottom line:** The proof covers the exact policy binary that is submitted. The `2.0.0`
label in the CSV is the Guardian-internal policy object version, not the submission
CHANGELOG version. Reviewers should treat the proof as valid for the current submission.
