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

The first `customLogicBlock` aggregates the inputs and emits a document with these output fields. These are the field indices the `mintDocumentBlock` references.

| Field | Output | Meaning |
|---|---|---|
| `field4` | `PE_total` | Project emissions |
| `field5` | `BE_total` | Baseline emissions |
| `field6` | `LE_total` | Leakage |
| **`field7`** | **`ER_total`** | **Emission reductions — mint rule reads this** |

`mintDocumentBlock.rule = "field7"`. Decimals on the CER token = 2, so the minted units are `ER_total × 100`.

---

## 5. Worked Example (TC1 Pilot)

Inputs supplied via the Monitoring Report VC (`#d0f009f5-44c6-438e-b852-02dbe831a079`):

| Variable | Value |
|---|---|
| `BE_woody` | 120.0 tCO₂e |
| `BE_fossil` | 80.0 tCO₂e |
| `PE_electricity` | 5.0 tCO₂e |
| `PE_transport` | 2.0 tCO₂e |
| `PE_manufacturing` | 1.0 tCO₂e |
| `PE_aux` | 0.5 tCO₂e |
| `LE_woody` | 3.0 tCO₂e |
| `LE_fossil` | 1.0 tCO₂e |
| `f_woody` | 0.40 |

### Step 1 — baseline

```
BE_total = 120.0 + 80.0 = 200.0
```

### Step 2 — project

```
PE_total = 5.0 + 2.0 + 1.0 + 0.5 = 8.5
```

### Step 3 — leakage (VMR0015 conditional)

```
f_woody = 0.40 > 0  →  include LE_woody
LE_total = 3.0 + 1.0 = 4.0
```

### Step 4 — net reductions

```
ER_total = max(0, 200.0 − 8.5 − 4.0) = 187.5 tCO₂e
```

### Step 5 — mint quantity

```
mint_units = 187.5 × 10^decimals = 187.5 × 100 = 18,750 CER
```

The Guardian engine submits an HTS mint of 18,750 base units against token `0.0.8865898`. Because decimals = 2, this represents **187.50 CER**.

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

The Monitoring Report schema includes `wq_pass_rate`. Verra requires ≥ 95 % pass rate on independent water quality testing for the reporting period to be eligible. Reports below this threshold are rejected by the VVB at `approve_report_btn` and never reach the mint block.

In the pilot example, `wq_pass_rate = 0.97` clears the 0.95 threshold, so the report proceeds to mint.

---

## 9. Where to inspect this in the policy JSON

- `customLogicBlock` #1 — input aggregation (BE, PE, LE component sums)
- `customLogicBlock` #2 — `ER_total` and field-7 mapping (also enforces `max(0, …)`)
- `mintDocumentBlock` — `tokenId: 0.0.8865898`, `rule: field7`
- Schema `Monitoring Report (VMR0015)` (`#d0f009f5-...`) — required input fields
- Schema `Baseline Emissions Breakdown` — BE component fields
- Schema `Project Activity Emissions` — PE component fields
- Schema `Leakage Adjustment (VMR0015)` — LE component fields, `f_woody` flag
