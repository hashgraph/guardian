# Test Data — Clean and Efficient Cookstoves: Emission Reduction Calculations

This document walks a tester through a single end-to-end test run of the Efficient Cookstove policy using the Guardian UI forms (not the API). It covers the following emission reduction calculation sequence in the Monitoring Report stage:

**Baseline Emissions → Activity Emissions → Hawthorne Effect → Leakage Emissions → Net Emission Reductions**

---

## 1. What this test case covers

| Conditional path | Branch exercised in this test |
|---|---|
| Baseline Approach | **Historical Consumption (B-KPT)** |
| Wood precision check (90/10) | **PASS** — survey mean used as-is |
| Charcoal precision check (90/10) | **FAIL** — conservative lower bound substituted |
| Charcoal usage cap | no bind — confirms the value stops at the lower bound |
| Fleet split by fuel proportion | wood term uses 300 of the 500 stoves, charcoal term uses 200 |
| Activity precision check (90/10) | **FAIL** — conservative upper bound substituted |
| Monitoring Approach → HE Index | **dMRV-based** → HE Index = HEMax (1.0) |
| Activity Lifetime → embodied leakage | **Short-lived** → full per-unit charge, no ÷5 |

**The critical check in this test:** the baseline is adjusted **downward** (charcoal falls to its lower bound and is not pulled back up) while the activity emission is adjusted **upward** (fuel usage rises to its upper bound). Both moves must reduce the final ER.

---

## 2. Constants used by the math block

Not enterable on any form.

| Constant | Value | Unit | Status |
|---|---|---|---|
| Wood usage threshold | 0.75 | ton/capita/yr | Declared, not referenced in any formula |
| Charcoal usage threshold | 0.20 | ton/capita/yr | Same |
| Wood usage cap | 1.25 | ton/capita/yr | Active — used in `adjBkptWood` |
| Charcoal usage cap | 0.40 | ton/capita/yr | Active — used in `adjBkptCoal` |
| Precision threshold | 0.10 | — | Active, both fuels and activity side |
| HEMax | 1.0 | — | Active — HE Index under dMRV-based |
| Embodied default | 0.017 | tCO2e/unit | Active |
| Behavioral adjustment factor | 0.02 | — | Active — market leakage |

---

## 3. Form entry — Monitoring Report document

All fields below belong to Monitoring Report document. Fill them in the order the schema lists them; several sections use conditional visibility, which the checklist verifies.

### 3.1 Project Details (`project_details`)

| Field | Value to enter | Notes |
|---|---|---|
| Project Name | `Clean Cookstove Test Project 1` | — |
| Sector | `Energy` | — |
| Methodology and Version | `GS4GG PAA M400-07 SMEC v4.0` | Single-value enum |
| Host Country | `Sri Lanka` | Or any test country |
| Region / City / Postal Code | any test values | Postal code must match `^[A-Za-z0-9 ]{3,10}$` |
| PDD Version No | `1.0` | Still tracked even though the PDD performs no calculation in this build |
| MR Version No | `1.0` | — |
| MR Period No | `1` | — |
| Monitoring Start / End Date | `2026-09-01` / `2027-08-31` | — |
| Host Party | `Host Party` | — |
| Projected Reduction | `1800` | Free-typed estimate — not linked to any calculated field |
| Achieved Reduction | 396 | Free-typed reduction — not linked to any calculated field |
| Project Participants | any text | — |
| Methodology Reference | any text | — |
| Monitoring Description | any text | — |

### 3.2 Activity Developer Details (`activity_developer_details`)

Standard AD fields — name, email, physical address, website, contact name. Not calculation-relevant; any valid values will do.

### 3.3 Crediting Period Details (`crediting_period_details`)

| Field | Value to enter |
|---|---|
| Crediting Start Date | `2026-09-01` |
| Crediting End Date | `2031-08-31` |
| Type of Crediting Period | `Fixed` |


### 3.4 Project Implementation (`project_implementation`)

| Field | Value to enter |
|---|---|
| Description | any text |
| Changes / Deviations / Corrections | leave blank or enter free text — none are required |

### 3.5 Data and Parameters (`data_and_parameters`)

#### 3.5.1 Evidence files

| Field | Value | Notes |
|---|---|---|
| User Consent Forms | `ipfs://<sample>` | Must match `^ipfs://.+` |
| Distribution Data | `ipfs://<sample>` | Same pattern |

