# Test Data — Emmision Reduction From Safe Drinking Water Supply: Version 2.0 — Emission Reduction Calculations

This document walks through sample calculations for two project types under the Gold Standard Emission Reductions from Safe Drinking Water Supply methodology:

- **IWT** — Institutional Water Treatment (e.g. schools, clinics)
- **CWT / CWS** — Community Water Treatment / Community Water Supply (e.g. rural households)

Baseline Emissions → Activity Emissions → Leakage Emissions → Net Emission Reductions.

> **Note on precision:** every value below is carried through the full calculation chain at full decimal precision — no intermediate rounding. Only the original input figures (efficiencies, factors, counts) are taken as given; every derived result is left unrounded, however many decimal places that produces.

---

## 1. Baseline Emission Factor (Sri Lanka Site 1)

### 1.1 Stove-level inputs

| Stove Type | Efficiency (%) (ɳw,b) | Specific energy required to boil water (SEw,b,y) (kJ/L) | CO2 Emission Factor (EFb_CO2) (tCO2/TJ) | Fraction of Non-Renewable Biomass (fNRB,f,y) | Non-CO2 Emission Factor (EFb_nonCO2) (tCO2/TJ) | Combined EFb (tCO2/TJ) | % of stove (xf) | Additional Comments |
|---|---|---|---|---|---|---|---|---|
| Three-stone fire (wood) | 15 | 2405.5333333333 | 112 | 0.85 | 9.46 | 104.66 | 55 | — |
| Other conventional biomass (wood) | 25 | 1443.32 | 112 | 0.85 | 9.46 | 104.66 | 25 | — |
| Improved cookstove (wood) | 30 | 1202.766666666667 | 112 | 0.85 | 9.46 | 104.66 | 10 | — |
| Kerosene (fossil) | 45 | 801.8444444444444 | 74.1 | 1 | 0 | 74.1 | 10 | — |

### 1.2 Baseline Emission Factor (EFb)

**Equation**

```
EFb = (Σ Combined EFb × (xf / 100) × SEw,b,y) ÷ 10⁹      [tCO2e/L]
```

**Calculation**

```
EFb = [(104.66 × 0.55 × 2405.5333333333)
     + (104.66 × 0.25 × 1443.32)
     + (104.66 × 0.10 × 1202.766666666667)
     + (74.1   × 0.10 × 801.8444444444444)] ÷ 10⁹

EFb = 0.000194764006333331417726 tCO2e/L
```

---

## 2. IWT Project — Sri Lanka Site 1

### 2.1 Premises and individual water demand

| Premises Type (p) | No. of premises with ≥1 technology (Np,y) | Individual Type | No. of individuals (HNp,y,i) | Drinking water per person (L) (QPWp,i) | Days Present (DPp,y) |
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

| Premises Type (p) | Capacity (qi) (L/hour) | Usage time (tp,y) (Hour) | Avg. no. of technologies (DNp,y) | Days Present (DPp,y) | Additional Comments | HWT/IWT overlap note |
|---|---|---|---|---|---|---|
| School | 10 | 5 | 2 | 220 | Device capacity (100 L/day) < Population Capacity (256 L/day) | No overlap with HWT activity in this boundary |
| Clinic | 15 | 6 | 1 | 300 | — | UV disinfection unit specs attached |

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

| Proportion of end-users already using a safe water supply not requiring boiling, in baseline (Cb) |
|---|
| 0.05 |

```
BEunadj,y = EFb × (1 − Cb) × Qy,unadj
          = 0.000194764006333331417726 × (1 − 0.05) × 151,000
          = 27.938896708516391872795 tCO2e/yr
```

### 2.5 Adjusted quantity of safe drinking water

| Proportion boiling safe (project) water (Xcleanboil,y) | Water quality modifier (Mq,y) | Usage rate of project technology (Up,y) |
|---|---|---|
| 0.03 | 0.92 | 0.88 |

```
Qy,adj = Qy,unadj × (1 − Xcleanboil,y) × Mq,y × Up,y
       = 151,000 × (1 − 0.03) × 0.92 × 0.88
       = 118,582.112 L/yr
```

### 2.6 Baseline emissions adjusted for uncertainty/compliance

```
BEunc,y = EFb × (1 − Cb) × Qy,adj
        = 0.000194764006333331417726 × (1 − 0.05) × 118,582.112
        = 21.940750851958424734408151 tCO2e/yr
```

### 2.7 Downward adjustment (Net Zero DAF)

| Downward Adjustment Factor (DAFNetZero) | Conservative Business-as-Usual (BAUy = BEunc,y) |
|---|---|
| 0.0345 | 21.940750851958424734408151 |

