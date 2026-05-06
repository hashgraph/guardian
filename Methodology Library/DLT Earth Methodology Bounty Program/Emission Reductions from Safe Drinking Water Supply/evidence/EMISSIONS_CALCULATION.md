# VMR0015 v1.0 — Emissions Calculation

This file documents the emission-reduction math implemented in the policy. Every equation here is wired into one of two `customLogicBlock` blocks; the result drives the `mintDocumentBlock`.

---

## 1. Source Methodology

**VMR0015 v1.0** — *Revision to AMS-III.AV: "Low greenhouse gas emitting safe drinking water production systems".*
Issued by Verra. Replaces CDM AMS-III.AV; introduces conditional leakage handling, water-quality compliance gating, and tightened equipment-default fractions.

The methodology applies to projects that displace pre-project household water-treatment practices (boiling, chemical disinfection) with a mechanical purification system whose performance is monitored.

---

## 2. Notation

| Symbol | Meaning | Unit |
|---|---|---|
| `BE_woody` | Baseline emissions from non-renewable woody biomass displaced | tCO₂e/yr |
| `BE_fossil` | Baseline emissions from fossil fuel displaced | tCO₂e/yr |
| `BE_total` | Total baseline emissions | tCO₂e/yr |
| `PE_electricity` | Project electricity emissions | tCO₂e/yr |
| `PE_transport` | Project transport emissions | tCO₂e/yr |
| `PE_manufacturing` | Project manufacturing/embodied emissions | tCO₂e/yr |
| `PE_aux` | Project auxiliary emissions | tCO₂e/yr |
| `PE_total` | Total project emissions | tCO₂e/yr |
| `LE_woody` | Leakage from woody biomass displacement | tCO₂e/yr |
| `LE_fossil` | Leakage from fossil fuel displacement | tCO₂e/yr |
| `f_woody` | Fraction of pre-project fuel mix that is woody | unitless |
| `LE_total` | Total leakage | tCO₂e/yr |
| `ER_total` | Net emission reductions | tCO₂e/yr |

---

## 3. Equations (as implemented)

### Baseline emissions

```
BE_total = BE_woody + BE_fossil
```

### Project emissions

```
PE_total = PE_electricity + PE_transport + PE_manufacturing + PE_aux
```

### Leakage — VMR0015 conditional

VMR0015 introduces a guard on woody-biomass leakage: woody leakage is only counted when the pre-project fuel mix actually contained woody biomass. Otherwise it is forced to zero so that an electric-baseline project is not penalised for non-existent biomass leakage.

```
LE_total = (f_woody > 0 ? LE_woody : 0) + LE_fossil
```

### Net emission reductions

Negative results are clamped at zero; only positive net reductions can mint CER tokens.

```
ER_total = max(0, BE_total − PE_total − LE_total)
```

---

## 4. Field Mapping in Custom-Logic Output

The active `customLogicBlock` (`calculate_report_fields`, wired to MR schema `d0f009f5-...&1.0.0`) writes output fields with both nested intermediates and the top-level mint key. These are the paths the `mintDocumentBlock` references.

| Field path | Source variable | Meaning |
|---|---|---|
| `field5.field0` | `BE_total` | Baseline emissions (nested under field5) |
| `field4.field0` | `PE_total` | Project emissions (nested under field4) |
| `field6.field3` | `LE_total` | Leakage (nested under field6) |
| **`field7`** | **`ER_total`** | **Top-level — mint rule reads this** |

`mintDocumentBlock.rule = "field7"`. Decimals on the CER token = 2, so the minted units are `floor(ER_total × 100)`. The dormant `calculate_project_fields` block was removed in the corrective pass (it was wired to the project schema, which has no BE/PE/LE fields at creation).

---

## 5. Worked Example (TC1 — canonical)

The canonical worked example is maintained as a single source of truth in [`CANONICAL_TC1.md`](CANONICAL_TC1.md). All other documentation and the calculations workbook reference that file. The summary below mirrors it.

### Inputs (Monitoring Report VC, schema `d0f009f5-44c6-438e-b852-02dbe831a079&1.0.0`)

| Variable | Value |
|---|---|
| `BE_woody` | 8.00 tCO₂e |
| `BE_fossil` | 4.00 tCO₂e |
| `PE_electricity` | 0.40 tCO₂e |
| `PE_transport` | 0.20 tCO₂e |
| `PE_manufacturing` | 0.30 tCO₂e |
| `PE_aux` | 0.10 tCO₂e |
| `LE_woody` | 0.80 tCO₂e |
| `LE_fossil` | 0.20 tCO₂e |
| `f_woody` | 0.60 |
| `wq_pass_rate` | 0.98 (≥ 0.95 math-layer hard gate) |
| Households served | 200 |
| Monitoring period | 365 days |

### Computation (verbatim from `customLogicBlock.calculate_report_fields`)

```
BE_total = BE_woody + BE_fossil                     = 12.00
PE_total = PE_electricity + PE_transport + PE_manufacturing + PE_aux = 1.00
LE_total = (f_woody > 0 ? LE_woody : 0) + LE_fossil = 1.00
ER_total = max(0, BE_total - PE_total - LE_total)   = 10.00
```

### Output write-paths (as the policy actually writes them)

| Field | Source variable | Where written |
|---|---|---|
| `field5.field0` | `BE_total` | nested under field5 |
| `field4.field0` | `PE_total` | nested under field4 |
| `field6.field3` | `LE_total` | nested under field6 |
| **`field7`** | **`ER_total`** | **top-level — read by `mintDocumentBlock.rule`** |

