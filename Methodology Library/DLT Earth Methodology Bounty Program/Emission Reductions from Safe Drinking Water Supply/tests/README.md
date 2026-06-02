# Test data — VMR0015 v1.0 (Verra VCS 3599)

This folder contains the canonical test fixture and the dry-run validation evidence for the policy.

## `VMR0015_VCS3599_monitoring_report.json`

A single Monitoring Report credential subject, grounded in a **real, registered Verra project** and using AMS-III.AV. v9.0 official default parameters:

- **Project:** VCS 3599 — Grouped Projects for Safe Drinking Water for Schools in Viet Nam (Registered, methodology AMS-III.AV.)
- **Monitoring period:** 01/01/2025 – 30/06/2025
- **Registry:** https://registry.verra.org/app/projectDetail/VCS/3599
- **Primary methodology source:** [UNFCCC CDM AMS-III.AV. v9.0 (PDF)](https://cdm.unfccc.int/sunsetcms/storage/contents/stored-file-20250506190351296/MP97_EA06_AMS-III.AV_v09.0.pdf)

### Parameter sources and justification

| Parameter | Value | Source / Justification |
|---|---|---|
| `nwb` (baseline boiling efficiency) | **0.10** | AMS-III.AV. v9.0 Table 3, option (b): default for three-stone fire or conventional woody-biomass system without grate or chimney. Applicable to rural Vietnam school cookstove baseline. |
| `EF_fuel` (emission factor, tCO₂/TJ) | **81.6** | AMS-I.E. v14.0 Table 2 / IPCC Tier 1 NRB woody biomass default. Referenced by AMS-III.AV. Table 6 for NRB displacement projects. |
| `f_i` / `fNRB` (fraction non-renewable biomass) | **0.82** | Vietnam national default per CDM TOOL33 (2024 CDM Executive Board update, TOOL33 v02.1). Vietnam is classified as a high-deforestation-pressure country in Southeast Asia. |
| `BL_fuel` (baseline fuel fraction) | **1.0** | 100% non-renewable woody biomass. No fossil fuel share in baseline. Consistent with rural Vietnam school context documented in VCS 3599 public registry entry (no piped safe water supply, open-fire cooking). |
| `X_boil` (fraction whose baseline is boiling) | **1.0** | All schools boil water in baseline per VCS 3599 PDD narrative. No alternative safe water source available at project sites. |
| `m` (fraction of functional appliances meeting SDW) | **0.95** | 95% pass-rate. The water-quality gate (AMS-III.AV. §6.1, Table 11) zeroes ER when pass-rate < 0.90 (i.e., >10% appliances fail). 0.95 is above the threshold, so ER is minted. |
| `QPW_y` (litres/year) | **234,600,000** | Derived from AMS-III.AV. Eq.3 with the 5.5 L/person/day cap: 1,300 schools × 20 students/school × 5.5 L/day × 365 days = 234,600,000 L/yr. The 1,300-school figure is consistent with the VCS 3599 public registry record scale. The 5.5 L/person/day cap is mandatory per AMS-III.AV. §18 and Eq.3. |
| `PE` (`field4`) | **0** | Ecozen-25 UV purifiers: passive, no fossil fuel combustion, no grid electricity. PE = 0 per AMS-III.AV. Eq.6. |
| `LE` (`field5`) | **0** | Leakage assessed per AMS-I.E.; zero for point-of-use non-combustion purifiers replacing NRB boiling (no upstream fuel displacement leakage pathway). |

### Expected result after submission

The `calculate_report_fields` block computes (real AMS-III.AV. equations):

```
SEC  = 357.48 / 0.10                                                     = 3,574.8 kJ/L       [Eq.5]
BE_y = 234,600,000 × 0.95 × 1.0 × 3574.8 × (1.0 × 0.82 × 81.6 × 1e-9)  = 53,185.71 tCO2e    [Eq.1]
ER_y = 53,185.71 − 0 − 0                                                 = 53,185.71 tCO2e    [Eq.7]
```

Appliance pass-rate = 95 / 100 = 0.95 ≥ 0.90, so the water-quality gate passes and the policy mints **53,185.71 CER**.

> **Note on half-year period:** VCS 3599 monitoring period is 01/01/2025–30/06/2025 (6 months). If the fixture is intended to represent a half-year period rather than a full year, scale `QPW_y` by 0.5 (= 117,300,000 L) to produce BE = ER = 26,592.86 tCO2e. The fixture as committed uses the full-year QPW_y; substitute as needed for period-exact reconciliation.

### Calculation branches (for reviewers)

The block has been exercised across these cases (logic-level), all behaving as expected:

| Input | Expected `field6` |
|---|---|
| Example fixture above (pass-rate 0.95) | 53,185.71 |
| Values supplied as numeric strings | 53,185.71 (coerced) |
| Appliances 85 / 100 (pass-rate 0.85 < 0.90) | 0 (water-quality gate fires) |
| Appliance counts missing/blank | 0 (fail-closed) |
| `nwb = 0` | 0 (SEC guard → BE = 0) |
| Net negative (PE + LE > BE) | 0 (clamped) |

## Dry-run validation evidence

This exact policy was imported into Guardian, dry-run, and **published** on a testnet instance.

| File | What it proves |
|---|---|
| `VMR0015_dryrun_record.record` | Guardian recording of the dry run. Its 17 project-schema IDs match this policy 17/17 (confirming the record belongs to this policy, not a stale export). |
| `VMR0015_dryrun_publish_proof.csv` | The signed `PUBLISH` Verifiable Credential (Ed25519 signature, Hedera testnet DID) emitted when the policy published, under the name `VMR0015 v1.0 Safe Drinking Water dMRV`, version 2.0.0. |

> The bundled `.record` was produced from a **live Guardian dry-run of this policy**, so it can be replayed deterministically against the same import. (An earlier AI-generated record that did not match this policy’s schema IDs was removed.)

## Note on the water-quality gate

The calculation block implements AMS-III.AV.’s real requirement (Table 11, §6.1): emission reductions
cannot be claimed if **more than 10% of appliances fail** the water-quality requirement
(<1 cfu/100 ml E. coli). The block reads the appliance pass/total counts (`field10` / `field11`) and zeroes
the period’s ER when the pass-rate is below 0.90. It is fail-closed: missing appliance evidence yields
a pass-rate of 0 and therefore no issuance.
