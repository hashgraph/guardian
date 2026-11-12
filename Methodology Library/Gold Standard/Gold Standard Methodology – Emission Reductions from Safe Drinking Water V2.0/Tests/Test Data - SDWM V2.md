# Test Data — Emission Reduction From Safe Drinking Water Supply: Version 2.0 — Emission Reduction Calculations

This document walks through sample calculations for two project types under the Gold Standard Emission Reductions from Safe Drinking Water Supply methodology:

- **IWT** — Institutional Water Treatment (e.g. schools, clinics)
- **CWT / CWS** — Community Water Treatment / Community Water Supply (e.g. rural households)

Baseline Emissions → Activity Emissions → Leakage Emissions → Net Emission Reductions.

---

## 1. Baseline Emission Factor (Sri Lanka Site 1)

### 1.1 Stove-level inputs (`stove_details`)

#### Stove 1: Three-stone fire (wood)
* **Stove Type:** Three-stone fire (wood)
* **Efficiency ($\eta_{w,b}$) (%):** 15
* **Stove Share (%):** 55

**Baseline Fuels (`baseline_fuels`):**
| # | Fuel | EFb_CO2 (t/TJ) | EFb_nonCO2 (t/TJ) | fNRB | Comb. EFb (t/TJ) | xf (%) |
|---|---|---|---|---|---|---|
| 1 | Firewood | 112 | 9.46 | 0.85 | 104.66 | 100 |

---

#### Stove 2: Other conventional biomass (wood)
* **Stove Type:** Other conventional biomass (wood)
* **Efficiency ($\eta_{w,b}$) (%):** 25
* **Stove Share (%):** 25

**Baseline Fuels (`baseline_fuels`):**
| # | Fuel | EFb_CO2 (t/TJ) | EFb_nonCO2 (t/TJ) | fNRB | Comb. EFb (t/TJ) | xf (%) |
|---|---|---|---|---|---|---|
| 1 | Firewood | 112 | 9.46 | 0.85 | 104.66 | 100 |

---

#### Stove 3: Improved cookstove (wood)
* **Stove Type:** Improved cookstove (wood)
* **Efficiency ($\eta_{w,b}$) (%):** 30
* **Stove Share (%):** 10

**Baseline Fuels (`baseline_fuels`):**
| # | Fuel | EFb_CO2 (t/TJ) | EFb_nonCO2 (t/TJ) | fNRB | Comb. EFb (t/TJ) | xf (%) |
|---|---|---|---|---|---|---|
| 1 | Firewood | 112 | 9.46 | 0.85 | 104.66 | 100 |

---

#### Stove 4: Kerosene
* **Stove Type:** Kerosene
* **Efficiency ($\eta_{w,b}$) (%):** 45
* **Stove Share (%):** 10

**Baseline Fuels (`baseline_fuels`):**
| # | Fuel | EFb_CO2 (t/TJ) | EFb_nonCO2 (t/TJ) | fNRB | Comb. EFb (t/TJ) | xf (%) |
|---|---|---|---|---|---|---|
| 1 | Fossil | 74.1 | 0 | 1 | 74.1 | 100 |

$$\text{Combined EF}_b = \text{EF}_{b,\text{CO2}} \times f_{\text{NRB},f,y} + \text{EF}_{b,\text{nonCO2}}$$

---

### 1.2 Baseline Emission Factor (EFb)

**Equations**

```
etaWb = Σ [ (stove_share / 100) × ɳw,b ]

SEw,b,y = (360.83 × 100) ÷ etaWb

weightedFuelEF = Σ [ (stove_share / 100) × Σ ( (xf / 100) × Combined EFb ) ]

EFb = (SEw,b,y × weightedFuelEF) ÷ 10⁹      [tCO2e/L]
```

**Calculation**

