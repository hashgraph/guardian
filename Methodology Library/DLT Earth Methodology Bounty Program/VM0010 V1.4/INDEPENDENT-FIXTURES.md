# VM0010 v1.4 — Independent Fixtures & Test Instructions

**Purpose:** Consolidated, independently hand-computed expected values for every implemented VM0010 equation, plus how to run the offline suite. All values below are reproduced by the committed tests against the actual logic modules — they are not manufactured.

**Suite command (from the VM0010 V1.4 folder):**
```
node --test test/*.test.mjs
```
Zero dependencies (Node standard library only). No `package.json`, no `node_modules`, no workspace install.
Expected: `233 tests, 232 pass, 0 fail, 1 skip`. The skip is the optional AJV cross-check (`ajv` declared in `common/`/`interfaces/` but not installed).

## How to verify each equation

Each equation has a dedicated `test/calculate-<name>.test.mjs` that runs the actual `logic/calculate-<name>.js` Guardian customLogicBlock expression directly (stubbed `documents`/`done`), with independent hand-computed fixtures and rejection cases.

| Eq | Section | Logic file | Independent fixture (input → expected) | Test file |
|----|---------|------------|----------------------------------------|-----------|
| (1) | §8.1.1 p.19 | `calculate-plot-volume-811.js` | tree volumes 2,3,5 m³ → 10 m³ per plot | `test/calculate-plot-volume-811.test.mjs` |
| (2) | §8.1.1 p.20 | `calculate-plot-volume-811.js` | densities 20,30 m³ over 0.5,1 ha → (20+30)/2 = 25 m³/ha (not 40/1.5) | `test/calculate-plot-volume-811.test.mjs` |
| (3) | §8.1.1 p.20 | `calculate-carbon-stocks-811.js` | (30+2)×1.43×0.47 = 21.5072 tC/ha | `test/calculate-carbon-stocks-811.test.mjs` |
| (4) | §8.1.1 p.21 | `calculate-carbon-stocks-811.js` | (30+2)×0.6×0.47 = 9.024 tC/ha | `test/calculate-carbon-stocks-811.test.mjs` |
| (5) | §8.1.2 p.22 | `calculate-deadwood-812.js` | 30−10+2+3 = 25 tC/ha | `test/calculate-deadwood-812.test.mjs` |
| (6) | §8.1.2 p.23 | `calculate-rsd-812.js` | 9.024×1.74 = 15.70176 tC/ha | `test/calculate-rsd-812.test.mjs` |
| (7) | §8.1.2 p.23 | `calculate-infra-812.js` | 5×1.43×0.47 = 3.3605 tC/ha | `test/calculate-infra-812.test.mjs` |
| (8) | §8.1.3 p.24 | `calculate-extracted-813.js` | 9.024+4.5 = 13.524 tC/ha | `test/calculate-extracted-813.test.mjs` |
| (11) | §8.1.3 p.26 | `calculate-woodproducts-813.js` | aggregate retained × OF over classes (literal sum, no decay) | `test/calculate-woodproducts-813.test.mjs` |
| (12) | §8.1.4 p.26 | `calculate-c-fuel.js` | 0.32+0.5+0.625+1.5 = 2.945 tCO2e (plain sum, no 44/12) | `test/calculate-c-fuel.test.mjs` |
| (33) | §8.1.4 p.42 | `calculate-project-stocks-821.js` (Eq 33/34) | area 2 ha, B=50 t.d.m./ha, COMF 0.5, CH4 EF 6 g/kg, GWP 21 → 6.3 tCO2e | `test/calculate-project-stocks-821.test.mjs` |
| (34) | pp.42-43 | `calculate-project-stocks-821.js` | volumes 10,5 m³/ha, BCEF 1.2 → 18 t dry matter/ha | `test/calculate-project-stocks-821.test.mjs` |
| (40) | §8.4 p.49 | `calculate-net-benefits-84.js` | C_FUEL=20, BSL=−100, PRJ=−10, LF=0.4, U=0.2 → (110)×0.6×0.8 = 52.8 tCO2e | `test/calculate-net-benefits-84.test.mjs` |
| (41) | §8.4 p.50 | `calculate-net-benefits-84.js` | PRJ=100, BSL=20, U=0.2 (NO LF) → (100−20)×0.8 = 64 tCO2e | `test/calculate-net-benefits-84.test.mjs` |
| (42) | §8.4 p.51 | `calculate-uncertainty-85.js` | U_PRJ=0.12, U_BSL=0.16 → √(0.12²+0.16²) = 0.20 | `test/calculate-uncertainty-85.test.mjs` |
| (43) | §8.4 pp.51-52 | `calculate-vcus-86.js` | PRJ=100, BSL=20, NPR=0.20 → (100−20)×0.20 = 16 tCO2e | `test/calculate-vcus-86.test.mjs` |
| (44) | §8.4 p.52 | `calculate-vcus-86.js` | PRJ=−10, BSL=−100, NPR=0.20 → (−10−(−100))×0.20 = 18 tCO2e | `test/calculate-vcus-86.test.mjs` |
| (44) rev.| §8.4 p.52 | `calculate-vcus-86.js` | PRJ=−100, BSL=−10, NPR=0.20 → −18 tCO2e (negative buffer = review case, not clamped) | `test/calculate-vcus-86.test.mjs` |
| (45) | §8.4 p.52 | `calculate-vcus-86.js` | CR=64, Bu_CR=16 → 64−16 = 48 tCO2e | `test/calculate-vcus-86.test.mjs` |
| (46) | §8.4 p.52 | `calculate-vcus-86.js` | ER=52.8, Bu_ER=18 → 52.8−18 = 34.8 tCO2e | `test/calculate-vcus-86.test.mjs` |
| (47) | App.1 p.87 | `calculate-non-co2-emission-factor.js` | CH4 0.01×20 + N2O 0.001×100 = 0.3 tCO2e/activity (GWPs are test inputs only) | `test/calculate-non-co2-emission-factor.test.mjs` |
| (48) | App.2 p.88 | `calculate-c-fuel.js` / `calculate-fuel-factors.js` | EF 74100 kg/TJ × 0.000043 TJ/kg × 840 kg/kL /1000 = 2.676492 tCO2/kL | `test/calculate-c-fuel.test.mjs`; `test/calculate-fuel-factors.test.mjs` |
| A01 | pp.54-55 | `calculate-infrastructure-inputs.js` | cleared 100, F=0.6 → 60 / 40 | `test/calculate-infrastructure-inputs.test.mjs` |
| A02 | p.68 | `calculate-biomass-factors.js` | BEF 1.5 × D 0.6 → 0.9 t dry matter/m³ | `test/calculate-biomass-factors.test.mjs` |
| A03 | App.1+2 | `calculate-fuel-factors.js` | CO2 2 + non-CO2 0.3 → 2.3 tCO2e/kL | `test/calculate-fuel-factors.test.mjs` |