```
BEadj,y = BEunc,y × (1 − DAFNetZero)
        = 21.940750851958424734408151 × (1 − 0.0345)
        = 21.183794947565859081071070 tCO2e/yr

BEy (Final Crediting Baseline Emission) = min(BEadj,y, BAUy)
                                         = min(21.183794947565859081071070, 21.940750851958424734408151)
                                         = 21.183794947565859081071070 tCO2e/yr

Δy (emissions excluded due to DAF) = BAUy − BEy
                                    = 21.940750851958424734408151 − 21.183794947565859081071070
                                    = 0.756955904392565653337081 tCO2e/yr
```

**Baseline Emission summary**

| Location | Baseline Emission (tCO2e/yr) |
|---|---|
| Sri Lanka Site 1 | 21.183794947565859081071070 |
| **Total** | **21.183794947565859081071070** |

### 2.8 Activity Emission Calculation

| Electricity Source | Qty consumed by project technology (kWh) | Emission factor of electricity use (tCO2/kWh) | Transmission & distribution losses (%) | Fossil fuel type (f) | Qty of fossil fuel consumed (Pp,f,y) (kg) | Net calorific value (TJ/Gg) | Emission factor of fossil fuel (tCO2/TJ) |
|---|---|---|---|---|---|---|---|
| Grid Electricity | 2400 | 0.001 | 10 | Diesel | 100.2 kg | 43 | 74.1 |

```
Emission from fossil fuel (AEf,f,py) = (Pp,f,y × NCVf × EFf) ÷ 10⁶
                                      = (100.2 × 43 × 74.1) ÷ 10⁶
                                      = 0.31926726 tCO2e/yr

Emission from electricity use (AEec,p,y) = ECp,y × EFec × (TDLec + 1)
                                          = 2400 × 0.001 × (1 + 0.10)
                                          = 2.64 tCO2e/yr

Total Activity Emission (AEy) = AEf,f,py + AEec,p,y
                               = 0.31926726 + 2.64
                               = 2.95926726 tCO2e/yr
```

### 2.9 Leakage Emissions

**Embodied leakage**

| Representative Technologies | Default Deduction (kg CO2e/unit) (EFembodied,default) | No. of devices/systems disseminated (Ndisseminated,y) |
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
           = (21.183794947565859081071070 − 2.95926726) × 0.02
           = 0.364490553751317181621421 tCO2e/yr

LEy = LEEmbodied,y + LEMarket,y
    = 0.124 + 0.364490553751317181621421
    = 0.488490553751317181621421 tCO2e/yr

ERy = (BEy − AEy) − LEy
    = (21.183794947565859081071070 − 2.95926726) − 0.488490553751317181621421
    = 17.736037133814541899449649 tCO2e/yr
```

**Market and Behavioral Leakage — Scenario 2 (Option 3, source-by-source)**

| Leakage Source | Estimated Leakage (tCO2e/yr) | Justification for negligibility |
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
    = (21.183794947565859081071070 − 2.95926726) − 0.544
    = 17.680527687565859081071070 tCO2e/yr
```

---

## 3. CWT / CWS Project — Sri Lanka Site 1 

### 3.1 Unadjusted baseline emission 

```
BEunadj,y = EFb × (1 − Cb) × Qy,unadj
          = 0.000194764006333331417726 × (1 − 0.05) × 151,000
          = 27.938896708516391872795 tCO2e/yr
```

### 3.2 Monitored quantity of safe water

| Monitored quantity of safe water provided in the year (L) (Qm,y) |
|---|
| 720,000 |

### 3.3 Premises and household water demand

| Premises Type (p) | No. of premises with ≥1 technology (HHp,y) | Individual Type | No. of individuals (HNp,y,i) | Drinking water per person (L) (QPWp,i) | Days Present (DOp,y) |
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
          = 0.000194764006333331417726 × (1 − 0.05) × 720,000
          = 133.218580331998689724584 tCO2e/yr
```

### 3.5 Adjusted quantity and uncertainty-adjusted baseline

| Xcleanboil,y | Mq,y |
|---|---|
| 0.03 | 0.92 |

```
Qy,adj = Qy,unadj × (1 − Xcleanboil,y) × Mq,y
       = 720,000 × (1 − 0.03) × 0.92
       = 642,528 L/yr

BEunc,y = EFb × (1 − Cb) × Qy,adj
        = 0.000194764006333331417726 × (1 − 0.05) × 642,528
        = 118.884261088275630710218762 tCO2e/yr
