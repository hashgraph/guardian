# VM0010 v1.4 - Phase 3 calculation specification

Prepared 25 October 2026 for Guardian issue #5941. Repository: `C:\Users\User\Desktop\Engineering-Hub-Challenges\guardian`; branch `develop`; HEAD `089c1169872f9a2b1e2bcd9cee5b473ba63e1fb0`.

This is a specification, not a completed methodology implementation or an approval to issue credits. It records **all 48 numbered VM0010 equations**, additional unnumbered rules, alternative pathways, numerical checks and unresolved interpretations. Existing calculation code is unchanged. Use this document together with `FREE-ROUTER-HANDOFF.md`.

## 1. Authoritative sources and precedence

Printed methodology page numbers are used below, not PDF viewer offsets. The base PDF has 93 pages; its printed page numbers match its one-based PDF pages. Correction-document page numbers are separate.

| ID | Source read | SHA-256 of downloaded PDF |
|---|---|---|
| S1 | [VM0010 v1.4, 24 October 2024, 93 pages](https://verra.org/wp-content/uploads/2024/10/VM0010_IFM_LtPF_v1.4_Clean_10282024.pdf) | `4dccbb079f96d045855f462ccf6cec36a7f1a5b4875bac9965d66f743dca5153` |
| S2 | [Correction to VM0010 v1.2-v1.4, published 18 September 2025, updated 11 June 2026, 2 pages](https://verra.org/wp-content/uploads/2026/09/VM0010_v1.2-1.4_Correction_06112026.pdf) | `a0f243dd17ebedf37381f8c26aaecb3d8af925a8e18dbaaeee5c1d3dfa7b1d29` |
| S3 | [Corrections and Clarifications to VM0010 v1.3/v1.4, 4 September 2026, 7 pages](https://verra.org/wp-content/uploads/2026/09/VM0010_v1.3-1.4_Corrections_and_Clarifications_09042026.pdf) | `36bb4726a5947a90247ebdfc9c11146fc71d1c04ad0c087c77cec4ec9853b060` |
| S4 | [VT0001 v3.0, 1 February 2012, 13 pages](https://verra.org/wp-content/uploads/imported/methodologies/VT0001v3.0.pdf) | `ee0d8b00b772208b112d4b20b43613a80b8d10404813c3273086d90b3963ddc8` |

[Verra's VM0010 landing page](https://verra.org/methodologies/vm0010-methodology-for-improved-forest-management-conversion-from-logged-to-protected-forest-v1-4/) explicitly requires both S2 and S3. The [VT0001 landing page](https://verra.org/methodologies/vt0001-tool-for-the-demonstration-and-assessment-of-additionality-in-vcs-agriculture-forestry-and-other-land-use-afolu-project-activities-v3-0/) identifies v3.0 as active at this review. Recheck versions when submitting; do not infer new requirements from a different methodology version.

The PDFs were downloaded and extracted page-by-page using `pypdf` layout extraction and Unicode NFKC normalization. Formula transcription below uses explicit ASCII operators and named sums. Extraction alone cannot resolve an ambiguous summation, missing definition, or deletion markup. Correction prose determines deleted terms; source defects are preserved and flagged, rather than silently repaired. Research copies/extractions are in `C:\Users\User\AppData\Local\Temp\guardian-vm0010-phase3-20261025T110607`; the public links and hashes are the reproducible source record.

### Applicable corrections

| Source/item | Operational effect |
|---|---|
| S2 correction 1, pp.1-2 | Removes the obsolete crediting-period averaging and multiplication-by-elapsed-time instruction in S1 section 8.1. Do not restore an average-baseline shortcut. Apply annual decay/accounting equations. Previously issued excess VCUs need the documented cancellation/replacement process; this is a separate reconciliation workflow. |
| S3 clarification 1, pp.2-3 | Identifies IFM/logged-to-protected-forest, project-method baseline/additionality, and both reductions and removals. |
| S3 correction 1, p.3 | Removes the blanket geographic exclusion where VM0045 is applicable. Other section 4 exclusions remain. |
| S3 correction 2, p.4 | Baselines must be reassessed under the applicable VCS Standard; the reassessed baseline applies to the new validity period. Baseline versions must be effective-dated. |
| S3 correction 3, p.4 | Equation (12) is the plain sum of four tCO2e terms. Remove the original `44/12` denominator. `C_FUEL` is tCO2e, not tC. |
| S3 clarification 2, p.5 | Equation (26) is not restricted to the first ten project years. It does not resolve the repeated indices or regrowth time-basis questions identified below. |
| S3 correction 4, pp.5-6 | Adds `A_i` to Equation (37) **for v1.3 only**. Do not treat it as a newly required extra multiplier in v1.4, whose denominator already prints an area factor. |
| S3 correction 5, p.6 | Equation (37)'s `C_FUEL` unit is tCO2e. |
| S3 correction 6, pp.6-7 | Corrects grouping and the missing delta in (40)/(41), and specifies the baseline input as tCO2e. Use the corrected expressions below. It does not reconcile annual versus cumulative operands. |

## 2. Conventions, validation and provenance contracts

`SUM_j`, `SUM_{i,p}`, etc. mean the indicated finite sums. `BSL` and `PRJ` distinguish scenarios. `DC` means the source's delta-C, not a new parameter. `a`, `b` in tests are not implied defaults. Tree/species/stratum/parcel identifiers must support arbitrary finite counts `L/J/M/P`; the notation `1,2,3,...` does **not** impose a maximum of three. Do not spread the legacy slice's hard-coded three-species/strata limit into new modules.

Every test value below is a **synthetic arithmetic fixture**, unless explicitly identified as a source table entry. Fixtures are not project defaults, approved emission factors, approved GWPs, or evidence of additionality. Decimal expected results must be checked independently with an appropriate floating-point tolerance. Blocked equations have diagnostic arithmetic and rejection tests, not approved crediting results.

Shared implementation requirements:

- Reject missing, non-numeric, NaN and infinite required numbers. Missing observations are not zero. Zero is allowed only where the physical quantity and selected pathway permit it.
- Areas and divisors must be positive when used in division. Volumes, biomass and gross emission quantities are non-negative; signed stock changes/net benefits are allowed. Do not clamp negative net benefits or buffer results without an approved issuance rule.
- A physical fraction has a declared representation; internally use fractions, with explicit conversion from percent. `CF_j` is in `(0,1]`; `BCEF_R`, wood density and GWPs are positive and are not bounded above by one. `F_RSD` is non-negative and is not a mass fraction.
- Keep tC, tCO2e, t dry matter, per-ha stocks, annual rates and period totals as distinct fields/types. Carbon-to-CO2 conversion is `44/12` exactly once where specified; do not apply it to an existing tCO2e quantity.
- Validate unique record keys, scope, period, baseline version and provenance before joining calculations. A repeated parcel/species/event must not be silently counted twice. Numerical fixtures for a kernel do not resolve an upstream provenance gap.
- Future module names below are proposed destinations under `logic/`; they do not authorize changes to existing working modules. Each new module needs an output schema and a matching `test/<module-stem>.test.mjs`.

### Input-source catalog

Ledger references to these contracts incorporate their sources, units and selection rules.

| Contract | Inputs and authoritative provenance |
|---|---|
| P1 Inventory/volumes | `V_l,j,i,sp` [m3]: S1 pp.18-20, 62-63; measured tree dimensions, applicable local volume equations/yield tables, then appropriate regional/national/default equations. `A_sp` [ha]: pp.73-74, archived plot delineation. Existing inventory age/validation and sampling requirements are on pp.18-19. Equation applicability includes volume-model `r2 > 0.5`, significant `p < 0.05`, and field verification; do not substitute these thresholds for biomass-allometry thresholds. |
| P2 Harvest plan and areas | `V_EX,j,i` [m3/ha]: pp.15-16, 20, 71, allowable harvest from inventory under legal limits. Infrastructure volumes: pp.54-55. `A_i`, `A_i,p`, cumulative and age-cohort areas [ha]: pp.72-73, 79-80, approved plan/GIS/legal records. Parcel harvest dates, species, diameters and product categories: section 6.2, pp.13-16. Never infer allowable extraction from inventory volume alone. |
| P3 Biomass/carbon factors | `CF_j` [tC/t dry matter]: p.63, explicit default 0.5 or sourced species literature, used consistently wherever that species factor applies. `D_j` [t dry matter/m3]: pp.63-64, national species/group values, suitable neighboring-country values, then global values; regional representativeness matters. `BCEF_R` [t dry matter/m3]: pp.67-68, local, national/ecoregional, comparable neighboring, then global factors; minimum DBH must match the harvest plan (p.20). `BCEF_R = BEF_R * D` is permitted only with the local applicability/correlation safeguards on p.68. |
| P4 Damage/products | `F_RSD`: pp.55-56, suitable peer-reviewed evidence. Source examples are 1.74 Congo, 2.30 Malaysia, 2.78 Belize, 3.10 Bolivia, 2.40 southern Amazonia, each with its stated context/log length. Product class selection and volume percentages: pp.15,24. Class carbon `C_EX,i,k` is defined on p.25 but its automatic conversion from aggregate volume shares is not specified. `WW`, `SLF`, `OF`: pp.69-70, tables reproduced in section 5 below. |
| P5 Fuel/electricity | Equipment, rates and fuel choices: pp.27-33, 53-62. Historical agent records apply when the historical pathway is supported; otherwise common-practice evidence applies. Harvest/haul EFs reference IPCC 2006 vol.2 ch.3 table 3.3.1; road transport references ch.3 tables 3.2.1-2; generator references vol.2 ch.2 table 2.5. Electricity EF: country-specific IEA evidence, p.32 and p.60. Appendices 3-5 supply conditional examples, not a universal selection rule. |
| P6 Regrowth/allometry | `RGR_i` [tC/ha/year]: pp.70-71, reference-area chronosequence, published same-region/forest-type post-harvest growth, or applicable IPCC default converted to the required unit with evidence. `f_j` [t dry matter/tree]: pp.38-39,64-67; fitted dataset >=30 trees, statistically significant regression, `r2 >= 0.8`, applicable variables/domain, prescribed field validation. Forest-type models generally cannot be mixed with species models; growth-form exceptions are noted on p.65. |
| P7 Disturbance/illegal logging | Burnt/disturbed areas: pp.42-45,75-78; delineation from geodetic/remote-sensing evidence; ex-ante regional historic incidence. `G_CH4,i` [g/kg burnt dry matter]: p.68, applicable IPCC 2006 vol.4 ch.2 table 2.5, updated when required. `COMF_i` is defined on p.42 but has no standalone numeric parameter row in section 9.1; see B06. Illegal-logging PRA, penetration buffer, sample plots and stump observations: pp.44-46,74-78. |
| P8 Leakage | `PMP_i` [%]: p.79, summed merchantable biomass (source describes trees >=15 cm DBH) divided by summed total aboveground tree biomass. `PML_FT` [%]: pp.70-71, forest types where displacement is relevant, prioritized published sources, government data, then field measurements; use wood density to convert volume data, not volume ratios as biomass ratios. Project stratum area weights: p.49. |
| P9 Uncertainty/risk | `U_PRJ`, `U_BSL`: pp.50-51, quantified 95%-confidence uncertainty, pool-size weighting and justified propagation based on sampling or applicable IPCC uncertainty evidence. The methodology does not provide a universal component-weighting estimator. `NPR%`: pp.51-52, approved non-permanence risk assessment under the governing VCS rules, not an invented fixed buffer percentage. |
| P10 Gas identity/GWP | Gas-specific fuel EF, heating value and density: Appendix 2 p.88. CH4/N2O CO2-equivalent conversion: Appendix 1 p.87. Significance and exclusions: pp.11-12. Equation (33) prints methane GWP 21 on p.42; Appendix 1 supplies no numeric GWP set. A governing, versioned GWP decision is needed before production use; see B06. |

The section 9.1 `Equations` column contains stale/mismatched references: examples include `FC_HARVEST -> (14)` rather than body (13), `FC_HAULING -> (15)` rather than (14), and `f_j -> (17)` rather than (29). Index by the actual formula and parameter definition, not that column alone. `A_sp` points to (30), although per-area averaging is (31).

## 3. Complete numbered equation ledger

Readiness terminology: **K** = a deterministic kernel can be implemented/tested with validated explicit inputs; this is not permission to connect blocked inputs to issuance. **HOLD** = no general production implementation should select an interpretation. **LIMITED** = an unambiguous restricted/single-cohort case exists, but the general aggregation/time rule needs clarification. Existing implementations are explicitly identified.

### Equation (1) - plot merchantable volume

- **Source/formula/unit:** S1 p.19, `V_j,i,sp = SUM_{l=1..L} V_l,j,i,sp`; m3.
- **Inputs/source/dependencies:** individual tree merchantable volumes, P1; external validated tree-volume model precedes this sum. No preceding numbered equation.
- **Validation/conditions:** correct species/stratum/plot; selected-tree DBH/domain and inventory QA; no duplicate trees; finite non-negative volumes. Historical and common-practice pathways use the same arithmetic.
- **File/readiness:** `calculate-plot-volume-811.js`; K, new.
- **Independent test:** tree volumes 2,3,5 m3 -> 10 m3; another plot must not enter this sum.

### Equation (2) - mean merchantable volume per hectare

- **Source/formula/unit:** S1 p.20, `V_j,i|BSL = (1/SP) * SUM_sp(V_j,i,sp / A_sp)`; m3/ha.
- **Inputs/source/dependencies:** (1), plot areas/count, P1.
- **Validation/conditions:** `SP > 0`, each area >0; arithmetic mean of per-plot densities, not pooled volume divided by pooled area. Use the qualifying inventory/validation pathway on pp.18-19.
- **File/readiness:** `calculate-plot-volume-811.js`; K, new.
- **Independent test:** volumes 10,30 m3; areas 0.5,1 ha -> `(20+30)/2 = 25 m3/ha`, not `40/1.5`.

### Equation (3) - harvested biomass carbon

- **Source/formula/unit:** S1 pp.20-21, `C_HB,j,i|BSL = (V_EX,j,i|BSL + V_EX,INF,j,i|BSL) * BCEF_R * CF_j`; tC/ha.
- **Inputs/source/dependencies:** P2 approved extraction/infrastructure volumes and P3 factors; (1)/(2) support the plan but do not independently set allowable extraction.
- **Validation/conditions:** volumes >=0, BCEF >0 without upper cap, CF in `(0,1]`; factor applicability/DBH alignment. Explicit infrastructure inclusion/omission selection.
- **File/readiness:** existing `calculate-carbon-stocks-811.js`; preserve; K.
- **Independent test:** `(30+2)*1.43*0.47 = 21.5072 tC/ha`.

### Equation (4) - extracted timber carbon

- **Source/formula/unit:** S1 p.21, `C_EX,j,i|BSL = (V_EX,j,i|BSL + V_EX,INF,j,i|BSL) * D_j * CF_j`; tC/ha.
- **Inputs/source/dependencies:** P2 and P3, same approved volumes as (3).
- **Validation/conditions:** density >0, consistent species CF and volume boundaries; do not substitute BCEF for density or include unextracted infrastructure volume.
- **File/readiness:** existing `calculate-carbon-stocks-811.js`; preserve; K.
- **Independent test:** `(30+2)*0.6*0.47 = 9.024 tC/ha`.

### Equation (5) - logging slash

- **Source/formula/unit:** S1 p.22, `DC_DWSLASH,i,p|BSL = SUM_j(C_HB,j,i - C_EX,j,i + C_RSD,j,i + C_notHB,INF,j,i)`; tC/ha.
- **Inputs/source/dependencies:** (3),(4),(6),(7), P2/P4, for the relevant stratum/parcel harvest event.
- **Validation/conditions:** matching species/stratum/event and explicit absent infrastructure; retain the algebraic result and flag physically inconsistent negative slash. The source contains no `F_D` multiplier. Decay is applied downstream, not inside (5).
- **File/readiness:** existing `calculate-deadwood-812.js`; preserve; K. Do not propagate the legacy neutral `F_D=1` as a methodology parameter.
- **Independent test:** one species with 30,10,2,3 tC/ha -> `30-10+2+3 = 25 tC/ha`.

### Equation (6) - residual stand damage

- **Source/formula/unit:** S1 p.23, `C_RSD,j,i|BSL = C_EX,j,i|BSL * F_RSD|BSL`; tC/ha.
- **Inputs/source/dependencies:** (4), P4 literature/context-specific damage factor.
- **Validation/conditions:** factor >=0 and may exceed one; no unsupported regional default; prevent supplying both conflicting observed and derived damage.
- **File/readiness:** existing `calculate-rsd-812.js`; preserve; K.
- **Independent test:** `9.024*1.74 = 15.70176 tC/ha`; 1.74 is the source's Congo example, not a universal default.

### Equation (7) - biomass not extracted for infrastructure

- **Source/formula/unit:** S1 p.23, `C_notHB,INF,j,i|BSL = V_notEX,INF,j,i|BSL * BCEF_R * CF_j`; tC/ha.
- **Inputs/source/dependencies:** infrastructure volume from P2; factors P3. No `A_HB,j`/`aHbJ` input exists.
- **Validation/conditions:** volume >=0, BCEF >0 without cap at one, CF in `(0,1]`; volume partition comes from the approved plan.
- **File/readiness:** existing `calculate-infra-812.js`; preserve correction and standalone regressions; K.
- **Independent test:** `5*1.43*0.47 = 3.3605 tC/ha`; zero volume ->0. Existing output field `totalCNotHbInfTCo2eHa` has a misleading name: its schema/formula quantity is tC/ha, not tCO2e/ha. Do not silently convert it or rename it in this phase.

### Equation (8) - extracted carbon across species

- **Source/formula/unit:** S1 p.24, `C_EX,i|BSL = SUM_j C_EX,j,i|BSL`; tC/ha.
- **Inputs/source/dependencies:** (4), keyed by stratum; P2/P3.
- **Validation/conditions:** no mixing strata/years or area totals with densities; does not produce class-specific `C_EX,i,k`.
- **File/readiness:** existing `calculate-extracted-813.js`; preserve; K.
- **Independent test:** `9.024+4.5 = 13.524 tC/ha`.

### Equation (9) - immediate wood-product emissions

- **Source/formula/unit:** S1 p.25, `DC_WP0,i|BSL = SUM_k[C_EX,i,k|BSL * (WW_k + SLF_k)]`; tC/ha.
- **Inputs/source/dependencies:** class-specific carbon, P4; (4)/(8) provide the species/total carbon reconciliation, not an automatic class allocation. Section 6.2 plan supplies class volumes/fractions; see section 5.
- **Validation/conditions:** approved class-carbon provenance; class carbon reconciles to total extracted carbon; fractions in `[0,1]` and `WW+SLF <=1`; no default for missing `other` SLF. Preserve product-country/forest-context evidence.
- **File/readiness:** `calculate-woodproducts-immediate-813.js`; K **only with explicitly verified class-carbon inputs and sourced factors**; automatic volume-to-class-carbon adapter HOLD B01.
- **Independent test:** classes 20 and 10 tC/ha, WW 0.19, SLF 0.12 and 0.06 -> `20*0.31+10*0.25 = 8.7 tC/ha`. Missing class carbon or an active `other` row with no SLF must reject.

### Equation (10) - carbon entering longer-lived products

- **Source/formula/unit:** S1 p.25 literally prints `C_WP,i|BSL = SUM_k(C_EX,i,k|BSL - DC_WP0,i|BSL)`; tC/ha.
- **Inputs/source/dependencies:** class carbon and aggregate (9), P4.
- **Validation/conditions:** the subtracted term has no `k` index although it is inside the class sum. Do not silently replace it with class-specific losses or move it outside the sum.
- **File/readiness:** `calculate-woodproducts-retained-813.js`; HOLD B02 for multiple classes. Single-class algebra is unambiguous, but does not resolve the full-methodology requirement.
- **Independent diagnostic:** class carbon 20,10 and aggregate immediate loss 8.7 -> literal result `12.6`; subtracting aggregate loss once would give `21.3`. Neither may be silently selected as the approved multiclass production interpretation. Single class 10 with loss 3.1 ->6.9.

### Equation (11) - retirement between years 3 and 100

- **Source/formula/unit:** S1 p.26 literally prints `DC_WP100,i,p|BSL = SUM_k(C_WP,i|BSL * OF_k)`; tC/ha.
- **Inputs/source/dependencies:** (10), class/forest-region OF factors P4.
- **Validation/conditions:** `C_WP,i` lacks `k`; multiplying the same aggregate by every class OF can overcount. Do not invent class-specific retained carbon or normalize OF values to sum to one.
- **File/readiness:** existing `calculate-woodproducts-813.js`; preserve, but HOLD B02 for full multiclass integration.
- **Independent diagnostic:** aggregate retained carbon 10, boreal OF 0.39 and 0.62 -> literal result 10.1 tC/ha. Single class retained carbon 6.9, OF 0.39 ->2.691. These checks expose, rather than resolve, the class-index issue.

### Equation (12) - baseline fossil-fuel total, corrected

- **Source/formula/unit:** S1 pp.26-27 plus S3 correction 3 p.4: `C_FUEL = E_HARVEST + E_HAULING + E_TRANSPORT + E_PROCESSING`; tCO2e.
- **Inputs/source/dependencies:** (13),(14),(17), and exactly the applicable processing branch (19) or (21); P5/P10.
- **Validation/conditions:** same explicit accounting scope/time; no `44/12` divisor or multiplier. Baseline fossil sources may be explicitly conservatively omitted under pp.11-12,17,26. Omission is a decision with evidence, not a missing-data fallback.
- **File/readiness:** existing `calculate-c-fuel.js`; preserve; K. Extend with separate pathway modules rather than rewriting its existing arithmetic. Time interface to final credits remains B05.
- **Independent test:** `0.32+0.5+0.625+1.5 = 2.945 tCO2e`.

### Equation (13) - harvesting fuel emissions

- **Source/formula/unit:** S1 p.28, literal `E_HARVEST = FC_HARVEST * EF_FUEL * SUM_{j,i,p}(V_EX,j,i|BSL * A_i)`; tCO2e.
- **Inputs/source/dependencies:** harvest plan P2, rate `[kL/m3]`, fuel factor `[tCO2e/kL]`, P5/P10; (47)/(48) as applicable.
- **Validation/conditions:** lower consumption endpoint if a range has no justified selection; Appendix 4 is in L/m3 and needs conversion. The printed `p` sum has no parcel-indexed operand/area; general parcel aggregation is HOLD B03. A documented single-parcel case is unambiguous.
- **File/readiness:** `calculate-harvest-fuel-814.js`; LIMITED. A fuel-rate-times-explicit-volume kernel is safe, but do not invent the general parcel expansion.
- **Independent test:** one parcel, V_EX=10 m3/ha, area=10 ha, FC=0.00128 kL/m3, EF=2.5 ->0.32 tCO2e. A second parcel must not repeat the full stratum area automatically.

### Equation (14) - log hauling

- **Source/formula/unit:** S1 p.29, `E_HAULING = FC_HAULING * EF_FUEL * SUM_{j,i}(V_EX,j,i|BSL * A_i)`; tCO2e.
- **Inputs/source/dependencies:** P2, P5/P10; hauling rate kL/m3, factor tCO2e/kL. No automatic substitution of the transport route.
- **Validation/conditions:** equipment/consumption choice documented; lower unqualified rate endpoint; explicit single accounting period and non-overlapping areas.
- **File/readiness:** `calculate-hauling-fuel-814.js`; K.
- **Independent test:** volume 100 m3, rate 0.002 kL/m3, EF 2.5 ->0.5 tCO2e.

### Equation (15) - transport trips

- **Source/formula/unit:** S1 p.29, `N_TRUCKS-TRANSPORT = SUM_{j,i}(V_EX,j,i|BSL * A_i) / CAP_TRUCK`; trips.
- **Inputs/source/dependencies:** P2 total extracted volume, P5 capacity [m3/trip].
- **Validation/conditions:** capacity >0; keep continuous quotient because no ceiling rule is prescribed. Do not add an unsupported load factor.
- **File/readiness:** `calculate-transport-fuel-814.js`; K.
- **Independent test:** 100 m3/20 m3 per trip ->5; 105/20 ->5.25, not silently 6.

### Equation (16) - total transport distance

- **Source/formula/unit:** S1 p.30, `KM_TRANSPORT-TOTAL = KM_TRANSPORT * N_TRUCKS-TRANSPORT * 2`; km.
- **Inputs/source/dependencies:** (15), P5 one-way depot-to-processing distance from mapped/justified minimum route.
- **Validation/conditions:** distance >=0; return-trip factor 2 exactly once. Parameter table p.58 says km/truck; operational equation uses distance per trip, not total fleet distance.
- **File/readiness:** `calculate-transport-fuel-814.js`; K.
- **Independent test:** 50 km *5 trips *2 =500 km.

### Equation (17) - transport fuel emissions

- **Source/formula/unit:** S1 p.31, `E_TRANSPORT = (KM_TRANSPORT-TOTAL / EFF_VEHICLE) * EF_FUEL`; tCO2e.
- **Inputs/source/dependencies:** (16), P5 fuel efficiency [km/kL], P10 EF [tCO2e/kL].
- **Validation/conditions:** efficiency >0; select upper efficiency endpoint when an unqualified range is given (p.30). The equation's description mentions felling-to-depot, but section title/steps describe depot-to-processing; retain separate route IDs and do not duplicate hauling. Route-label clarification is B08, not a reason to change this quotient.
- **File/readiness:** `calculate-transport-fuel-814.js`; K for an explicitly identified route.
- **Independent test:** `500/2000*2.5 = 0.625 tCO2e`.

### Equation (18) - processing electricity demand

- **Source/formula/unit:** S1 p.32, `Q_PROCESSING = SUM_{j,i}(V_EX,j,i|BSL * A_i) * E_DEMAND`; kWh.
- **Inputs/source/dependencies:** P2 volumes/areas, P5 electricity demand [kWh/m3].
- **Validation/conditions:** processing plant inside the project boundary; country-specific factor first, then similar processing technology; lower unqualified range endpoint. Both grid and generator pathways use this demand calculation.
- **File/readiness:** `calculate-processing-energy-814.js`; K.
- **Independent test:** `100 m3*30 kWh/m3 = 3000 kWh`.

### Equation (19) - grid processing emissions

- **Source/formula/unit:** S1 p.32, `E_PROCESSING = Q_PROCESSING * EF_ELECTRICITY`; tCO2e.
- **Inputs/source/dependencies:** (18), P5 country electricity EF [tCO2e/kWh].
- **Validation/conditions:** grid branch; do not add generator emissions for the same energy. Mill-residue electricity is excluded here to avoid double counting (p.31). Convert g/kWh or kg/kWh explicitly before multiplication.
- **File/readiness:** `calculate-processing-energy-814.js`; K.
- **Independent test:** `3000*0.0005 = 1.5 tCO2e`.

### Equation (20) - generator power

- **Source/formula/unit:** S1 p.33, `PR_GENERATOR = Q_PROCESSING / T_GENERATOR`; kW.
- **Inputs/source/dependencies:** (18), P5 matched-period operating hours [h].
- **Validation/conditions:** generator branch when grid is unavailable; hours >0. The formula does not specify a new load-efficiency adjustment or an interpolation/rounding policy for generator charts.
- **File/readiness:** `calculate-processing-energy-814.js`; K.
- **Independent test:** `2000 kWh/100 h =20 kW`; 3000/100 ->30 kW must not silently map to an unlisted chart row.

### Equation (21) - generator processing emissions

- **Source/formula/unit:** S1 p.33, `E_PROCESSING = FC_GENERATOR * T_GENERATOR * EF_FUEL`; tCO2e.
- **Inputs/source/dependencies:** (18)/(20) support a sourced generator model/load consumption selection; P5 rate [kL/h], hours, P10 factor [tCO2e/kL].
- **Validation/conditions:** generator-specific model/load and period evidence; no invented interpolation or half-load factor. Appendix 3 supplies quarter/full-load rows, not every load mentioned in prose.
- **File/readiness:** `calculate-processing-energy-814.js`; K with explicit supported rate.
- **Independent test:** Appendix 3's 20 kW full-load rate 0.006 kL/h, 100 h, synthetic EF 2.5 ->1.5 tCO2e.

### Equation (22) - baseline post-harvest regrowth stock

- **Source/formula/unit:** S1 pp.33-34, `C_RG,i,p|BSL = RGR_i * t*`; tC/ha. The Where block defines `t*` as years since project start, while the surrounding text describes regrowth after parcel harvest.
- **Inputs/source/dependencies:** P6 rate [tC/ha/year], P2 timing. This is a stock over a duration, not automatically an annual increment.
- **Validation/conditions:** do not award regrowth before harvest or replace project time with parcel age without an approved interpretation. Its use as `DC_RG` in (26) is not defined by a separate numbered equation.
- **File/readiness:** `calculate-baseline-regrowth-815.js`; LIMITED; B04 for staggered harvest/annual integration.
- **Independent test:** supplied duration 3 years and RGR 2 ->6 tC/ha. Parcel harvested at project year 5 must not receive ten years of post-harvest regrowth at project year 10 by assumption.

### Equation (23) - first-year baseline losses

- **Source/formula/unit:** S1 p.34, `DC_NET|BSL(1) = SUM_{i,p}[A_1,i,p * (DC_DWSLASH,i,p/10 + DC_WP0,i,p + DC_WP100,i,p/20)]`; printed tC for the annual cohort calculation.
- **Inputs/source/dependencies:** (5),(9),(11), P2 area harvested one year ago.
- **Validation/conditions:** disjoint parcel/stratum cohort records; 10-year slash and 20-year product decay divisors, not new emission factors. Product losses remain B01/B02. Definition is already summed over parcels; do not feed the project-wide sum once per parcel into (27).
- **File/readiness:** `calculate-baseline-decay-816.js`; LIMITED integration, B03/B04.
- **Independent test:** area 10 ha, slash 20, immediate loss 5, retirement stock 40 tC/ha -> `10*(2+5+2)=90 tC`.

### Equation (24) - years 2-10 baseline losses

- **Source/formula/unit:** S1 p.35 literally `DC_NET|BSL(2-10) = SUM_{i,p} A_2-10,i,p * SUM_{i=1..M}(DC_DWSLASH,i,p/10 + DC_WP100,i,p/20)`; printed tC.
- **Inputs/source/dependencies:** (5),(11), P2 age-cohort areas.
- **Validation/conditions:** `i` is bound twice. Do not silently replace the expression with a paired per-stratum sum. Age boundaries also need a consistent event/year convention.
- **File/readiness:** `calculate-baseline-decay-816.js`; HOLD B03.
- **Independent diagnostic:** one parcel, two strata with areas 10,20 and per-ha loss terms 4,6: the independently-bound nested reading gives `(10+20)*(4+6)=300`; a paired sum gives 160. Production must reject the unresolved interpretation rather than select either unnoticed.

### Equation (25) - years 11-20 baseline losses

- **Source/formula/unit:** S1 p.35 literally `DC_NET|BSL(11-20) = SUM_{i,p} A_11-20,i,p * SUM_{i=1..M}(DC_WP100,i,p/20)`; printed tC.
- **Inputs/source/dependencies:** (11), P2 cohort areas; slash has finished decaying.
- **Validation/conditions:** repeated bound `i` as in (24); no slash after year ten; no product retirement loss after year twenty from this cohort.
- **File/readiness:** `calculate-baseline-decay-816.js`; HOLD B03.
- **Independent diagnostic:** areas 10,20 and retirement stocks 40,80 -> nested reading `30*(2+4)=180`; paired reading `10*2+20*4=100`. No approved general result is asserted.

### Equation (26) - baseline regrowth aggregation

- **Source/formula/unit:** S1 p.36, S3 clarification 2 p.5: literal `DC_NET|BSL(1+) = SUM_i A_t*,i,p * SUM_{i=1..M}(DC_RG,i|BSL)`; printed tC.
- **Inputs/source/dependencies:** P2 cumulative harvested area, P6/(22) regrowth evidence.
- **Validation/conditions:** repeated `i`, free parcel `p`, missing parcel index on `DC_RG`, and cumulative-stock versus annual-increment interface remain unresolved. S3 removes only the ten-year restriction, not these issues.
- **File/readiness:** `calculate-baseline-regrowth-815.js`; HOLD B03/B04.
- **Independent diagnostic:** areas 10,20 and supplied growth densities 2,3 -> nested reading 150 versus paired reading 80 tC. A case in project year 11 must not be zeroed solely because `t*>10`.

### Equation (27) - signed baseline net stock change

- **Source/formula/unit:** S1 p.36, `DC_NET|BSL,t* = SUM_p[-DC_NET,p|BSL(1) - DC_NET,p|BSL(2-10) - DC_NET,p|BSL(11-20) + DC_NET,p|BSL(1+)]`; tC.
- **Inputs/source/dependencies:** (23)-(26), explicitly parcel-level inputs.
- **Validation/conditions:** gains positive, losses negative. Earlier equations already contain parcel sums; a general interface cannot sum the same project totals again. Do not infer cumulative versus annual totals from field names alone.
- **File/readiness:** `calculate-baseline-net-816.js`; LIMITED, B03/B04.
- **Independent test:** one parcel with losses 90,40,20 and growth 50 -> -100 tC; duplicating an already aggregated parcel total must reject.

### Equation (28) - baseline carbon-to-CO2 conversion

- **Source/formula/unit:** S1 p.37, `GHG_NET|BSL,t* = DC_NET|BSL,t* * 44/12`; tCO2e.
- **Inputs/source/dependencies:** (27), tC only.
- **Validation/conditions:** preserve sign despite the source's emissions label; do not apply another conversion at (40)/(41). The corrected baseline operand there must use the converted unit.
- **File/readiness:** `calculate-baseline-net-816.js`; K; upstream aggregation remains blocked.
- **Independent test:** `-100*44/12 = -366.6666666667 tCO2e`.

### Equation (29) - project tree biomass carbon per species/plot

- **Source/formula/unit:** S1 pp.39-40, `C_AB,j,i,t,sp|PRJ = SUM_{l=1..L_j,i,sp,t}[f_j(X_l,Y_l,...) * CF_j]`; tC.
- **Inputs/source/dependencies:** P6 approved allometry and measured variables; P3 CF. No universal allometric coefficient set is supplied by VM0010.
- **Validation/conditions:** only trees/species/stands that the baseline plan would harvest, and the appropriate harvest timeframe, pp.38-39; fixed minimum inventory diameters; measured-domain checks and persistent tree IDs.
- **File/readiness:** `calculate-project-stocks-821.js`; K with a validated allometry adapter or explicit validated per-tree dry biomass inputs; not arbitrary unsourced DBH formulas.
- **Independent test:** dry biomasses 2,3 t/tree and CF 0.5 ->2.5 tC; an otherwise identical ineligible tree must be excluded by the eligibility contract.

### Equation (30) - project plot carbon across species

- **Source/formula/unit:** S1 p.40, `C_AB,i,t,sp|PRJ = SUM_j C_AB,j,i,t,sp|PRJ`; tC.
- **Inputs/source/dependencies:** (29), same plot/date/stratum.
- **Validation/conditions:** no duplicate trees across species groups or mixed measurement dates.
- **File/readiness:** `calculate-project-stocks-821.js`; K.
- **Independent test:** 2.5+1.5 ->4 tC.

### Equation (31) - mean project stock density

- **Source/formula/unit:** S1 pp.40-41, `C_AB,i,t|PRJ = (1/SP) * SUM_sp(C_AB,i,t,sp|PRJ / A_sp)`; tC/ha.
- **Inputs/source/dependencies:** (30), P1 plot areas.
- **Validation/conditions:** positive areas/count; average plot densities, not pooled-stock/pooled-area shortcut.
- **File/readiness:** `calculate-project-stocks-821.js`; K.
- **Independent test:** 4 tC over 0.1 ha and 3 tC over 0.2 ha -> `(40+15)/2 =27.5 tC/ha`.

### Equation (32) - annual project stock gain

- **Source/formula/unit:** S1 p.41, `DC_AB,t|PRJ = SUM_{i,p}[A_t*,i,p * (C_AB,i,t2|PRJ-C_AB,i,t1|PRJ)/T] * 44/12`; tCO2e/year, `T=t2-t1` years.
- **Inputs/source/dependencies:** (31) at matched monitoring events, P2 eligible cumulative area.
- **Validation/conditions:** `T>0`; `t1` is monitoring-period start or baseline harvest event, whichever is later; only eligible trees/areas after scheduled baseline harvest. No annual-rate multiplication by monitoring length inside this equation. Summing years into (39) requires a documented time adapter, B05.
- **File/readiness:** `calculate-project-growth-821.js`; K for explicit matched intervals.
- **Independent test:** area 10 ha, densities 10 ->14 over two years ->`10*4/2*44/12 =73.3333333333 tCO2e/year`.

### Equation (33) - fire methane emissions

- **Source/formula/unit:** S1 p.42, `DC_DIST-FR,t|PRJ = SUM_i(A_burn,i,t * B_i,t|PRJ * COMF_i * G_CH4,i * 10^-3 * GWP_CH4)`; tCO2e.
- **Inputs/source/dependencies:** (34), P7 fire area, combustion fraction and methane g/kg dry matter; P10 GWP.
- **Validation/conditions:** burnt area within affected eligible biomass; COMF in `[0,1]`; gas factor non-negative. `10^-3` converts g/kg to t/t; do not also divide by 1000. Table 2 excludes fire N2O; do not invent a fire CO2 term. B06 governs factor provenance/current GWP choice.
- **File/readiness:** `calculate-fire-disturbance-822.js`; K with approved explicit factors.
- **Independent test:** area 2 ha, B=50 t dry matter/ha, COMF=0.5, methane EF=6 g/kg, explicitly supplied legacy GWP=21 ->6.3 tCO2e. The 21 is printed in S1, not authorization to hard-code it as the current governing default.

### Equation (34) - biomass absent in the baseline

- **Source/formula/unit:** S1 pp.42-43, `B_i,t|PRJ = SUM_j(V_EX,j,i|BSL * BCEF_R)`; t dry matter/ha.
- **Inputs/source/dependencies:** P2 approved merchantable extraction and P3 BCEF.
- **Validation/conditions:** no CF or `44/12` here; do not add infrastructure extraction absent from the printed expression. Subject to scheduled harvest eligibility.
- **File/readiness:** `calculate-fire-disturbance-822.js`; K.
- **Independent test:** volumes 10,5 m3/ha, BCEF 1.2 ->18 t dry matter/ha.

### Equation (35) - non-fire natural disturbance

- **Source/formula/unit:** S1 p.43, `DC_DIST,t|PRJ = SUM_i[A_dist,i,t * SUM_j(C_AB,i,j|BSL)] * 44/12`; tCO2e.
- **Inputs/source/dependencies:** P7 delineated area; source defines `C_AB,i,j|BSL` as baseline aboveground carbon stock density [tC/ha]. No preceding numbered equation outputs that exact named quantity.
- **Validation/conditions:** stand-replacing non-fire disturbance, emissions in event year. Do not silently alias this stock to (3), (4), (29) or (34). B07 requires its exact biomass boundary/derivation.
- **File/readiness:** `calculate-nonfire-disturbance-822.js`; HOLD for upstream derivation; multiplication kernel is testable with verified explicit stock inputs.
- **Independent diagnostic:** area 2 ha, verified baseline stocks 6 and 4 tC/ha ->`2*(6+4)*44/12 =73.3333333333 tCO2e`. Missing baseline stock definition must reject.

### Equation (36) - no significant illegal logging

- **Source/formula/unit:** S1 p.45, `DC_DIST-IL,t|PRJ =0`; tCO2e.
- **Inputs/source/dependencies:** P7 documented PRA/limited-sampling/significance pathway, not a default value.
- **Validation/conditions:** no-pressure PRA or qualifying insignificant logging outcome; PRA every two years. At least 10% positive survey responses triggers limited sampling; a failed/missing assessment cannot select zero.
- **File/readiness:** `calculate-illegal-logging-822.js`; K for evidence gating.
- **Independent test:** documented no-pressure finding ->0; 2 positive responses of 20 ->10%, so limited-survey gate is triggered rather than assuming zero.

### Equation (37) - significant illegal logging

- **Source/formula/unit:** S1 pp.45-46, S3 correction 5 p.6; the printed structure is `DC_DIST-IL,t = SUM_i(A_DIST-IL,i * C_DIST-IL,i,t / A_P,i) * (1 + V_EX,INF,j,i/V_EX,j,i) + C_FUEL * C_DIST-IL,t / [(SUM_{i=1..I} C_EX,i) * (44/12) * A_i]`; tCO2e. The ratio is printed after the summed parenthesis, leaving its stratum/species scope unresolved. B08 also covers the unbound denominator area index; this display does not repair either scope.
- **Inputs/source/dependencies:** P7 buffer/sample areas and measured removed-tree carbon [tCO2e]; P2/P3 extraction; (8),(12). `C_DIST-IL,t` without stratum is printed in the fuel numerator without a clear independent derivation. `A_i` is printed beside the denominator's summed term; do not move it inside the sum silently.
- **Validation/conditions:** significant illegal logging; positive sampled area and nonzero required denominators; systematic sample area at least 3% of buffer, five-year sampling/annualization prose, no invented unsummed-species aggregation. `C_FUEL` must be tCO2e, not tC.
- **File/readiness:** `calculate-illegal-logging-822.js`; HOLD B08, including aggregation and annualization.
- **Independent diagnostic:** restrict to one stratum/species; buffer 100 ha, sampled 3 ha, sampled stock 30 tCO2e, infrastructure/main volume ratio 2/10 ->expanded first term 1200 tCO2e. If the undefined unstratified numerator is explicitly injected as 110 tCO2e solely for a diagnostic, C_FUEL=100, C_EX=10 tC/ha, A=100 ha give a fuel term 3 and total 1203. That injection is not an approved derivation; production rejects the missing numerator provenance.

### Equation (38) - annual project net change

- **Source/formula/unit:** S1 pp.46-47, `DC_NET,t|PRJ = DC_AB,t|PRJ - (DC_DIST-FR,t|PRJ + DC_DIST,t|PRJ + DC_DIST-IL,t|PRJ)`; tCO2e for the annual accounting bucket.
- **Inputs/source/dependencies:** (32),(33),(35),(36)/(37).
- **Validation/conditions:** normalize the growth rate into the same explicitly defined one-year/event bucket as losses; no duplicate disturbance loss; retain signed result. B05 blocks undefined period mixing; B07/B08 block affected branches.
- **File/readiness:** `calculate-project-net-823.js`; K on reconciled annual inputs.
- **Independent test:** gain 100, fire 10, non-fire 20, illegal 5 ->65 tCO2e.

### Equation (39) - cumulative project net change

- **Source/formula/unit:** S1 p.47, `DC_NET|PRJ = SUM_{t=1..t*} DC_NET,t|PRJ`; tCO2e since project start.
- **Inputs/source/dependencies:** (38) annual records.
- **Validation/conditions:** complete, non-overlapping annual buckets, baseline eligibility and version history retained. Not a sum of multi-year monitoring totals presented as individual years.
- **File/readiness:** `calculate-project-net-823.js`; K; final comparison with annual baseline remains B05.
- **Independent test:** annual results 65,35 ->100 tCO2e cumulative; duplicate year must reject.

### Equation (40) - corrected net emission reductions

- **Source/formula/unit:** S1 pp.49-50 corrected by S3 p.6: `ER_t* = [C_FUEL - MIN(0,DC_NET|BSL,t*) + MIN(0,DC_NET|PRJ)] * (1-LF_ME) * (1-U_total|LtPF)`; tCO2e.
- **Inputs/source/dependencies:** (12), converted (28), (39), leakage rules and (42)/uncertainty threshold; P8/P9. Baseline variable is delta-C in tCO2e as corrected, not raw (27) tC.
- **Validation/conditions:** exact bracket order; LF in `[0,1]`, uncertainty deduction consistent with section 8.5; do not add a removals leakage deduction by symmetry. Final accounting scope/time remains HOLD B05.
- **File/readiness:** `calculate-net-benefits-84.js`; K as a typed pure arithmetic kernel; do not connect to issuance yet.
- **Independent test:** C_FUEL=20, BSL=-100, PRJ=-10, LF=0.4, applicable U=0.2 ->`110*0.6*0.8 =52.8 tCO2e`.

### Equation (41) - corrected net removals

- **Source/formula/unit:** S1 p.50 corrected by S3 p.7: `CR_t* = [MAX(0,DC_NET|PRJ) - MAX(0,DC_NET|BSL,t*)] * (1-U_total|LtPF)`; tCO2e.
- **Inputs/source/dependencies:** converted (28), (39), (42)/threshold; P9.
- **Validation/conditions:** no LF multiplier in this formula; retain negative result for review rather than silently issuing zero. B05 time reconciliation applies.
- **File/readiness:** `calculate-net-benefits-84.js`; K as pure kernel, production graph gated.
- **Independent test:** PRJ=100, BSL=20, applicable U=0.2 ->64 tCO2e.

### Equation (42) - combined uncertainty

- **Source/formula/unit:** S1 p.51, `U_total|LtPF = SQRT(U_PRJ^2 + U_BSL^2)`; dimensionless.
- **Inputs/source/dependencies:** P9 two justified scenario uncertainty estimates, not the sum of arbitrary unweighted pool percentages.
- **Validation/conditions:** non-negative, same 95%-confidence convention; retain raw result separately from the applied credit deduction. At raw uncertainty <=0.15 the prose requires no deduction. Do not subtract only the excess above 0.15. Unsupported component aggregation is B10; no capped/negative-credit workaround.
- **File/readiness:** `calculate-uncertainty-85.js`; K with approved scenario uncertainties.
- **Independent test:** 0.12 and 0.16 ->0.20. 0.09 and 0.12 ->0.15, triggering no deduction under the separate textual rule.

### Equation (43) - removals buffer

- **Source/formula/unit:** S1 pp.51-52, `Bu_CR,t* = [MAX(0,DC_NET|PRJ)-MAX(0,C_NET|BSL,t*)] * NPR%`; tCO2e buffer quantity. Source omits delta on baseline here; its defined quantity is a net stock change, not an absolute standing stock.
- **Inputs/source/dependencies:** same typed baseline/project net changes as (41), P9 approved risk fraction.
- **Validation/conditions:** normalize a recorded percent explicitly, e.g.20% ->0.20; do not apply LF/U a second time to the buffer formula. B05 applies to temporal scope.
- **File/readiness:** `calculate-vcus-86.js`; K, issuance gated.
- **Independent test:** PRJ=100, BSL=20, NPR=0.20 ->16 tCO2e buffer.

### Equation (44) - reductions buffer

- **Source/formula/unit:** S1 p.52, `Bu_ER,t* = [MIN(0,DC_NET|PRJ)-MIN(0,C_NET|BSL,t*)] * NPR%`; tCO2e buffer quantity.
- **Inputs/source/dependencies:** typed net changes, P9 risk fraction.
- **Validation/conditions:** no C_FUEL term in this buffer formula; preserve source subtraction/sign. Negative buffer results require review, not automatic clamping. B05 applies.
- **File/readiness:** `calculate-vcus-86.js`; K, issuance gated.
- **Independent test:** PRJ=-10, BSL=-100, NPR=0.20 ->18 tCO2e; reversed changes produce -18, a review case.

### Equation (45) - removals VCUs

- **Source/formula/unit:** S1 p.52, `VCU_CR,t* = CR_t* - Bu_CR,t*`; VCU-equivalent tCO2e quantity before registry rounding/issuance handling.
- **Inputs/source/dependencies:** (41),(43), identical accounting scope.
- **Validation/conditions:** do not combine removals and reductions; buffer subtraction exactly once. No integer rounding, vintage allocation or repeat-issuance formula is specified here; B11 must govern those operations.
- **File/readiness:** `calculate-vcus-86.js`; K, minting gated.
- **Independent test:** 64-16 ->48.

### Equation (46) - reductions VCUs

- **Source/formula/unit:** S1 p.52, `VCU_ER,t* = ER_t* - Bu_ER,t*`; VCU-equivalent tCO2e quantity before registry issuance handling.
- **Inputs/source/dependencies:** (40),(44).
- **Validation/conditions:** separate mitigation outcome and same period; do not add fuel to buffer or round intermediate benefits. B05/B11 issuance gates apply.
- **File/readiness:** `calculate-vcus-86.js`; K, minting gated.
- **Independent test:** 52.8-18 ->34.8; do not silently floor to 34.

### Equation (47) - non-CO2 equivalent emission factor

- **Source/formula/unit:** S1 Appendix 1 p.87, `EF = EF_CH4*GWP_CH4 + EF_N2O*GWP_N2O`; tCO2e per common activity unit.
- **Inputs/source/dependencies:** P10 gas-specific EFs in tCH4/activity and tN2O/activity; applicable approved GWPs; (48) when converting energy-based fuel factors.
- **Validation/conditions:** same activity denominator, explicit gas identities, documented significance outcomes. This expression is the non-CO2 contribution, not the CO2 factor. Do not hard-code GWPs or treat missing significant gas factors as zero.
- **File/readiness:** new `calculate-non-co2-emission-factor.js`; K with profile/inputs. This was deliberately deferred in the slice, not scientifically excluded from the bounty.
- **Independent test:** synthetic EF_CH4=0.01, GWP_CH4=20, EF_N2O=0.001, GWP_N2O=100 ->0.3 tCO2e/activity. These GWPs are test inputs only.

### Equation (48) - per-gas fuel factor unit conversion

- **Source/formula/unit:** S1 Appendix 2 p.88, `EF_FUEL-GHG = EF_IPCC-FUEL * HV_FUEL * rho_FUEL /1000`; t of the specified GHG/kL.
- **Inputs/source/dependencies:** P10: EF kgGHG/TJ, heating value TJ/kg, density kg/kL; no preceding equation.
- **Validation/conditions:** EF >=0, heating value/density >0, explicit source units and gas. The output is not tCO2e for CH4/N2O until (47). Do not pass MJ/kg numerically as TJ/kg.
- **File/readiness:** arithmetic already in `calculate-c-fuel.js`; preserve. New typed gas conversion adapter may be `calculate-fuel-factors.js`; K.
- **Independent test:** synthetic EF 74100 kgCO2/TJ, heating value `0.000043 TJ/kg`, density 840 kg/kL ->`2.676492 tCO2/kL`. `43 MJ/kg =0.000043 TJ/kg`; supplying `0.043 TJ/kg` makes the output 1000 times larger. Existing slice fixtures using 0.043 must not be presented as realistic diesel defaults.

## 4. Unnumbered calculations and decision rules

These are not additional numbered VM0010 equations. Their tests must exist separately; completing equations (1)-(48) alone does not satisfy applicability or verification.

| ID | Rule, source and dependencies | Constraints, independent check and proposed file |
|---|---|---|
| A01 | Infrastructure volume partition, S1 pp.54-55: `V_EX,INF = F_V,INF,HWP * V_cleared`; `V_notEX,INF = (1-F_V,INF,HWP) * V_cleared`. | Both volumes share m3/ha/species/stratum scope; F in `[0,1]`. Example100 and F=0.6 ->60,40. If no credible F can be established, p.54 explicitly prescribes all cleared timber processed into sawnwood: F=1, not zero. `calculate-infrastructure-inputs.js`; ready with validated cleared volume. |
| A02 | Alternative factor construction `BCEF_R = BEF_R * D`, S1 p.68, P3. | BEF1.5 *density0.6 ->0.9 t dry matter/m3. Same-sample or locally checked applicability/correlation evidence mandatory. `calculate-biomass-factors.js`; numeric multiplication ready, factor approval human/data gate. |
| A03 | Fuel EF assembly, Appendix 1 plus Appendix 2: add included CO2 EF to the non-CO2 equivalent contribution (47), on one activity basis. | CO2=2 and non-CO2=0.3 ->2.3 tCO2e/kL. Never relabel raw methane mass as CO2e. `calculate-fuel-factors.js`; ready with approved gas/GWP/significance inputs. |
| A04 | `PMP_i = merchantable biomass / total aboveground tree biomass *100`, S1 p.79. | Numerator source describes trees >=15 cm DBH; require positive denominator and compatible biomass boundaries.20/50 ->40%. Do not substitute extraction-volume fraction. `calculate-market-leakage-83.js`; ready with source-verified biomass inputs. |
| A05 | LF_ME zero exemption, S1 p.48, requires all three documented findings: no new concessions, no increase in extraction in existing concessions, and absent/de minimis national illegal logging. | All true ->0; any absent/false ->exemption unavailable, not automatic rejection of the whole methodology. No default zero. Same leakage module. |
| A06 | Box 2 factor bands, S1 pp.48-49: equal within +/-15% ->0.4; lower by >15% ->0.7; higher by >15% ->0.2. | Comparison is PML_FT against PMP_i. The text does not explicitly distinguish relative percent from percentage points: B09. Equal40%,40% ->0.4; 80% versus20% ->0.2 under either reading; 50% versus40% produces 0.2 under relative-percent and 0.4 under percentage-point interpretation. No silent choice. |
| A07 | Area-weighted LF_ME, S1 p.49: `SUM_i[(A_i / total project area) * LF_i]`. | Denominator >0, stratum areas cover the declared project scope without overlap; factors all approved.25 ha at0.4 and75 ha at0.7 ->0.625. Same leakage module; ready on explicit LF_i inputs. Multiple displacement forest types still need a justified mapping, not invented weights. |
| A08 | Uncertainty no-deduction rule, S1 p.51: raw combined U<=0.15 causes no uncertainty deduction; otherwise formulas use the uncertainty deduction. | Preserve raw (42) and a separately named applied deduction. Raw0.15 ->applied0; raw0.20 ->applied0.20, not0.05. This adapter reconciles explicit prose with the credit multiplier; it must not overwrite the raw statistical estimate. `calculate-uncertainty-85.js`. Raw U>1 cannot silently be clipped to1. |
| A09 | Illegal-logging monitoring gates, S1 pp.44-45,74-78. | PRA >=10% positive triggers limited survey; survey covers >=1% of buffer. Significant activity triggers systematic sampling >=3%; ex-ante AP exactly3% is specified on p.78. PRA every2 years; systematic sampling/annualization every5 years per p.45.2/20 positive responses triggers; 1/20 does not by itself prove no pressure. `validate-illegal-logging-evidence.js`. Arithmetic areas100 ha ->limited>=1 ha, systematic>=3 ha. Do not annualize (37) twice. |
| A10 | Historical/common-practice baseline selection, S1 pp.13-14,53. | Historical pathway requires the specified >=5 years of records and the legal/financial conditions; otherwise common practice with representative reference evidence. Both use identical numbered formulas, with different parameter sources. `validate-baseline-evidence.js`; missing historical data cannot be filled by invented historical defaults. |
| A11 | Activity-shifting leakage, S1 pp.47-48. | It is an eligibility/verification gate, not an invented leakage-subtraction equation. Evidence includes other controlled lands and management plans prepared >=24 months before project start. Material shifting or missing evidence prevents verification absent an approved deviation. `validate-leakage-evidence.js`; missing required records ->verification blocked. |
| A12 | Significance/source selection, S1 pp.11-12,37,44,87. | Optional baseline fossil omission must be explicit and conservative. If included, apply the referenced significance tool for gases; the combined neglected decreases/increases must be <5% of total benefits. Exactly5% is not <5%. Biomass-burning methane is included, fire N2O excluded. Referenced tool formulas/version are B10, not a guessed threshold-only substitute. `validate-gas-scope.js`. |

### Additionality and baseline selection: VT0001 v3.0

S1 sections 6.1 and 7 (pp.13,16) require S4. S4 has **no numbered numerical equation ledger** to add to the 48 equations. It supplies alternative evidence/financial-analysis procedures, not a mandatory universal NPV/IRR formula or fixed discount rate.

| Stage | Authoritative rule | Inputs/provenance, tests and implementation contract |
|---|---|---|
| Step1, S4 pp.3-4 | Identify credible land-use alternatives, test legal/regulatory consistency and select baseline under VM0010. Empty or single remaining scenario cannot establish additionality. | Land-use/legal evidence, enforcement assessment and baseline plan. Tool's non-enforcement condition includes prevalence >=30% of the smallest encompassing administrative unit; that is not permission to bypass legal review. Test one viable scenario ->not additional. `validate-additionality-vt0001.js`. |
| Step2 OptionI, S4 p.5 | Simple cost analysis applies when there are no financial/economic benefits except carbon income. | Document costs and absence of other benefits; no invented profitability formula. Test any non-carbon revenue ->OptionI unavailable. |
| Step2 OptionsII/III, S4 pp.5-7 | Choose exactly one investment-comparison or benchmark pathway; use a suitable documented indicator, exclude carbon-credit income, include relevant costs/revenues/subsidies and justify benchmark/assumptions. | Approved project/equity basis, cash-flow dates, horizon, indicator choice and benchmark are inputs. Given approved IRRs8% versus alternative12% or benchmark10%, the project is less attractive; 12% versus benchmark10% does not support the financial route. The indicator engine itself needs its specified finance profile; do not invent IRR root selection, discounting periods or payback conventions. |
| Sensitivity, S4 p.7 | Financial conclusion must hold over a realistic justified range of critical assumptions; otherwise use qualifying barrier analysis or fail that route. | No fixed +/-10% sensitivity range is prescribed. Test base result passes but an approved sensitivity case makes the project most attractive ->financial evidence alone insufficient. |
| Step3, S4 pp.7-10 | Demonstrate documented barriers to the project without carbon finance, while at least one alternative remains viable. May replace or supplement investment analysis. | Evidence cannot consist only of anecdotes. Test barrier also prevents all alternatives ->route fails. Requires reviewer decision, not a model-generated barrier score. |
| Step4, S4 pp.10-11 | Common-practice check is mandatory after a qualifying investment/barrier route; examine preceding10 years, exclude registered VCS AFOLU projects, and substantiate essential distinctions if similar activities exist. | Similar activities without essential distinctions ->not additional. No similar activities, or supported essential distinctions, can pass this stage after other stages pass. Test failed common practice despite financial success ->not additional. |

The evidence workflow can be coded immediately with explicit reviewer outcomes; no numerical additionality score, default discount rate or universal IRR implementation is authorized by these sources.

## 5. Reassessment of Equations (9)-(11)

The earlier slice notes overstate the absence of a class-data pathway. S1 section 6.2 requires product specifications and class volumes/fractions in the harvest schedule (p.15). Section 8.1.3 explicitly allows assigning gross percentages of extracted volume to product classes using local expert knowledge (p.24). Therefore, product-class activity data is an authoritative input category.

What is **not** resolved is a universal automatic conversion of aggregate volume percentages into `C_EX,i,k`. With heterogeneous species densities/carbon fractions, an aggregate volume percentage does not uniquely determine a carbon percentage. For example, two10 m3 streams with D0.4 and0.8 and CF0.5 contain2 and4 tC. A50/50 volume split could send the first species to one class (class carbon2) or the second species (class carbon4). Applying50% of total carbon always gives3 and adds an unstated mixing assumption. Collect a documented species/class allocation or independently verified class-carbon calculation; reconcile to (8). Do not invent a new conversion formula and label it as an equation printed in VM0010.

The methodology's p.69 factors are:

| Product class | SLF | OF boreal | OF temperate | OF tropical |
|---|---:|---:|---:|---:|
| Sawnwood |0.12|0.39|0.62|0.86|
| Wood-based panels |0.06|0.62|0.86|0.98|
| Other industrial roundwood |0.18|0.86|0.98|0.99|
| Paper/paperboard |0.24|0.39|0.62|0.99|
| Other |**not supplied**|**not supplied**|**not supplied**|**not supplied**|

`WW=0.19` for developed countries and `0.24` for developing countries are printed on p.69. The project must identify its applicable country classification/source; do not silently assign a classification. `Other industrial roundwood` is a named class and is not the unspecified `other` catch-all. A project with zero allocation to `other` may omit that inactive class with evidence; a nonzero `other` allocation needs an approved factor source. Do not default its SLF/OF to zero or copy another class's factors.

Even after class-carbon inputs and factors are available, multiclass (10)/(11) have the independent aggregate-versus-class-index defects documented in B02. Neither S2 nor S3 repairs them. A single-class implementation does not fulfil every quantification approach.

## 6. Fuel units and alternative pathways

The safe dimensional chain is:

1. For each selected gas/fuel/technology, convert `kgGHG/TJ * TJ/kg * kg/kL /1000` to `tGHG/kL` using (48).
2. Convert included CH4 and N2O factors to tCO2e/kL using (47), with an explicit versioned GWP profile and significance evidence. Add the CO2 contribution once (A03).
3. Harvest/hauling multiply `kL/m3 * tCO2e/kL * m3`. The volume is the approved extracted-volume/area calculation, not a hidden pre-folded consumption field.
4. Road transport multiplies `km / (km/kL) * tCO2e/kL`; factor2 for the return trip occurs only in (16).
5. Grid processing multiplies `m3 * kWh/m3 * tCO2e/kWh`; generator processing uses `kL/h * h * tCO2e/kL`, with (18)/(20) supporting a documented generator selection.
6. Sum compatible contributions in corrected (12). No `44/12` conversion belongs there.

Unit conversions are exact: `L/1000 = kL`, `MJ/1,000,000 = TJ`, `kg/1000 = t`, and `g/1,000,000 = t`. Appendix4's 1.28-1.73 L/m3 is 0.00128-0.00173 kL/m3. Appendix5's country values are demand factors, not electricity EFs; the printed Brazil demand factor20 need not equal the quotient of rounded table activity figures exactly. Use the sourced selected factor, not a new default recomputed from rounded examples.

Separate implementations/branch tests are required for:

- Historical versus common-practice parameter sourcing; formulas are shared but evidence cannot be interchanged silently.
- Infrastructure accounting selected versus conservatively omitted; include the explicit p.54 fallback where applicable, rather than assuming missing infrastructure data means no infrastructure.
- Optional baseline fossil sources omitted versus included; when included, CO2-only after significance findings versus significant CH4/N2O. The old slice's blanket CO2-only declaration is insufficient.
- Grid versus on-site generator processing; mill-residue electricity is excluded here to avoid duplicate biomass emissions. A mixed-source energy allocation is not specified; require a supported allocation before enabling it.
- Appropriate national electricity-demand source versus comparable-technology fallback, and supported generator model/load rows; no invented chart interpolation.
- Alternative validated allometric models based on site/species/forest type and field-validation route; a generic invented tree formula is not an implementation.
- Fire versus non-fire disturbance, and illegal-logging no-pressure/insignificant versus significant sampled cases.
- Age cohorts1,2-10,11-20 and later regrowth; no repeated-harvest or arbitrary age convention beyond the approved plan.
- Product classes, forest regions and country WW classification; no unsupported `other` fallback.
- Investment simple-cost/comparison/benchmark routes, barrier route, and mandatory common-practice review.
- Separate emissions-reduction and removal outputs and buffers; do not merge (40)/(41) or (45)/(46).

## 7. Blockers, exact clarification questions and propagation

Normal project data requirements are distinguished from ambiguities in the authoritative text. A dataset-specific value is not a missing universal constant that a router should invent.

| ID | What is unresolved | Required resolution and affected calculations |
|---|---|---|
| B01 | Volume shares -> class carbon; `other` factors. | Obtain an approved class-carbon allocation method or verified class-carbon inputs, and approved factors for any active `other` class. Section6.2/p.24 supports activity data but does not eliminate heterogeneous-species conversion ambiguity. Blocks automatic (9) inputs and downstream products/credits; the explicit-input (9) kernel is safe. |
| B02 | (10) subtracts aggregate immediate loss inside each class term; (11) multiplies aggregate retained carbon by each class OF. | Ask whether losses/retained carbon should have a class index, or sums/grouping should change, and obtain corrected formulas with numerical multi-class examples. Blocks general (10)/(11), decay and downstream credits. Preserve existing slice pending approved changes. |
| B03 | (13) sums over an unused parcel index; (24)-(26) bind stratum indices repeatedly; (23) already sums parcels while (27) expects parcel outputs. | Obtain authoritative summation/index scope and the level at which each intermediate is defined. Include the two-stratum diagnostics in the request. Blocks general parcel/stratum baseline aggregation; does not block isolated volume/fuel/unit kernels. |
| B04 | (22) uses project elapsed time for post-harvest regrowth, (26) consumes an undefined delta/increment interface, and cohort timing is underspecified for staggered harvest. | Obtain a schedule with at least two harvest years showing annual growth/decay outputs and eligibility at years1,10,11,20,21. Confirm whether the (26) input is a rate, annual increment or cumulative stock and its relation to (22). No project-year averaging shortcut: S2 removed it. |
| B05 | Annual baseline (27)/(28) versus cumulative project (39), C_FUEL scope and year/verification output labels in (40)-(46). | Obtain an approved multi-year reconciliation example, specifying annual versus cumulative operands, monitoring-period incremental issuance, baseline validity changes and rates-to-totals conversion. Dimensional conversion to tCO2e is resolved by (28)/S3; temporal reconciliation is not. Blocks production net benefits/issuance, not pure signed arithmetic kernels. |
| B06 | Governing GWP profile; COMF provenance. | S1 p.42 prints methane21; Appendix1 has no numeric set. Obtain governing VCS version/transition decision and approved gas/GWP values. COMF is defined but not supplied in its own section9.1 row; obtain applicable documented combustion-factor evidence. This gates production non-CO2/fire cases, not arithmetic with explicit approved factors. Do not confuse the combustion-factor comment under BCEF with a numeric COMF default. |
| B07 | Baseline `C_AB,i,j|BSL` in (35) has no directly matching preceding output/parameter derivation. | Confirm its biomass boundary and relation, if any, to harvested biomass (3) or another measured stock. Blocks the non-fire upstream adapter and affected net results; do not silently alias symbols. |
| B08 | (37) has an unstratified `C_DIST-IL,t` fuel numerator without derivation; species j/area scope and ratio placement are unclear; p.45 annualization needs an explicit interface. (17)'s route label also conflicts with its section steps. | Obtain an indexed multi-stratum/species illegal-logging example and define sample-total, expanded-total and annualized quantities. Clarify whether area belongs inside the denominator sum and how the species ratio is aggregated. Confirm hauling versus transport route boundary. Significant illegal-logging production calculation stays blocked. |
| B09 | Box2's +/-15% comparison lacks an explicit percent-versus-percentage-point definition and zero-denominator rule. | Confirm relative thresholds or percentage-point thresholds, boundary inclusivity, PMP=0 handling, and multiple displacement forest-type weighting. Blocks automatic LF band selection. Explicit approved LF inputs and p.49 area-weighting arithmetic are safe. |
| B10 | Component uncertainty model, current referenced CDM sample-size/significance tools, and finance indicator conventions are not completely specified by the 48 VM0010 equations. | Pin the applicable official tool versions and approved statistical/finance profiles before implementing their internal algorithms. VM0010 pp.6,19,44,83 reference those CDM tools; do not guess tool equations or treat the5% cap as the complete significance algorithm. Collect approved outputs/evidence meanwhile. (42), threshold policy and VT0001 evidence gates are safe. |
| B11 | Current NPR assessment, VCU integer rounding, vintage/period attribution, negative-result handling and repeat-issuance accounting. | Require the approved governing risk/registry policy and a period reconciliation example before minting. (43)-(46) are arithmetic specifications, not a token issuance protocol. Do not floor, clamp or combine mitigation outcomes without authority. |
| B12 | Approved VM0050 export; VCS5/joint CCB templates, program applicability and Project Hub acceptance environment. | [Issue5194](https://github.com/hashgraph/guardian/issues/5194) is completed but the actual approved policy export/topic was not located in available public/local references. [Maintainer comment on5941](https://github.com/hashgraph/guardian/issues/5941#issuecomment-6373868380) says VCS5 and joint CCB templates are being developed. Obtain versioned exports/schemas/mapping contracts and confirm SDVISta applicability. This blocks final integrations/acceptance, not the independent kernels above. |

For B01-B09, request clarification through maintainers for routing to the methodology owner/VVB as appropriate. An agent's plausible correction is not authoritative approval. Record the actual response, source version, reviewer and approved numerical example before changing HOLD to ready. For B10/B11, separate project-specific evidence from governing-tool/profile decisions. Do not treat every unavailable project observation as a maintainer question.

## 8. Dependency-ordered Free Models Router backlog

The following is a coding specification, not permission to change branches, commit or publish. The router's operational instructions are in `FREE-ROUTER-HANDOFF.md`.

| Order/task | Exact work | Acceptance/dependencies |
|---|---|---|
| T01 Source/typed-input contracts | Add provenance-aware schemas for units, gas identity, source version, baseline pathway, period and unique keys. Maintain explicit pending/approved evidence states. | Required inputs fail when missing; no hidden defaults; fractions/percents unambiguous; source equation IDs retained. Do not change existing schema contracts in place merely to fit new modules. |
| T02 Inventory kernels | New `calculate-plot-volume-811.js`, equations1/2; external tree-volume adapter is separately approved evidence. | Independent unequal-plot fixture; zero area rejection; arbitrary species/strata counts. P1/P2; no automatic allowable-harvest inference. |
| T03 Infrastructure/factor adapters | A01/A02, new files listed above; keep existing equations3-8 untouched. | Source-prescribed infrastructure fallback explicitly recorded; partition conserves volume; BCEF evidence and no cap at1. No invented class-carbon allocation. |
| T04 Gas/fuel factors | New `calculate-fuel-factors.js` and `calculate-non-co2-emission-factor.js`, equations47/48 and A03. | Gas/unit/GWP profile required; MJ/TJ and L/kL factor-of1000 controls; no missing significant gas as zero; existing fuel arithmetic untouched. Profile data can remain pending without blocking fixture tests. |
| T05 Fuel pathway kernels | New hauling, transport, processing files for14-21. Add restricted explicit-volume harvesting kernel13 without general parcel aggregation. | Separate grid/generator paths, no double counting residue, exact return-trip factor, continuous trip quotient, generator unsupported-chart rejection. Units and range-choice provenance as section6. B03/B05 prevent premature full integration. |
| T06 Project stock/growth/fire kernels | New project stocks29-31, matched-interval growth32 and fire34/33 modules. | External allometry/eligible-tree data and GWP/COMF evidence required for production; synthetic fixtures can run now. No species-count cap, no rate/period confusion. |
| T07 Evidence/leakage/uncertainty gates | A04/A05/A07/A08/A09/A10/A11/A12, equation36 and42, VT0001 workflow. | Exact PRA10% and uncertainty15% boundary tests; activity-shifting evidence gate; no automatic LF bands before B09; no invented statistics/NPV/IRR/CDM algorithms. |
| T08 Product input kernel | Implement9 only with explicit verified class carbon and supported factors. Add rejected ambiguous-volume-only and unsupported-other cases. | Conservation against8; source factors/class context; no automatic conversion or multiclass10/11 rewrite. B01/B02 remain open. |
| T09 Pure result kernels | Implement signed28,38,39,40,41,43-46 behind typed-input/period contracts; use independent ledger fixtures. | Correct conversion and brackets; separate reduction/removal/buffer outputs; no minting/rounding/negative clamping. These modules remain disconnected from production issuance while B05/B07/B08/B11 are open. |
| T10 Clarification-dependent baseline/products/disturbance | After recorded authority: implement general10/11,13,22-27,35,37 and automatic LF band selection. | Approved multi-class/multi-stratum/staggered-harvest/multi-year cases replace diagnostics as acceptance fixtures. No guessing indices, class carbon, missing SLF/OF or annualization. |
| T11 Full policy and Project Hub | After approved workflow/template versions: wire stages, monitoring, validation/verification, project-description/report transformations and mitigation-outcome issuance. | All applicable template branches and successful Hub delivery demonstrated; preserve narrow PR7107 scope separately. B12 resolved; no pending source ambiguity reaches minting. |
| T12 Bounty evidence | Full methodology/role/schema/workflow documentation, real-case validation, step-by-step screenshots and demo; regression and end-to-end evidence. | Every applicable approach mapped to tests; reviewed sources/clarifications published with the implementation; no claim that offline arithmetic alone satisfies issue5941. |

**Immediate priority:** T01/T02 and T04/T05. They settle reusable dimensional calculations without selecting blocked wood-product or annual-accounting interpretations. Reuse already verified equations3-8/12/48 through existing contracts; do not spend the next phase rewriting them.

## 9. Completion and limitations

All48 numbered equations have a source/page, formula/unit, inputs/provenance, dependencies, constraints/conditions, proposed file, and independent numerical check or explicitly diagnostic blocked case. Auxiliary rules A01-A12 and all VT0001 analysis routes are covered separately. No assertion is made that all48 are fully resolved for production: HOLD/LIMITED entries and B01-B12 are deliberate implementation gates.

The existing suite baseline is236 tests,235 passed,1 optional AJV check skipped. Phase3 changes only this specification and the handoff document; it does not build a policy, change calculations, alter the verified backups, or modify PR7107.
