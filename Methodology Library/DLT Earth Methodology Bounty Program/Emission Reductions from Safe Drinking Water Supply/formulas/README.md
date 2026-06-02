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
(`#31d7ef1c-d257-44b7-8cf9-402259e39a9a`).

| Item | Type | Definition | Linked to |
|---|---|---|---|
| `BE_y` | variable | Baseline Emissions total (tCO₂e) | Monitoring Report → `field3` (BE Total) |
| `PE_y` | variable | Project Emissions total (tCO₂e) | Monitoring Report → `field4` (PE Total) |
| `LE_y` | variable | Leakage Emissions total (tCO₂e) | Monitoring Report → `field5` (LE Total) |
| `u_def` | constant | 0.89 — conservativeness discount (implementation design choice; **not** a Verra-mandated blanket parameter) | — |
| `ER_net` | formula | `BE_y − PE_y − LE_y` — the core VMR0015 / AMS-III.AV. equation (§3.9.1) | depends on BE_y, PE_y, LE_y |
| `ER_y` | formula | `max(0, ER_net) × u_def` — value recorded and minted | Monitoring Report → `field6` (ER Total / MintToken rule) |
| `WQ_gate` | text | Optional: if a sample pass-rate is supplied and < 95%, ER_y = 0 for the period | conditional |

## How this maps to the calculation block

The `calculate_report_fields` custom-logic block implements exactly these
equations on-chain:

```
field6 = max(0, field3 − field4 − field5) × 0.89        // ER_y
       = max(0, BE_y − PE_y − LE_y) × u_def
```

So the **formula linked definitions** (this folder) and the **formula
calculation block** (`calculate_report_fields` inside `VMR0015.policy`) describe
the *same* math — one as a reviewable, schema-linked definition, the other as the
executable block that runs at submission time.

## Relationship to Verra's published VMR0015

- `ER_net = BE_y − PE_y − LE_y` is the methodology's core equation (VMR0015
  §3.9.1 / AMS-III.AV.).
- `u_def = 0.89` is a conservativeness choice of this implementation, surfaced
  explicitly so reviewers can adjust or remove it to match Verra's prescribed
  uncertainty treatment.
- The derivation of BE/PE/LE (the six VMR0015 refinements — non-renewable
  biomass fraction, validation-set leakage factor, updated emission factors,
  REDD+ double-counting, interacting-technologies baseline adjustment, per-device
  data) occurs upstream during validation/verification; the policy consumes the
  resulting totals.

## Source references (Guardian)
- Interface: `interfaces/src/interface/formulas.interface.ts`
- Import/export: `common/src/import-export/formula.ts`
- Feature docs: https://guardian.hedera.com/guardian/standard-registry/policies/formula-linked-definitions