## Synthetic project fixture (labeled)

A single labeled project description used across schema and regression tests (`test/schema-validation.test.mjs`, `fixtures()`):

- Project: "Schema Test Forest", monitoringYear 2026
- Strata: species 1 / stratum 1, vEx 30, vExInf 2, bcefR 1.43, dJ 0.6, cfJ 0.47
- Infrastructure biomass: species 1 / stratum 1, vNotExInf 5, bcefR 1.43, cfJ 0.47
- Residual stand damage: species 1 / stratum 1, cEx 9.024, fRsd 1.74
- Fuel inputs: Diesel / E_HARVEST, ipccEF 74100, heatingValue 0.043, density 840, consumptionKl 120
- Dead wood: cHb 21.5072, cEx 9.024, cRsd 0.5, cNotHbInf 0.3
- Wood products: stratum 1 / parcel 1, cWp 10, classes sawnwood (OF 0.39) + woodbasePanels (OF 0.62)

This fixture validates against `project-description.schema.json` and every output schema it feeds.

## C_NET|BSL,t* vs DC_NET|BSL,t*

Eq (41) uses `DC_NET|BSL,t*` (dcNetBsl). Eqs (43)-(44) use `C_NET|BSL,t*` (cNetBsl). These are distinct variables per `PHASE3-CALCULATION-SPEC.md` line 412: the source "omits delta on baseline" for the buffer formulas and defines `C_NET|BSL,t*` as "a net stock change, not an absolute standing stock." Both inputs are supplied separately; neither is silently aliased. Documented in `README-slice.md` §"Eq (40)-(46) — C_NET vs DC_NET Distinction".

## What is NOT verified offline (blockers)

- Guardian runtime integration: `VM0010.policy` cannot be imported (`http://127.0.0.1:3000/api/v1/policies` returns 502; Docker read-only error; port 5006 not exposed; import permissions not granted). See `E2E-TEST-PROCURE.md` and `PROGRESS-CHECKPOINT.md` §"Runtime Blockers".
- B12 (VM0050 export, VCS5/joint CCB templates, Project Hub acceptance environment): external to this slice; blocks final integration/acceptance, not the independent kernels.
- Real-case validation, step-by-step screenshots and demo (T12): require the Guardian runtime above.

## Rejection (sanity) boundaries covered by tests

All calculation modules reject: missing/undefined/NaN/Infinity required numbers, out-of-range indices (species/stratum 1..3), negative volumes, CF_j > 1, BCEF_R ≤ 0, LF/U/NPR outside [0,1], zero-area divisors, duplicate plot IDs, empty required arrays, and unknown emission-source enums. Negative buffer results (Eq 44 reversed) are preserved as review cases, never clamped.
