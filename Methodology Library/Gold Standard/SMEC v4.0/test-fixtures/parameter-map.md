# SMEC v4.0 parameter map

SMEC v4.0 defines 23 monitored/ex-ante parameters (sec 12 tables). Mapping to
policy schemas and engine inputs:

| SMEC # | Parameter | Schema / field | Engine input |
|---|---|---|---|
| 1 | Technology type + rated efficiency (ISO 19867-1 / WBT) | SMEC Device GS: `stove_model`, `thermal_efficiency_pct`, `efficiency_test_ref` | activity pair efficiency context |
| 2 | Baseline scenario identification | SMEC Baseline Emissions GS: `baseline_scenario_id` | baseline pair identity |
| 3 | Activity scenario identification | SMEC Project Emissions GS: `activity_scenario_id` | activity pair identity |
| 4 | Indoor air pollution | SMEC IAP Assessment GS | not in ER math |
| 5 | Target population / suppressed demand evidence | SMEC Baseline Emissions GS: `suppressed_demand_evidence` | eligibility gate |
| 6 | Expected technical life | SMEC Device GS: `expected_technical_life_yrs` | `er_inputs.techLifetimeYrs` |
| 7 | Baseline Scenario Survey (fuel mix, stacking) | SMEC Baseline Emissions GS: `baseline_survey_ref` | pair construction |
| 11 | NCV of baseline/activity fuel | per-pair `ncv` | `pairs[*].ncv` |
| 12 | MSL per-capita defaults (0.50 wood / 0.13 charcoal) | engine constant `MSL` | Option B |
| 13 | fNRB (dynamic) | per-pair `fnrb`; Dynamic fNRB Update GS | `pairs[*].fnrb` |
| 14 | EF_CO2 / EF_non-CO2 | per-pair `ef_co2`, `ef_nonco2` | `pairs[*]` |
| 15 | DAF (downward adjustment factor) | ER Document `er_inputs.daf` | `er_inputs.daf` |
| 16 | End-user notification + carbon title waiver | SMEC End-User Notification GS | not in ER math |
| 17 | N_p,y operational stoves (annual survey) | SMEC Usage Survey Row GS | `pairs[*].n_stoves` |
| 18 | U_p,y usage rate (cohort-sampled) | SMEC Usage Survey Row GS: `usage_rate_cohort` | `pairs[*].usage` |
| 19 | HN_p,y household size | SMEC Usage Survey Row GS: `hn_p_y` | context |
| 20 | P_p,mean,y (biennial P-KPT) | SMEC Project Emissions GS: `pp_mean_y` / `pp_ub90_y` | `pairs[*].p_fuel` (pre-adjusted) |
| 21 | Leakage inputs | Leakage Emissions GS; EM_EF default 0.017 | `er_inputs.newUnits`, `emef` |
| 22 | Deduction chain | Emission Reductions GS + Deduction Chain GS | engine outputs |
| 23 | Hawthorne effect | SMEC Hawthorne Adjustment GS | `er_inputs.heMode`, `ptcM`, `ptcKPT`, `dmrvExempt` |

Note: SMEC numbers its monitored-parameter tables with some merges/splits vs
MECD; the `er_inputs` object is the single calculation input surface and is
populated from the sub-records above.
