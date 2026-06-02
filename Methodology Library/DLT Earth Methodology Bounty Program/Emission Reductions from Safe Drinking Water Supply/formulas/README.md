# Formula Linked Definitions — VMR0015 v1.0

This folder contains the **Guardian Formula Linked Definition** for the policy: a
human-readable, schema-linked representation of the emission-reduction math, so a
reviewer can see each equation and click through every variable to the exact
Monitoring Report field it reads.

## Files
| File | Purpose |
|---|---|
| `VMR0015_formula.zip` | Importable Guardian formula artifact (`formula.json` + `schemas.json`). Import via **Policies → Formulas → Import**. |
| `formula.json` | The formula definition (unzipped, for review). |
| `schemas.json` | The schema reference list the formula links to. |

The structure follows Guardian's own interface (`@guardian/interfaces` →
`IFormula` / `IFormulaItem` / `IFormulaLink`) and import/export format
(`common/src/import-export/formula.ts`: `formula.json` + `schemas.json`).

## Equations and their linked definitions

All variables link to the **Monitoring Report** schema
(`#db884e2d-a681-40d4-b24c-0e0d848fb868`). These are the real AMS-III.AV.
equations (primary source: UNFCCC CDM AMS-III.AV.).

| Item | Type | Definition | Linked to |
|---|---|---|---|
| `QPW_y` | variable | Safe drinking water supplied (L/yr) | Monitoring Report → `field12` |
| `m` | variable | Fraction of functional appliances meeting SDW (0–1) | Monitoring Report → `field13` |
| `X_boil` | variable | Fraction whose baseline is boiling (0–1) | Monitoring Report → `field14` |
| `nwb` | variable | Baseline appliance efficiency (0–1) | Monitoring Report → `field15` |
| `EF_fuel` | variable | Baseline fuel emission factor (tCO₂/TJ) | Monitoring Report → `field16` |
| `f_i` | variable | Fraction of non-renewable biomass / fNRB (0–1) | Monitoring Report → `field17` |
| `BL_fuel` | variable | Baseline fuel fraction (0–1) | Monitoring Report → `field18` |
| `PE_y` | variable | Project Emissions total (tCO₂e) | Monitoring Report → `field4` |
| `LE_y` | variable | Leakage Emissions total (tCO₂e) | Monitoring Report → `field5` |
| `SEC` | formula | `357.48 / nwb` (kJ/L) — AMS-III.AV. Eq. 5 | — |
| `BE_y` | formula | `QPW_y × m × X_boil × SEC × (BL_fuel × f_i × EF_fuel × 1e-9)` — Eq. 1 | Monitoring Report → `field3` (computed) |
| `pass_rate` | formula | appliances passing / total (fail-closed at 0 when no data) | `field10` / `field11` |
| `ER_y` | formula | `(pass_rate < 0.90) ? 0 : max(0, BE_y − PE_y − LE_y)` — Eq. 7 + water-quality gate | Monitoring Report → `field6` (MintToken rule) |

## How this maps to the calculation block

The `calculate_report_fields` custom-logic block implements exactly these
equations on-chain:

```
SEC  = 357.48 / nwb                                              // Eq.5
BE_y = QPW_y * m * X_boil * SEC * (BL_fuel * f_i * EF_fuel * 1e-9) // Eq.1
ER_y = (pass_rate < 0.90) ? 0 : max(0, BE_y - PE_y - LE_y)        // Eq.7 + WQ gate
field3 = BE_y    field6 = ER_y (minted)
```

So the **formula linked definitions** (this folder) and the **formula
calculation block** (`calculate_report_fields` inside `VMR0015.policy`) describe
the *same* math — one as a reviewable, schema-linked definition, the other as the
executable block that runs at submission time.

## Relationship to Verra's published VMR0015

- `ER_y = BE_y − PE_y − LE_y` is the methodology's core equation (AMS-III.AV. Eq. 7);
  `BE_y` and `SEC` are AMS-III.AV. Eq. 1 and Eq. 5 respectively. The constant
  `357.48 kJ/L = 4.186 × (100 − 20) + 0.01 × 2260`.
- **No blanket uncertainty multiplier is applied.** AMS-III.AV. does not mandate a
  single discount factor; conservativeness is carried by the `m` term and by the
  water-quality gate (ER = 0 when more than 10% of appliances fail).
- The derivation of the upstream parameters (the six VMR0015 refinements —
  non-renewable biomass fraction, validation-set leakage factor, updated emission
  factors, REDD+ double-counting, interacting-technologies baseline adjustment,
  per-device data) occurs during validation/verification; the policy consumes the
  resulting parameter values entered on the Monitoring Report.

## Source references
- Methodology (primary): UNFCCC CDM — AMS-III.AV. (Eq. 1/5/7, 357.48 constant)
- Verra — VMR0015 v1.0 methodology page
- Guardian interface: `interfaces/src/interface/formulas.interface.ts`
- Guardian import/export: `common/src/import-export/formula.ts`
- Feature docs: https://guardian.hedera.com/guardian/standard-registry/policies/formula-linked-definitions
