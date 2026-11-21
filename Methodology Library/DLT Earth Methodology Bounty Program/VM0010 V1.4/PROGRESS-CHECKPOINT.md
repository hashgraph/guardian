# VM0010 v1.4 — Progress Checkpoint

## Latest (this session)
- **Eqs (18)-(21) Processing energy grid/generator** (`logic/calculate-processing-energy-814.js`, `schemas/processing-energy-814.schema.json`): added Eq (18) Q_PROCESSING (reused), Eq (19) `E_PROCESSING = Q_PROCESSING * EF_ELECTRICITY` (grid), Eq (20) `PR_GENERATOR = Q_PROCESSING / T_GENERATOR`, Eq (21) `E_PROCESSING = FC_GENERATOR * T_GENERATOR * EF_FUEL` (generator) with branch validation (`energySource`, EF_ELECTRICITY, T_GENERATOR>0, FC_GENERATOR). Source: VM0010 v1.4 §8.1.4 pp.31-33 / `PHASE3-CALCULATION-SPEC.md` Eqs 18-21. New tests: `test/calculate-processing-energy-814-extended.test.mjs` (19 tests).
- **Artifact:** rebuilt `VM0010.policy` 55,895 bytes, 39 entries, 22 schemas, 10 systemSchemas. SHA-256: `1D80BBAD84D274D6F2EBFD95730EA1233DC1DA8CEB9BDD5413E3241E02DC13D`.
- **Tests:** `node --test (Get-ChildItem -Path "test" -Filter "*.test.mjs" | ForEach-Object { $_.FullName })` → **253 pass, 0 fail, 0 skip**.

## Completed and Tested Features

- **Equation (16) Log Hauling Emissions** (`calculate-hauling-fuel-814.js`): aligned to `hauling-fuel-814.schema.json` with `haulingFuelEmissions` and `haulingFuelDetails`. 10 focused tests pass.
- **Equations (17)-(19 transport fuel module)** (`calculate-transport-fuel-814.js`): aligned to `transport-fuel-814.schema.json` with `nTrucksTransport`, `kmTransportTotal`, `eTransportTco2e`, `transportDetails`.
- **Equations (14)-(15), (18)-(21) Processing/harvesting/grid/generator** (`calculate-processing-energy-814.js`): Eqs 14-15 `qProcessingKwh`, `eHarvestTco2e`, `processingDetails`; Eqs 18-21 `qProcessingKwhEq18`, `eProcessingGridTco2e`, `prGeneratorKw`, `eProcessingGeneratorTco2e`, `energySource`.
- **Equation (48) Fuel Factors** (`calculate-fuel-factors.js`): emits `efFuelGhg`, `efTotal`, `fuelFactorsDetails`. Gas labels validated (CO2, CH4, N2O only). 11 focused tests pass.
- **Equation (33) Fire Methane + Eq (34) Baseline Biomass** (`calculate-project-stocks-821.js`): Eq (33) integrates Eq (34) B_i,t|PRJ. 16 focused tests pass.
- **Equations (40)-(41) Net Benefits** (`calculate-net-benefits-84.js`): Eq (40) applies LF_ME and U_total; Eq (41) applies U_total only. 10 focused tests pass.
- **Equations (43)-(46) Buffer & VCU Arithmetic** (`calculate-vcus-86.js`): Eq (43)-(46) with C_NET|BSL,t* distinct from DC_NET|BSL,t* where required. 14 focused tests pass.
- **Equation (42) Combined Uncertainty** (`calculate-uncertainty-85.js`): `U_total = SQRT(U_PRJ^2 + U_BSL^2)`. 10 focused tests pass.
- **A02 Biomass Factor Construction** (`calculate-biomass-factors.js`): `BCEF_R = BEF_R * D`. 10 focused tests pass.
- **Equation (1) Plot Merchantable Volume** (`calculate-plot-volume-811.js`): Eq (1)-(2). 14 focused tests pass.
- **Schema validation / Project Hub / Unit conversion**: all passing in full suite.

## Current Test Results

```
tests 253
suites 0
pass 253
fail 0
cancelled 0
skipped 0
todo 0
```

## Runtime Blockers (unchanged)

- Guardian runtime integration blocked (no reachable auth/import path, no credentials/DID-bearing profiles, no live Hedera). Cannot import policy or run end-to-end synthetic workflows / verify Project Hub delivery.

## Outstanding Offline Deliverables

1. Continue implementing remaining K-ready equations from `PHASE3-CALCULATION-SPEC.md` with independent tests (e.g. other 8.1.4/processing variants where fully specified).
2. Update acceptance/submission docs for newly implemented equations and coverage.
3. Maintain synthetic/independent fixtures and provenance notes for all implemented kernels.

## Items Requiring Live Guardian Environment (Cannot Be Completed Offline)

1. Authenticated policy import/preview and UI verification.
2. End-to-end synthetic workflow execution, role transitions, schema validation in runtime.
3. Project Hub transformation delivery verification.

## HOLD Items (Unresolved Methodology)

Remaining equations and B01-B12 items per `PHASE3-CALCULATION-SPEC.md` / `ACCEPTANCE-MATRIX.md` require Verra/VVB clarification or are not fully specified; do not invent.