```
etaWb = (0.55 × 15) + (0.25 × 25) + (0.10 × 30) + (0.10 × 45)
      = 8.25 + 6.25 + 3.00 + 4.50
      = 22.0%

SEw,b,y = (360.83 × 100) ÷ 22.0
        = 1640.1363636363637 kJ/L

weightedFuelEF = (0.55 × 104.66 × 1.00)
               + (0.25 × 104.66 × 1.00)
               + (0.10 × 104.66 × 1.00)
               + (0.10 × 74.10  × 1.00)
               = (0.90 × 104.66) + (0.10 × 74.10)
               = 94.194 + 7.41
               = 101.604 tCO2/TJ

EFb = (1640.1363636363637 × 101.604) ÷ 10⁹

EFb = 0.0001666444150909091 tCO2e/L
```

---

## 2. IWT Project — Sri Lanka Site 1

### 2.1 Premises and individual water demand

| Premises | Count (Np,y) | Indiv. Type | Persons (HNp,y,i) | Demand (L/p/d) | Days (DPp,y) |
|---|---|---|---|---|---|
| School | 4 | Adults | 8 | 2.0 | 220 |
| School | 4 | Day Children | 120 | 2.0 | 220 |
| Clinic | 3 | Medical Staff | 5 | 2.0 | 300 |
| Clinic | 3 | Day Patients | 30 | 2.0 | 300 |

**Total water per day for the premises (TW)**

```
TW = Σ HNp,y,i × QPWp,i
   = (8 × 2.0) + (120 × 2.0) + (5 × 2.0) + (30 × 2.0)
   = 326 L/day
```

### 2.2 Technology capacity per premises

| Premises | Cap (L/h) | Use (h/d) | Units (DNp,y) | Days | Comments | Overlap note |
|---|---|---|---|---|---|---|
| School | 10 | 5 | 2 | 220 | Cap (100 L/d) < Pop Cap (256 L/d) | No overlap |
| Clinic | 15 | 6 | 1 | 300 | UV disinfection unit specs attached | No overlap |

**Volume of drinking water per day, per premises (QPWhh,p,y)**

```
QPWhh,p,y = min[(qi × tp,y × DNp,y), (HNp,y × QPWp)]

School: min[(10 × 5 × 2), 256] = 100 L/day
Clinic: min[(15 × 6 × 1), 70]  = 70 L/day
```

### 2.3 Unadjusted quantity of safe drinking water (Qy,unadj)

```
Qy,unadj = Σ Np,y × QPWhh,p,y × DPp,y
         = (4 × 100 × 220) + (3 × 70 × 300)
         = 151,000 L
```

### 2.4 Unadjusted baseline emissions

| Proportion already using safe water supply in baseline (Cb) |
|---|
| 0.05 |

```
BEunadj,y = EFb × (1 − Cb) × Qy,unadj
          = 0.0001666444150909091 × (1 − 0.05) × 151,000
          = 23.905141344790913 tCO2e/yr
```

### 2.5 Adjusted quantity of safe drinking water

| Boiling safe water (Xcleanboil,y) | Water quality modifier (Mq,y) | Usage rate (Up,y) |
|---|---|---|
| 0.03 | 0.92 | 0.88 |

```
Qy,adj = Qy,unadj × (1 − Xcleanboil,y) × Mq,y × Up,y
       = 151,000 × (1 − 0.03) × 0.92 × 0.88
       = 118582.112 L/yr
```

### 2.6 Baseline emissions adjusted for uncertainty/compliance

```
BEunc,y = EFb × (1 − Cb) × Qy,adj
        = 0.0001666444150909091 × (1 − 0.05) × 118582.112
        = 18.77299435976044 tCO2e/yr
```

### 2.7 Downward adjustment (Net Zero DAF)

| Downward Adjustment Factor (DAFNetZero) | Conservative BAU (BAUy = BEunc,y) |
|---|---|
| 0.0345 | 18.77299435976044 |