#### 3.5.2 Usage Survey (`usage_survey` sub-schema)

| Field | Value | Required? |
|---|---|---|
| Use/Non-use Definition | `ipfs://<sample>` | Required |
| Household Survey | `ipfs://<sample>` | Required |
| Proofs for Survey Accuracy | `ipfs://<sample>` | Required |
| Proofs for Campaigns | `["ipfs://<sample1>", "ipfs://<sample2>"]` | Required — array, confirm the form accepts multiple entries |
| Continuous Monitoring Proofs | leave blank | Not required — confirm the form doesn't force an entry here |

#### 3.5.3 Fuel Data (`fuel_data`)

| Field | Value | Unit |
|---|---|---|
| WCCF | `4:1` | — |
| Fuelwood CO2 EF | `119.5` | tCO2/TJ |
| Fuelwood Non-CO2 EF | `9.5` | tCO2/TJ |
| Fraction of Fuelwood Non-Renewable Biomass | `0.40` | — |
| Fuelwood NCV | `0.015` | TJ/ton |
| Charcoal CO2 EF | `116.5` | tCO2/TJ |
| Charcoal Non-CO2 EF | `12.0` | tCO2/TJ |
| Fraction of Charcoal Non-Renewable Biomass | `0.45` | — |
| Charcoal NCV | `0.030` | TJ/ton |
| Non-IPCC NCV Justification | leave blank or free text | Not required |
| fNRB Proof | `ipfs://<sample>` | Required |

#### 3.5.4 Baseline Data (`baseline_data`)

| Field | Value | Unit |
|---|---|---|
| **Baseline Approach** | `Historical Consumption (B-KPT)` | — |
| Number of Baseline Cookstoves | `500` | households |
| Baseline Usage Rate | `0.9` | — |
| Baseline Household Size | `5` | individuals/household |
| DAF | `0.05` | — |
| Wood Usage | `4.5` | ton/household/yr |
| B-KPT Fuelwood Usage Proportion | `0.6` | — 60% of surveyed households use fuelwood. This value now drives both the precision sample size and the fleet split |
| Charcoal Usage | `1.4` | ton/household/yr |
| B-KPT Charcoal Usage Proportion | `0.4` | — |
| Sampled Households | `80` | households |
| Standard Deviation of Sample | `1.5` | ton/household/yr — shared between both fuels |

| Auto-computed (hidden, do not enter) | Expected value |
|---|---|
| Baseline Wood T Value | `1.6779` |
| Baseline Coal T Value | `1.6955` |

#### 3.5.5 Activity Data (`activity_data`)

| Field | Value | Unit |
|---|---|---|
| Number of Activity Cookstoves | `500` | households |
| Activity Usage Rate | `0.92` | — |
| Activity Fuel Type | `Wood` | — |
| Activity Fuel Usage | `2.0` | ton/household/yr |
| Activity Household Size | `5` | individuals/household |
| Activity Lifetime | `Short-lived` | — |
| Units Disseminated | `500` | units |
| Number of Households Sampled | `60` | households |
| Standard Deviation of Sampled Data | `1.2` | ton/household/yr |

| Auto-computed (hidden, do not enter) | Expected value |
|---|---|
| Activity Fuel T Value | `1.6711` |

#### 3.5.6 Hawthorne Effect Data (`hawthorne_data`)

| Field | Value | Notes |
|---|---|---|
| **Monitoring Approach** | `dMRV-based` | Enter first |
| HE Default | field must not appear | This field is schema-gated to `Manual` only. If it renders on screen under `dMRV-based`, that's a defect. |
| Average Activity Usage Unobserved / Observed, Unobserved Monitoring Start/End Date | not applicable | Gated to `SUM-based` only |

### 3.6 SDG Impact (`sdg_impact`)

| Field | Value |
|---|---|
| Climate Action Impact | any text |
| Climate Action Evidence | `ipfs://<sample>` |
| SDG Impacts | at least one entry, e.g. `{"sdg": "1. No Poverty", "expected_income": "text"}` |

---

## 4. Expected calculations

All of this now happens in a single pass when the one document above is submitted. The arithmetic is identical to the previous version of this test.

### 4.1 Effective sample size per fuel

```
nWood = 80 × 0.6 = 48
nCoal = 80 × 0.4 = 32
```

