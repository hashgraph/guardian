# SMEC v4.0 test fixtures

Eleven synthetic fixtures exercising every branch of the SMEC Eq. 1-18
engine: both baseline options, the 90/10 precision fork both ways, the
absolute consumption cap, both leakage amortization branches, all three
Hawthorne options (phased default, SUMs-derived, dMRV exemption), charcoal
constants, multi scenario-pair aggregation, and the HE=1.0 boundary.

Each fixture carries its expected `emission_reduction` output under
`_provenance.expected_emission_reduction`; `run-fixture.js` diffs the
computed output against it byte-for-byte.

## Running

```
node run-fixture.js ./pp_er_calcs.js ./T1_optB_shortlived_2026.json
```

`pp_er_calcs.js` is the `expression` field of the `pp_er_calcs`
customLogicBlock, extracted from the policy zip's `policy.json`. No Guardian
instance, network, or credentials are needed.

## Headline numbers

| Fixture | Scenario | BE_y (tCO2e) | AE_y | LE_y | HE | ER_y |
|---|---|---:|---:|---:|---:|---:|
| `T10_durable_y6.json` | Durable stove, crediting year 6 (embodied leakage zero), vintage 2031 | 2,606.35 | 1,761.28 | 16.90 | 0.75 | 616.90 |
| `T11_sums_equal.json` | SUMs boundary PTC_m=PTC_KPT (HE=1.0), vintage 2027 | 2,606.35 | 1,761.28 | 16.90 | 1.0 | 828.17 |
| `T1_optB_shortlived_2026.json` | Option B wood MSL default, short-lived stove (embodied leakage upfront), vintage 2026 | 2,606.35 | 1,761.28 | 33.90 | 0.9 | 726.67 |
| `T2_durable_amort_y1.json` | Durable stove (7y), embodied leakage amortized, crediting year 1, vintage 2026 | 2,606.35 | 1,761.28 | 20.30 | 0.9 | 740.27 |
| `T3_sums_he.json` | SUMs-derived Hawthorne (Eq.18, PTC_m/PTC_KPT=2.4/2.7), vintage 2027 | 2,548.43 | 1,761.28 | 15.74 | 0.8888888888888888 | 683.95 |
| `T4_dmrv_exempt.json` | dMRV exemption (HE=1.0), vintage 2031, DAF 0.20 | 2,316.76 | 1,761.28 | 11.11 | 1.0 | 544.37 |
| `T5_charcoal_optB.json` | Option B charcoal (MSL 0.13, fNRB 1.0, NCV 0.0295) | 1,403.48 | 1,060.66 | 20.46 | 0.9 | 288.08 |
| `T6_optA_precision_met.json` | Option A, 90/10 met (uses P_b,mean=2.0) | 2,438.69 | 1,761.28 | 13.55 | 0.9 | 596.12 |
| `T7_optA_unmet_lb90.json` | Option A, 90/10 unmet (uses P_b,LB90=1.7, conservative) | 2,072.89 | 1,761.28 | 6.23 | 0.9 | 274.22 |
| `T8_cap_triggered.json` | Option A, cap triggered (P_b,mean=9.0 capped to 1.25*4.0=5.0); threshold QA flags set | 6,096.73 | 1,761.28 | 86.71 | 0.9 | 3,815.20 |
| `T9_multi_pair.json` | Two baseline + two activity scenario pairs aggregated | 3,676.59 | 2,449.74 | 24.54 | 0.9 | 1,079.63 |

Fixture constants are synthetic IPCC-2006-ballpark values (wood: NCV 0.0156
TJ/t, EF_CO2 112 tCO2/TJ, fNRB 0.80; charcoal: NCV 0.0295 TJ/t, fNRB 1.00).
They exist to verify the engine, not to model a real project.