```
BEadj,y = BEunc,y × (1 − DAFNetZero)
        = 18.77299435976044 × (1 − 0.0345)
        = 18.125326054348704 tCO2e/yr

BEy = min(BEadj,y, BAUy)
    = min(18.125326054348704, 18.77299435976044)
    = 18.125326054348704 tCO2e/yr

Δy = BAUy − BEy
   = 18.77299435976044 − 18.125326054348704
   = 0.6476683054117345 tCO2e/yr
```

**Baseline Emission summary**

| Location | Baseline Emission (tCO2e/yr) |
|---|---|
| Sri Lanka Site 1 | 18.125326054348704 |
| **Total** | **18.125326054348704** |

### 2.8 Activity Emission Calculation

| Elec Source | Qty (kWh) | EF (tCO2/kWh) | T&D (%) | Fuel | Qty (kg) | NCV (TJ/Gg) | EF (tCO2/TJ) |
|---|---|---|---|---|---|---|---|
| Grid | 2400 | 0.001 | 10 | Diesel | 100.2 | 43 | 74.1 |

```
AEf,f,py = (Pp,f,y × NCVf × EFf) ÷ 10⁶
         = (100.2 × 43 × 74.1) ÷ 10⁶
         = 0.31926726 tCO2e/yr

AEec,p,y = ECp,y × EFec × (TDLec + 1)
         = 2400 × 0.001 × (1 + 0.10)
         = 2.64 tCO2e/yr

AEy = AEf,f,py + AEec,p,y
    = 0.31926726 + 2.64
    = 2.95926726 tCO2e/yr
```

### 2.9 Leakage Emissions

**Embodied leakage**

| Representative Technology | Default Deduction (kg CO2e/unit) | Disseminated (units) |
|---|---|---|
| Basic Filter | 8 | 3 |
| Water Dispenser System | 25 | 4 |

```
LEEmbodied,y = [Σ Ndisseminated,y × EFembodied,default] ÷ 1000
             = [(8 × 3) + (25 × 4)] ÷ 1000
             = 0.124 tCO2e/yr
```

**Market and Behavioral Leakage — Scenario 1 (Option 1, default 2% deduction)**

```
LEMarket,y = (BEy − AEy) × 0.02
           = (18.125326054348704 − 2.95926726) × 0.02
           = 0.3033211758869741 tCO2e/yr

LEy = LEEmbodied,y + LEMarket,y
    = 0.124 + 0.3033211758869741
    = 0.4273211758869741 tCO2e/yr

ERy = (BEy − AEy) − LEy
    = (18.125326054348704 − 2.95926726) − 0.4273211758869741
    = 14.73873761846173 tCO2e/yr
```

**Market and Behavioral Leakage — Scenario 2 (Option 3, source-by-source)**

| Leakage Source | Estimated Leakage (tCO2e/yr) | Justification |
|---|---|---|
| Biomass Redistribution Leakage | 0.30 | N/A |
| Additional Maintenance Transport | 0.08 | N/A |
| Device Disposal Leakage | 0.04 | N/A |

```
LEMarket,y = 0.30 + 0.08 + 0.04 = 0.42 tCO2e/yr

LEy = LEEmbodied,y + LEMarket,y
    = 0.124 + 0.42
    = 0.544 tCO2e/yr

ERy = (BEy − AEy) − LEy
    = (18.125326054348704 − 2.95926726) − 0.544
    = 14.622058794348703 tCO2e/yr
```

---

## 3. CWT / CWS Project — Sri Lanka Site 1

### 3.1 Unadjusted baseline emission

```
BEunadj,y = EFb × (1 − Cb) × Qy,unadj
          = 0.0001666444150909091 × (1 − 0.05) × 151,000
          = 23.905141344790913 tCO2e/yr
```

### 3.2 Monitored quantity of safe water

| Monitored safe water provided in year (L) (Qm,y) |
|---|
| 720,000 |

### 3.3 Premises and household water demand