### 4.2 Standard error and margin of error

```
SE_wood  = 1.5 ÷ √48  = 0.21650635094610966713186158537646822846946344771740
MOE_wood = 1.6779 × SE_wood = 0.36327600625247741048055055410317604054891271892503

SE_coal  = 1.5 ÷ √32  = 0.26516504294495528392563327157864214650491989390865
MOE_coal = 1.6955 × SE_coal = 0.44958733031317168389591121196158775939909168012212
```

### 4.3 Precision check

```
precisionWood = 0.36327600625247741048055055410317604054891271892503 ÷ 4.5
              = 0.080728001389439424551233456467372453455313937538896  → PASS

precisionCoal = 0.44958733031317168389591121196158775939909168012212 ÷ 1.4
              = 0.321133807366551202782793722829705542427922628658660  → FAIL

statBkptWood = 4.5
statBkptCoal = Max(1.4 − 0.44958733031317168389591121196158775939909168012212, 0)
             = 0.95041266968682831610408878803841224060090831987788
```

### 4.4 Usage cap (no threshold floor)

```
adjBkptWood = Min(4.5, 1.25 × 5)  = Min(4.5, 6.25)  = 4.5      (no bind)
adjBkptCoal = Min(0.95041266968682831610408878803841224060090831987788, 0.40 × 5)
            = Min(0.95041266968682831610408878803841224060090831987788, 2.00)
            = 0.95041266968682831610408878803841224060090831987788   (no bind)
```

> ✅ **Checkpoint 1:** charcoal lands at ≈`0.9504`, not `1.00`.

### 4.5 Fleet split by fuel proportion

```
bkptStovesWood = 500 × 0.6 = 300
bkptStovesCoal = 500 × 0.4 = 200
```

> ✅ **Checkpoint 2:** intermediate stove counts, read 300 and 200 — not 500 and 500.

### 4.6 Baseline emission — unadjusted and statistically-adjusted

```
wood bracket = (119.5 × 0.40) + 9.5  = 57.300
coal bracket = (116.5 × 0.45) + 12.0 = 64.425

unadjBkptBE = 0.9 × [300 × 4.5 × 0.015 × 57.300 + 200 × 1.4 × 0.030 × 64.425]
            = 0.9 × [1160.325 + 541.17]
            = 0.9 × 1701.495
            = 1531.3455

adjBkptBE   = 0.9 × [300 × 4.5 × 0.015 × 57.300 + 200 × 0.95041266968682831610408878803841224060090831987788 × 0.030 × 64.425]
            = 0.9 × [1160.325 + 367.38201746744350381753552101560400160428111104880]
            = 0.9 × 1527.70701746744350381753552101560400160428111104880
            = 1374.93631572069915343578196891404360144385299994392
```

### 4.7 Full baseline chain

```
uncBE   = 1374.93631572069915343578196891404360144385299994392
BauBE   = 1374.93631572069915343578196891404360144385299994392
adjBE   = uncBE × (1 − 0.05) = 1306.18949993466419576399287046834142137166034994672
BE      = Max(Min(adjBE, BauBE), 0) = 1306.18949993466419576399287046834142137166034994672
deltaBE = BauBE − BE = 68.74681578603495767178909844570218007219264999720
```

> ✅ **Checkpoint 3:** `deltaBE` = exactly 5% of `uncBE` — confirms the DAF is being subtracted correctly.

### 4.8 Activity emission

```
SE  = 1.2 ÷ √60 = 0.15491933384829667081434123198259210502834594253154
MOE = 1.6711 × SE = 0.25888569879388856659784563276610966671286890456446

precision = MOE ÷ 2.0 = 0.12944284939694428329892281638305483335643445228223  → FAIL

statActivityFuel = 2.0 + 0.25888569879388856659784563276610966671286890456446
                 = 2.2588856987938885665978456327661096667128689045645

activity bracket = (119.5 × 0.40) + 9.5 = 57.300

AE = 500 × 0.92 × (2.2588856987938885665978456327661096667128689045645 × 0.015 × 57.300)
   = 893.09563873213972257579022782673677892826697879767
```

### 4.9 HE Index

```
Monitoring Approach = dMRV-based → HE Index = 1.0
```

> ✅ **Checkpoint 5:** confirm `he_default` was never entered, and `HE Index` still resolves to exactly `1.0`.

