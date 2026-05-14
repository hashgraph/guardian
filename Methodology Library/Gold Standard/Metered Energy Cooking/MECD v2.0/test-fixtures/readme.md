# Realistic test fixtures — ATEC GS11817

Three end-to-end ER fixtures built from a Gold Standard project that was
independently verified by Earthood under MECD v1.2: ATEC's electric induction
cookstove programme in Bangladesh (PoA GS11815, VPA02, project GS11817).

The point of these fixtures is to give any reviewer — Gold Standard, a VVB,
a Guardian maintainer, a researcher — a defensible way to confirm the v2.0
policy mints credits correctly on real-world inputs.

## Headline numbers

Running each fixture through the policy's `pp_er_calcs` block:

| Method | BE (tCO2e) | AE (tCO2e) | LE (tCO2e) | ER (tCO2e) | Per-stove ER (tCO2e/yr) |
|---|---:|---:|---:|---:|---:|
| **M1 (WBT)** |  503 | 224 | 31 |  248 | 0.165 |
| **M2 (CCT)** | 1497 | 224 | 51 | 1221 | **0.814** |
| **M3 (KPT)** | 2222 | 224 | 65 | 1932 | 1.288 |

(1500 stoves over the 2024 calendar year. Baseline mix: 80% wood, 11% NG, 9% LPG.)

The M2 number — 0.814 tCO2e/stove/yr — matches Earthood's verified v1.2 ER
for the same project (0.815) to three decimals. M1 is more conservative
because WBT credits only useful energy. M3 captures more because KPT measures
fuel-input mass directly. All three are valid PAA quantification paths; the
differences are methodological, not bugs.

## Files

- `parameter-map.md` — cell-by-cell trail from ATEC's verified Excel ER tool to v2.0 fields. Every number has a citation.
- `atec-gs11817-m1-electric.json` — Method 1 (WBT) ER credentialSubject.
- `atec-gs11817-m2-electric.json` — Method 2 (CCT). Closest mirror of v1.2.
- `atec-gs11817-m3-electric.json` — Method 3 (KPT).
- `run-fixture.js` — Node helper to execute a fixture against the calc locally.

## Run a fixture (no Guardian instance needed)

The policy's `pp_er_calcs` block is plain JavaScript. Extract it from
`MECD-v2.0.policy` (unzip → open `policy.json` → find the block whose tag is
`pp_er_calcs` → grab its `expression` field) and save it to a `.js` file. Then:

```bash
node run-fixture.js path/to/pp_er_calcs.js atec-gs11817-m2-electric.json
```

Expected output:

```
Method:     method_2_cct
Period:     2024-01-01 → 2024-12-31
Devices:    1500
-----------
BE_unadj_y = 1496.5581835 tCO2e
BE_y       = 1496.5581835 tCO2e
AE_y       = 224.1466533  tCO2e
LE_y       = 50.9482306   tCO2e
-----------
ER_y       = 1221.4632995 tCO2e
per-stove  = 0.8143 tCO2e/stove/yr
```

## Run a fixture inside Guardian (full workflow)

1. Import `../MECD-v2.0.policy` and publish to testnet.
2. Register a Project Proponent and submit a PDD with the ATEC parameters
   from `parameter-map.md`. Use `../test-curls/01-pdd.txt` as a request template.
3. Have the VVB approve the PDD.
4. Submit the monitoring report by sending one of the fixture JSONs as the
   ER block payload (use `../test-curls/02-er-method-2-electricity.txt` as
   the request shape, swap its `document` body for the fixture body).
5. The verification step closes the loop. Mint produces the ER tCO2e from
   the table above as VER tokens.

## Why these fixtures, when the test-curls already exist?

The team's curls in `../test-curls/` exercise schema and workflow plumbing
but use placeholder physical parameters (notably extreme upstream emission
factors), so they return zero or negative ER. They're a smoke test for the
data-flow, not a proof of crediting. These fixtures fill that gap — every
parameter is sourced from a real, GS-approved, VVB-verified deployment.

## Differences from ATEC v1.2 verified

The fixtures match ATEC's verified v1.2 per-stove ER to ~0.1% on Method 2.
Tiny remaining differences come from v2.0-only parameters not present in v1.2:

| Parameter | v1.2 | v2.0 default used here |
|---|---|---|
| UEF (upstream EF) | not modelled | Wood 1.5, NG 8, LPG 6 tCO2e/TJ |
| Embodied leakage (deployment year) | not modelled | 0.017 tCO2e × N_disseminated |
| Market leakage option | 0% (Option 1, justified) | 2% default |
| DAF | not applied | not applied here (kept off for like-for-like) |
| BAU ceiling | n/a | not applied (no NDC ceiling for ATEC) |

## Calculator quirks worth knowing about

These came up while building the fixtures and don't block credit issuance,
but they matter if you change the fixture inputs:

1. **`EGp_d_y` units**: when `no_of_days_per_year` is set, the BE-side path
   in `pp_er_calcs` divides by 1000 and multiplies by days (treating EGp_d_y
   as kWh/day), while the AE-side reads it as-is (annual MWh). The fixtures
   omit `no_of_days_per_year` and supply EGp_d_y as total annual MWh so both
   paths agree.
2. **M3 + Electricity AE**: when no explicit `ef_p_kpt` is supplied, the
   calc falls back to `EFel_y` (tCO2e/MWh), producing wrong units. The M3
   fixture supplies `ef_p_kpt = 126.36 tCO2e/TJ_input` explicitly.