| Premises | Count (HHp,y) | Indiv. Type | Persons (HNp,y,i) | Demand (L/p/d) | Days (DOp,y) |
|---|---|---|---|---|---|
| Rural Households | 120 | Adults | 200 | 4 | 365 |
| Rural Households | 120 | Children | 50 | 0.9 | 365 |

```
TW = Σ HNp,y,i × QPWp,i
   = (200 × 4) + (50 × 0.9)
   = 845 L/day

Qpop,y = Σ HHp,y × TW × DOp,y
       = 120 × 845 × 365
       = 37,011,000 L/yr

Qy,unadj = min(Qm,y, Qpop,y)
         = min(720,000, 37,011,000)
         = 720,000 L/yr
```

### 3.4 Unadjusted baseline emission (recomputed with CWT Qy,unadj)

| Cb (Factor) |
|---|
| 0.05 |

```
BEunadj,y = EFb × (1 − Cb) × Qy,unadj
          = 0.0001666444150909091 × (1 − 0.05) × 720,000
          = 113.98477992218183 tCO2e/yr
```

### 3.5 Adjusted quantity and uncertainty-adjusted baseline

| Xcleanboil,y | Mq,y |
|---|---|
| 0.03 | 0.92 |

```
Qy,adj = Qy,unadj × (1 − Xcleanboil,y) × Mq,y
       = 720,000 × (1 − 0.03) × 0.92
       = 642528 L/yr

BEunc,y = EFb × (1 − Cb) × Qy,adj
        = 0.0001666444150909091 × (1 − 0.05) × 642528
        = 101.72001760255506 tCO2e/yr

BEadj,y = 101.72001760255506 × (1 − 0.0345)
        = 98.21067699526691 tCO2e/yr

BEy = min(98.21067699526691, 101.72001760255506)
    = 98.21067699526691 tCO2e/yr

Δy = 101.72001760255506 − 98.21067699526691
   = 3.509340607288152 tCO2e/yr
```

**Baseline Emission summary**

| Location | Baseline Emission (tCO2e/yr) |
|---|---|
| Sri Lanka Site 1 | 98.21067699526691 |
| **Total** | **98.21067699526691** |

### 3.6 Activity Emission Calculation

| Elec Source | Qty (kWh) | EF (tCO2/kWh) | T&D (%) | Fuel | Qty (kg) | NCV (TJ/Gg) | EF (tCO2/TJ) |
|---|---|---|---|---|---|---|---|
| National Grid | 3000 | 0.0005 | 10 | Diesel | 127.5 | 43 | 74.1 |

```
AEf,f,py = (127.5 × 43 × 74.1) ÷ 10⁶
         = 0.40625325 tCO2e/yr

AEec,p,y = 3000 × 0.0005 × (1 + 0.10)
         = 1.65 tCO2e/yr

AEy = 0.40625325 + 1.65
    = 2.05625325 tCO2e/yr
```

### 3.7 Leakage Emissions

**Embodied leakage**

| Representative Technology | Default Deduction (kg CO2e/unit) | Units |
|---|---|---|
| UV Treatment Units | 90 | 2 |
| Dispensing & Storage Units | 120 | 1 |

```
LEEmbodied,y = [(90 × 2) + (120 × 1)] ÷ 1000 = 0.3 tCO2e/yr
```

**Scenario 3 (Option 1, default 2% deduction — used in project aggregation)**

```
LEMarket,y = (98.21067699526691 − 2.05625325) × 0.02
           = 1.9230884749053383 tCO2e/yr

LEy = 0.3 + 1.9230884749053383
    = 2.2230884749053383 tCO2e/yr

ERy = (98.21067699526691 − 2.05625325) − 2.2230884749053383
    = 93.93133527036157 tCO2e/yr
```

**Scenario 4 (Option 3, source-by-source)**

| Leakage Source | Estimated Leakage (tCO2e/yr) | Justification |
|---|---|---|
| Biomass Redistribution | 0.45 | N/A |
| Maintenance Transport | 0.023 | N/A |
| Replacement Components | 0.036 | N/A |
| Compensation Heating Leakage | N/A | No evidence of increased heating fuel use |