### Mint

```
mint_units = floor(field7 × 10^decimals) = floor(10.00 × 100) = 1000
```

The Guardian engine submits an HTS mint of **1000 base units** against token `0.0.8865898`. Because decimals = 2, this represents **10.00 CER**.

---

## 6. Worked Example (zero-edge)

Tests that the `max(0, …)` clamp protects against negative reductions.

| Variable | Value |
|---|---|
| `BE_total` | 50.0 |
| `PE_total` | 80.0 |
| `LE_total` | 10.0 |

```
ER_total_raw = 50.0 − 80.0 − 10.0 = −40.0
ER_total     = max(0, −40.0) = 0.0
mint_units   = 0
```

The `mintDocumentBlock` will not emit a mint when `field7` is zero. No tokens are minted; the report is rejected at the policy level rather than producing negative or zero-valued tokens.

---

## 7. Worked Example (electric baseline, no woody)

Tests the VMR0015 conditional leakage logic.

| Variable | Value |
|---|---|
| `BE_woody` | 0.0 |
| `BE_fossil` | 50.0 |
| `BE_total` | 50.0 |
| `PE_total` | 5.0 |
| `LE_woody` | 4.0 |
| `LE_fossil` | 1.0 |
| `f_woody` | 0.0 |

```
LE_total = (0.0 > 0 ? 4.0 : 0) + 1.0 = 0 + 1.0 = 1.0
ER_total = max(0, 50.0 − 5.0 − 1.0) = 44.0
mint_units = 4400
```

Under AMS-III.AV (CDM original) the woody leakage would have been incorrectly subtracted, giving `ER = 40.0`. The VMR0015 guard avoids this 4 tCO₂e penalty.

---

## 8. Validation gate — water quality

The Monitoring Report schema includes `wq_pass_rate`. Verra requires ≥ 95 % pass rate on independent water quality testing for the reporting period to be eligible.

In v1.0.0 this is a **documentation gate enforced by VVB review**: reports below 0.95 are expected to be rejected by the VVB at `approve_report_btn` before they reach the mint block. v1.1.0 will move this into the math layer directly (`if (wq_pass < 0.95) ER_total = 0` inside `calculate_report_fields`) so the policy refuses to mint regardless of VVB approval.

In the canonical TC1 example, `wq_pass_rate = 0.98` clears the 0.95 threshold, so the report proceeds to mint.

---

## 9. Where to inspect this in the policy JSON

- `customLogicBlock` `calculate_report_fields` — single active block. Aggregates BE/PE/LE, computes `ER_total = max(0, BE_total - PE_total - LE_total)`, writes `field7` plus the nested intermediates listed in §4. Wired to MR schema `d0f009f5-...&1.0.0`.
- `mintDocumentBlock` — `tokenId: 0.0.8865898`, `rule: field7`
- Schema `Monitoring Report (VMR0015)` (`#d0f009f5-...`) — required input fields
- Schema `Baseline Emissions Breakdown` — BE component fields
- Schema `Project Activity Emissions` — PE component fields
- Schema `Leakage Adjustment (VMR0015)` — LE component fields, `f_woody` flag

---

## Appendix A — Full schema IRI registry (14 published schemas)

All 14 schemas were anchored to HCS topic `0.0.8865880` at publish time. A reviewer can verify each by extracting `VMR0015.policy` and inspecting `schemas/`.

| # | IRI | Name |
|---|-----|------|
| 1 | `#0a9931ce-1bdb-49ef-bfde-f9afad5e6e74&1.0.0` | VVB |
| 2 | `#104b5d2f-c3e0-46c6-b486-6652dd649779&1.0.0` | Project Participant |
| 3 | `#23b4fa33-c869-4989-8afe-6870ddf5ebd1&1.0.0` | Baseline Fuel Mix (VMR0015) |
| 4 | `#26e77906-aeb6-4505-b17f-dc6b0efbeedf&1.0.0` | Household Profile |
| 5 | `#2cca5db7-2abc-4dff-9f60-ac78a6cc2a59&1.0.0` | Geographic Location |
| 6 | `#498e22a8-8aba-4201-ae0c-a66464351b8c&1.0.0` | Monitoring Reporting Period |
| 7 | `#63f685ca-6473-48b5-b67d-b3c504165f11&1.0.0` | Project Activity Emissions |
| 8 | `#879b3b39-9ab9-43ca-8390-76043a314f5f&1.0.0` | Leakage Adjustment (VMR0015) |
| 9 | `#a6c5a581-6828-41de-ac85-cef0ba38033a&1.0.0` | Water Quality Test |
| 10 | `#aacff1ab-ef5f-4ca1-873f-bfb06c1a1b0a&1.0.0` | Baseline Emissions Breakdown |
| 11 | `#bab53f97-d952-4ae3-81a6-3e2ac2c12d5e&1.0.0` | Water Purification Device |
| 12 | `#c2d7ce9c-6008-430d-8381-27e195a04a79&1.0.0` | Operating Performance |
| 13 | `#d0f009f5-44c6-438e-b852-02dbe831a079&1.0.0` | Monitoring Report (VMR0015) |
| 14 | `#dbbe9f47-7bbc-48dd-b876-29c1a950807e&1.0.0` | Project Description (VMR0015) |