```

```
BEadj,y = 118.884261088275630710218762 × (1 − 0.0345) = 114.782754080730121450716214 tCO2e/yr
BEy     = min(114.782754080730121450716214, 118.884261088275630710218762) = 114.782754080730121450716214 tCO2e/yr
Δy      = 118.884261088275630710218762 − 114.782754080730121450716214 = 4.101507007545509259502547 tCO2e/yr
```

**Baseline Emission summary**

| Location | Baseline Emission (tCO2e/yr) |
|---|---|
| Sri Lanka | 114.782754080730121450716214 |
| **Total** | **114.782754080730121450716214** |

### 3.6 Activity Emission Calculation

| Electricity Source | Qty consumed (kWh) | Emission factor (tCO2/kWh) | T&D losses (%) | Fossil fuel type | Qty fossil fuel (kg) | Net calorific value (TJ/Gg) | Emission factor (tCO2/TJ) |
|---|---|---|---|---|---|---|---|
| National Grid | 3000 | 0.0005 | 10 | Diesel | 127.5 | 43 | 74.1 |

```
AEf,f,py = (127.5 × 43 × 74.1) ÷ 10⁶ = 0.40625325 tCO2e/yr
AEec,p,y = 3000 × 0.0005 × (1 + 0.10) = 1.65 tCO2e/yr
AEy      = 0.40625325 + 1.65 = 2.05625325 tCO2e/yr
```

### 3.7 Leakage Emissions

**Embodied leakage**

| Representative Technologies | Default Deduction (kg CO2e/unit) | No. of devices/systems |
|---|---|---|
| UV Treatment Units | 90 | 2 |
| Dispensing & Storage Units | 120 | 1 |

```
LEEmbodied,y = [(90 × 2) + (120 × 1)] ÷ 1000 = 0.3 tCO2e/yr
```

**Scenario 3 (Option 1, default 2% deduction)**

```
LEMarket,y = (114.782754080730121450716214 − 2.05625325) × 0.02 = 2.254530016614602429014324 tCO2e/yr
LEy        = 0.3 + 2.254530016614602429014324 = 2.554530016614602429014324 tCO2e/yr
ERy        = (114.782754080730121450716214 − 2.05625325) − 2.554530016614602429014324 = 110.171970814115519021701890 tCO2e/yr
```

**Scenario 4 (Option 3, source-by-source)**

| Leakage Source | Estimated Leakage (tCO2e/yr) | Justification for negligibility |
|---|---|---|
| Biomass Redistribution | 0.45 | N/A |
| Maintenance Transport | 0.023 | N/A |
| Replacement Components | 0.036 | N/A |
| Compensation Heating Leakage | N/A | No evidence of increased heating fuel use |

```
LEMarket,y = 0.45 + 0.023 + 0.036 = 0.509 tCO2e/yr
LEy        = 0.3 + 0.509 = 0.809 tCO2e/yr
ERy        = (114.782754080730121450716214 − 2.05625325) − 0.809 = 111.917500830730121450716214 tCO2e/yr
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
Qy,unadj = min(540,000, 22,338,000) = 540,000 L/day

Cb = 0.04
BEunadj,y = 0.000194764006333331417726 × (1 − 0.04) × 540,000 = 100.965660883199006949158 tCO2e/yr

Xcleanboil,y = 0.03
Mq,y         = 0.89
Up,y         = 1

Qy,adj  = 540,000 × (1 − 0.03) × 0.89 × 1 = 466,182 L/yr

BEunc,y = EFb × (1 − Cb) × Qy,adj      [note: source data uses Cb = 0.05 here, consistent with the other BEunc,y calculations]
        = 0.000194764006333331417726 × (1 − 0.05) × 466,182
        = 86.255700300460851629425025 tCO2e/yr

DAFNetZero = 0.0345
BAUy       = 86.255700300460851629425025
BEadj,y    = 86.255700300460851629425025 × (1 − 0.0345) = 83.279878640094952248209862 tCO2e/yr
BEy        = min(83.279878640094952248209862, 86.255700300460851629425025) = 83.279878640094952248209862 tCO2e/yr
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

LEMarket,y (Option 1) = (83.279878640094952248209862 − 1.5126985) × 0.02 = 1.635343602801899044964197 tCO2e/yr

LEy = 0.17 + 1.635343602801899044964197 = 1.805343602801899044964197 tCO2e/yr

ERy = (83.279878640094952248209862 − 1.5126985) − 1.805343602801899044964197 = 79.961836537293053203245665 tCO2e/yr
```

---

## 5. Final Multi-Location Aggregation

| Location | Baseline Emission (tCO2e/yr) | Activity Emission (tCO2e/yr) | Leakage Emission (tCO2e/yr) | Net Emission Reduction (tCO2e/yr) |
|---|---|---|---|---|
| Sri Lanka Site 1 (CWT) | 114.782754080730121450716214 | 2.05625325 | 2.554530016614602429014324 | 110.171970814115519021701890 |
| Sri Lanka Site 2 (CWT) | 83.279878640094952248209862 | 1.5126985 | 1.805343602801899044964197 | 79.961836537293053203245665 |
| **Project (Total)** | **198.062632720825073698926076** | **3.56895175** | **4.359873619416501473978521** | **190.133807351408572224947555** |