```
LEMarket,y = 0.45 + 0.023 + 0.036 = 0.509 tCO2e/yr
LEy        = 0.3 + 0.509 = 0.809 tCO2e/yr
ERy        = (98.21067699526691 − 2.05625325) − 0.809 = 95.34542374526691 tCO2e/yr
```

---

## 4. Multi-Location Scenario 5 — Sri Lanka Site 2 (CWT/CWS)

```
Qm,y  = 540,000 L
HHp,y = 90
  Adults:   HN = 160, QPWp,i = 4 L/day
  Children: HN = 40,  QPWp,i = 1 L/day
DOp,y = 365

TW = (160 × 4) + (40 × 1) = 680 L/day

Qpop,y   = 90 × 680 × 365 = 22,338,000 L/yr
Qy,unadj = min(540,000, 22,338,000) = 540,000 L/yr

Cb = 0.04
BEunadj,y = 0.0001666444150909091 × (1 − 0.04) × 540,000
          = 86.38846478312728 tCO2e/yr

Xcleanboil,y = 0.03
Mq,y         = 0.89
Up,y         = 1

Qy,adj = 540,000 × (1 − 0.03) × 0.89 × 1 = 466182 L/yr

BEunc,y = EFb × (1 − 0.05) × Qy,adj
        = 0.0001666444150909091 × (1 − 0.05) × 466182
        = 73.80229538011469 tCO2e/yr

DAFNetZero = 0.0345
BAUy       = 73.80229538011469
BEadj,y    = 73.80229538011469 × (1 − 0.0345) = 71.25611618950073 tCO2e/yr
BEy        = min(71.25611618950073, 73.80229538011469) = 71.25611618950073 tCO2e/yr
Δy         = 73.80229538011469 − 71.25611618950073 = 2.5461791906139553 tCO2e/yr
```

### Activity Emission

```
EFp,y  = 2200
EFec   = 0.0005
TDLec  = 10%

AEec,p,y = 2200 × 0.0005 × (1 + 0.10) = 1.21 tCO2e/yr

Pp,f,y = 95
NCVf   = 43
EFf    = 74.1

AEf,f,py = (95 × 43 × 74.1) ÷ 10⁶ = 0.3026985 tCO2e/yr

AEy = 1.21 + 0.3026985 = 1.5126985 tCO2e/yr
```

### Leakage Emission

```
LEEmbodied,y = (80 + 90) ÷ 1000 = 0.17 tCO2e/yr

LEMarket,y (Option 3, source-by-source):
```
| Leakage Source | Leakage (tCO2e/yr) | Justification |
|---|---|---|
| Biomass Redistribution | 0.45 | N/A |
| Maintenance Transport | 0.023 | N/A |
| Replacement Components | 0.036 | N/A |
| Compensation Heating Leakage | N/A | No evidence of increased heating fuel use |

```
LEMarket,y = 0.45 + 0.023 + 0.036 = 0.509 tCO2e/yr

LEy = 0.17 + 0.509 = 0.679 tCO2e/yr

ERy = (71.25611618950073 − 1.5126985) − 0.679 = 69.06441768950073 tCO2e/yr
```

---

## 5. Final Multi-Location Aggregation

| Location | Baseline (tCO2e/yr) | Activity (tCO2e/yr) | Leakage (tCO2e/yr) | Net ER (tCO2e/yr) |
|---|---|---|---|---|
| Sri Lanka Site 1 (CWT - Option 1) | 98.21067699526691 | 2.05625325 | 2.2230884749053383 | 93.93133527036157 |
| Sri Lanka Site 2 (CWT - Option 3) | 71.25611618950073 | 1.5126985 | 0.679 | 69.06441768950073 |
| **Project (Total)** | **169.46679318476765** | **3.56895175** | **2.902088474905338** | **162.9957529598623** |