### 4.10 Leakage

```
LEEmbodied = 500 × 0.017 = 8.500

BE − AE = 1306.18949993466419576399287046834142137166034994672 − 893.09563873213972257579022782673677892826697879767
        = 413.09386120252447318820264264160464244339337114905

LEMarket = 413.09386120252447318820264264160464244339337114905 × 0.02
         = 8.26187722405048946376405285283209284886786742298

LE = 8.500 + 8.26187722405048946376405285283209284886786742298
   = 16.76187722405048946376405285283209284886786742298
```

### 4.11 Emission Reduction

```
ER = 413.09386120252447318820264264160464244339337114905 × 1.0 − 16.76187722405048946376405285283209284886786742298
   = 396.33198397847398372443858978877254959452550372607
```

---

## 5. Expected output summary

| Output field (schema path) | Expected value |
|---|---|
| `emission_calculations.be.be_unadj` | 1531.3455 |
| `emission_calculations.be.be_unc` | 1374.93631572069915343578196891404360144385299994392 |
| `emission_calculations.be.be_bau` | 1374.93631572069915343578196891404360144385299994392 |
| `emission_calculations.be.be_adj` | 1306.18949993466419576399287046834142137166034994672 |
| `emission_calculations.be.be` | 1306.18949993466419576399287046834142137166034994672 |
| `emission_calculations.be.be_delta` | 68.74681578603495767178909844570218007219264999720 |
| `emission_calculations.activity_emission` | 893.09563873213972257579022782673677892826697879767 |
| `emission_calculations.he_index` | 1.0 |
| `emission_calculations.le.le_embodied` | 8.500 |
| `emission_calculations.le.le_market` | 8.26187722405048946376405285283209284886786742298 |
| `emission_calculations.le.le` | 16.76187722405048946376405285283209284886786742298 |
| **`emission_calculations.emission_reduction`** | **396.33198397847398372443858978877254959452550372607** |

---

## 6. Verification checklist

- [ ] **Fleet split correct:** wood term uses 300 stoves, charcoal term uses 200 — not 500 and 500.
- [ ] **Full baseline chain present:** all six `be.*` outputs populated; `deltaBE` = 5% of `uncBE`.
- [ ] **Conditional field visibility — Baseline Approach:** switching between MSL and B-KPT swaps the required-field set correctly, and the `else` branch genuinely disables the other branch's fields.
- [ ] **Conservativeness direction:** charcoal usage moved down (1.4 → ≈0.9504); activity fuel usage moved up (2.0 → ≈2.2589).
- [ ] **Sample size, not population:** precision used 80 and 60, not 500.
- [ ] **t-values auto-populated:** `1.6779`, `1.6955`, `1.6711`.
- [ ] **HE Index:** exactly `1.0` under dMRV-based.
- [ ] **Embodied leakage:** `8.5`, not `1.7`.
- [ ] **Non-calculating fields:** WCCF, Non-IPCC NCV Justification, Continuous Monitoring Proofs, Project Participants, Methodology Reference, Monitoring Description — none of these affect any calculated output.
- [ ] **Evidence file patterns:** all IPFS-pattern fields (`user_consent_forms`, `distribution_data`, `fnrb_proof`, everything in `usage_survey`, `climate_action_evidence`) reject values that don't start with `ipfs://`.

---

## 7. Quick sanity reference

| Intermediate | Expected |
|---|---|
| nWood / nCoal | 48 / 32 |
| precisionWood | ≈0.0807 (PASS) |
| precisionCoal | ≈0.3211 (FAIL) |
| statBkptWood / adjBkptWood | 4.5 / 4.5 |
| statBkptCoal / adjBkptCoal | ≈0.9504 / ≈0.9504 |
| bkptStovesWood / bkptStovesCoal | 300 / 200 |
| be_unadj | 1531.3455 |
| be_unc / be_bau | ≈1374.9363 |
| be_delta | ≈68.7468 |
| **be (final BE)** | **≈1306.1895** |
| precision (activity) | ≈0.1294 (FAIL) |
| statActivityFuel | ≈2.2589 |
| **activity_emission** | **≈893.0956** |
| he_index | 1.0 |
| le_embodied | 8.5 |
| le_market | ≈8.2619 |
| le | ≈16.7619 |
| **emission_reduction** | **≈396.3320** |