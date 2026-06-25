# ATEC GS11817 — v1.2 → v2.0 parameter map

Source: `Zaid's Copy of GS 11817 Method 2 431.2_V1.1_MECD_ER_verification-calculation-tool_UPDATED.xlsx`
(VVB IIT, ATEC PoA GS11815 / VPA02 / GS11817 — Bangladesh, electric induction).

This is the canonical realistic-input table the v2.0 test fixtures derive from.
Every value below is either a verbatim cell from ATEC's verified ER tool, an
IPCC default, or a v2.0-specific addition with a stated default.

## Project context

| Field | Value | Source |
|---|---|---|
| GS ID | 11817 | Cover D16 |
| Project name | ATEC Electric Cooking Program in Bangladesh — VPA02 | Cover D15 |
| Country | Bangladesh | implied |
| Crediting period | 2022-01-01 → 2026-12-31 (5y, renewal twice) | Cover D17/D19/D20 |
| Project start date | 2021-09-12 | Cover D18 |
| Baseline cookstove types | Wood, LPG, Natural gas (mixed) | Cover D21 |
| Project technology | Electric induction stove | Cover D22 |
| Methodology case | CASE 1 (efficiency determinable) | Cover D23 |
| Project fuel | Electricity | Cover D24 (Excel says "Fossil fuel" referring to grid mix; v2.0 uses "Electricity") |
| Useful lifetime | 10 years | Cover D25 |

## Baseline parameters (multi-fuel)

ATEC's verified Method 2 baseline uses 3 fuels:

| Fuel | Prop_i,j | η_b,i,j | EF_CO2 | EF_nonCO2 | NCV | apply_fNRB | fNRB_i,y |
|---|---:|---:|---:|---:|---:|---|---:|
| Wood          | 0.80 | 0.10 | 112.0 | 9.46  | 0.0156 | true  | 0.8347 |
| Natural gas   | 0.11 | 0.50 | 56.1  | 0.293 | 0.0442 | false | 1.0    |
| LPG           | 0.09 | 0.60 | 63.1  | 0.89  | 0.0473 | false | 1.0    |

Source rows: BE D14–D16 (mass usage), D19–D21 (EF_CO2), D23–D25 (EF_nonCO2),
D27 (fNRB), D29–D31 (NCV), D42–D44 (η_b), D46–D48 (Prop).

EFb_input (PAA Eq. 2 — v1.2 form, no UEF):
`Σ Prop × (EFco2×fNRB + EFnonco2)` ≈ **93.74 tCO2e/TJ_input** (BE F12).

## Project parameters (electric induction, per device)

| Field | Value | Source |
|---|---|---|
| EGp_d_y (electricity per device per year) | 0.3285 MWh/device/yr | PE F13 |
| EGp_d_y_per_day | 0.9 kWh/day/hh | PE F14 |
| η_p (project device efficiency) | 0.9235 (fraction) | PE F18 |
| EFel_y (grid emission factor) | 0.412 tCO2e/MWh | PE F28 (UNFCCC IFI list) |
| TDL_j_y (T&D losses) | 0.1041 | PE F29 (Bangladesh power div) |
| People per household | 4 | PE F16 (PHC 2022) |
| Days per year | 365 | PE F19 |
| MWh→TJ factor | 0.0036 | PE F17 |

Resulting PE = **0.1494 tCO2e/device/year** (PE F4/F25).

## Specific energy consumption (Method 2 / CCT)

| Field | Value | Unit | Source |
|---|---:|---|---|
| SC_b (baseline, weighted) | 0.002402 | TJ/test/person | BE F61 (= weighted sum of per-fuel SC_b_j × Prop) |
| SC_b_wood   | 2.83 | MJ/test/person | BE F66 |
| SC_b_NG     | 0.69 | MJ/test/person | BE F67 |
| SC_b_LPG    | 0.69 | MJ/test/person | BE F68 |
| SC_p (project) | 0.000276 | TJ/test/person | BE F62 |

For v2.0 Method 2, the calculator expects per-row `sc_b_j_mean` in the same
units it carries Prop and η. We'll supply MJ/test/person in the row and let
the calc handle units.

## Verification realisations (per-month batches)

From Verification tab, here are the actual monthly per-device numbers as
observed in the field (averaged):

- 2022 first commissioning month (Jan): 214 units, 4.6 MWh measured, BE = 13.5 tCO2e, PE = 2.1, **ER = 11.4 tCO2e**
- Steady-state mature month (Dec 2024): 3622 cumulative units, 122 MWh, **ER = 302.9 tCO2e**

**Annual benchmark — Year 3 (2024):** Stoves = 62143 (full PoA scale projection),
BE = 59958 tCO2e, PE = 9286 tCO2e, LE = 0 (Option 1), ER = 50672 tCO2e.

**Per-stove annual averages (key benchmarks):**
- BE = **0.9648** tCO2e/device/year (ERs C12)
- PE = **0.1494** tCO2e/device/year (ERs C13)
- ER = **0.8154** tCO2e/device/year (ERs C14)

## Leakage (v1.2 vs v2.0)

| Period | v1.2 LE | v2.0 LE |
|---|---|---|
| Per device | 0 | embodied: 0.017 tCO2e × N_disseminated (deployment year only) + market: 2% of (BE − PE) under default option |

ATEC v1.2 used **Option 1 — Section 6.4.1.1** which states "the project does
not require a leakage assessment" → LE = 0. v2.0 PAA always books embodied
leakage at deployment, plus market leakage by chosen option.

## v2.0-only parameters (no v1.2 source — defaults)

These didn't exist in v1.2; we assign conservative-but-realistic defaults
documented per parameter:

| Field | Default | Reason |
|---|---|---|
| UEF_b,i (upstream EF) | Wood: 1.5, NG: 8, LPG: 6 (all tCO2e/TJ) | Literature defaults; lifecycle inventory medians |
| UEF_p,j (project upstream) | Grid embedded in EFel; 0 for direct | Already in EFel_y for Bangladesh grid |
| MPE (meter accuracy %) | 1.5% | Smart-meter typical ANSI C12.20 Class 0.5 |
| CTEC monitoring mode | full_census | ATEC has all stoves connected via Pochi MRV |
| Last performance test date | 2023-10-20 | from team curl performance_monitoring_summary |
| Next retest due date | 2025-10-20 | biennial cadence per PAA §8.4.5 |
| baseline_consistency_check pdd_prop / survey_prop | 0.80 / 0.80 | matches PDD baseline; no drift |
| DAF (downward adjustment) | 0.07 | midpoint of PAA recommended 0.05–0.10 range |
| BAU_y (national projection) | not applied (no NDC ceiling for ATEC) | conservatively skipped |
| Transition mode | new_activity | first crediting period |
| Leakage option | default_2pct | PAA default; Option 1 (de_minimis) requires justification doc |
| 90/10 precision | precisionMet=true | conservative for synthetic example |

## Fixture targets

We aim for three fixtures, each producing **positive ER**:

1. **Method 2 / Electric** (closest mirror of ATEC v1.2):
   - 1500 stoves over 12 months (2024-01 → 2024-12)
   - Expected ER ≈ 1500 × 0.8 = **~1200 tCO2e** before adjustments
   - After embodied LE (1500 × 0.017 = 25.5) and conservatism: still positive
2. **Method 1 / Electric** (WBT, useful-energy basis):
   - Same project, η_b expressed per fuel via PAA Eq. 1
3. **Method 3 / Electric** (KPT):
   - Same project, with `baseline_kpt_rows` carrying EC_b,KPT_i values derived
     from SC_b_j × meals/day × days
