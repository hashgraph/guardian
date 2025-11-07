# **Fixed Combustion**

### **Tool Summary**

Fixed combustion refers to the industrial burning of fuels in stationary equipment or facilities to generate heat, steam, or mechanical energy.
This methodology provides guidance on how companies can measure and report greenhouse gas emissions in the fixed combustion category. It covers three major fuel types used in fixed combustion: gaseous fuels,liquid fuels, and solid fuels.

### **This methodology is applicable for**

- Scope 1 (Direct emissions): Fixed Combustion

<!-- -->

- The methodology applies when a company operates stationary equipment or facilities that consume fuels (gaseous, liquid, or solid), resulting in direct emissions.

- The resulting emissions may also be included under a supplier's Scope 3, Category 1 or 2, depending on the reporting boundary. However, when calculating Scope 3 emissions, a separate Scope 3 methodology should be applied.

## **Gaseous Fuel**

### **User Inputs**

- Business type

\- Energy / Manufacturing / Construction / Commercial / Public / Home

- Calculation method

\- Cost-based / Usage-based

- Applicable reporting year

- Fuel type

\- LNG / City LNG / LPG

- Fuel consumption (amount)

\- If usage data is difficult to obtain, purchase quantity data may be used as a reference.

- Energy purchase cost (KRW) <br><br>
  
### **Applied NCVs and Emission Factors**

- National default calorific values and emission factors must be used to
  calculate emissions

- National default oxidation factor for gaseous fuels: If not otherwise
  specified, 0.995.

| Fuel Type           | NCV (TJ/kg) | CO₂ (kgCO₂/TJ) | CH₄ (kgCH₄/TJ) - Energy | CH₄ (kgCH₄/TJ) - Manufacturing, Construction | CH₄ (kgCH₄/TJ) - Commercial, Public | CH₄ (kgCH₄/TJ) - Home, Others | N₂O (kgN₂O/TJ) - Energy, Manufacturing, Construction | N₂O (kgN₂O/TJ) - Commercial, Public, Home, Other |
|----------------------|-------------|----------------|--------------------------|----------------------------------------------|------------------------------------|--------------------------------|------------------------------------------------------|--------------------------------------------------|
| Natural Gas (LNG)    | 0.0000494   | 56,100         | 1                        | 1                                            | 5                                  | 5                              | 0.1                                                  | 0.1                                              |
| City Gas (LNG)       | 0.0000389   | 56,100         | 1                        | 1                                            | 5                                  | 5                              | 0.1                                                  | 0.1                                              |
| City Gas (LPG)       | 0.0000584   | 64,000         | 1                        | 1                                            | 5                                  | 5                              | 0.1                                                  | 0.1                                              |

Source: Greenhouse Gas Inventory and Research Center of Korea <br><br>

### **Emission Calculation**

Eᵢⱼ = Qᵢ × ECᵢ × EFᵢⱼ × fᵢ

| Symbol | Description |
|---------|--------------|
| **Eᵢⱼ** | Total greenhouse gas (*j*) emissions (**kgGHG**) from fixed combustion (*i*) |
| **Qᵢ** | Fuel (*i*) consumption (amount) = Energy purchase cost / Average fuel (*i*) cost (**KRW/unit**)* |
| **ECᵢ** | Calorific value of fuel (*i*) (**TJ/unit**) |
| **EFᵢⱼ** | Greenhouse gas *j* emission factor of fuel (*i*) (**kgGHG/TJ**) |
| **fᵢ** | Oxidation factor of fuel (*i*) *(CH₄, N₂O not applicable)* |

*'Fuel (*i*) consumption (amount)' is used for usage-based while 'Energy purchase cost / Average fuel (*i*) cost' is used for cost-based calculation method.
<br><br>
### **Use case: Calculation of Fixed Combustion from Gaseous Fuel for General Companies**

Scenario

Company E uses city gas (LNG) and LPG for heating in its manufacturing
plants and office buildings. To comply with environmental regulations
and ESG disclosure requirements, the company must calculate Scope 1
direct emissions annually.

1\) Data Collection

Priority 1 --- Direct activity data

- Record fuel consumption (nm³) per site, categorized by fuel type (natural gas LNG, city gas LNG, and city gas LPG)
- If usage data is unavailable, use annual purchase quantities as a proxy for consumption.
- For city gas (LNG), consumption data can be retrieved directly from suppliers (e.g., Cowon Energy Service, Yesco, Seoul City Gas).

Priority 2 --- Cost-based estimation:
- If neither consumption nor purchase data are available for gasoline, estimate consumption using purchase costs and average unit price.
- Q = Total Purchase Cost / Average Unit Price

2\) NCV and Emission Factor Application

- Apply national default NCV(ECi) and emission factor(EFi,j)

- Distinguish by fuel type and GHG type (CO₂, CH₄, N₂O)

- Apply oxidation factor (f) where applicable (not applied for CH₄ and
  N₂O)

3\) Emission Calculation Procedure

1.  Enter gaseous fuel consumption or purchase quantity/payment data

2.  Apply formula: Ei,j = Qi × ECi × EFi,j × ƒi

    - Qi: Fuel consumption (nm³)

    - ECi: Calorific value (TJ/nm³)

    - EFi,j: Emission Factor (kgGHG/TJ)

    - ƒi: Oxidation Factor

Calculation Example:

- Consumed 2,500,000 nm³ of city gas (LNG)

- ECi = 0.0000389 TJ/nm³

- CO₂ Emission Factor = 56,100 kgCO₂/TJ

- ƒi = 0.995

- Emissions (ECO₂) = 2,500,000 nm³ × 0.0000389 TJ/nm³ × 56,100 kgCO₂/TJ × 0.995 ≈ 5,428,446.38 kgCO₂ ≈ 5,428.45 tCO₂

4\) Result Application

- Sustainability reporting / ESG disclosure: Reflect in Scope 1 emissions.

- Compare emissions by site and establish efficiency improvement strategies.

- Set fuel reduction targets and develop transit transition strategies to low-carbon fuels.

<br><br>

## **Liquid Fuel**

### **User Inputs**

- Business type

\- Energy / Manufacturing / Construction / Commercial / Public / Home

- Calculation method

\- Cost-based / Usage-based

- Applicable reporting year

- Fuel type

\- Gasoline / Diesel / Kerosene / B-A / B-B / B-C / Naphtha / Solvent / JET-A1 / Asphalt / Petro coke / Lubricating oil / Byproduct fuel oil type 1 / Byproduct fuel oil type 2 / Propane / Bhutan

- Fuel consumption (amount)

\- If usage data is difficult to obtain, annual purchase quantity data may be used as a reference.

- Energy purchase cost (KRW) <br><br>

### **Applied NCVs and Emission Factors**

- National default calorific values and emission factors must be used to
  calculate emissions

- National default oxidation factor for gaseous fuels: If not otherwise
  specified, 0.99.

| Fuel Type                 | NCV (MJ/kg) | CO₂ (kgCO₂/TJ) | CH₄ (kgCH₄/TJ) - Energy | CH₄ (kgCH₄/TJ) - Manufacturing, Construction | CH₄ (kgCH₄/TJ) - Commercial, Public | CH₄ (kgCH₄/TJ) - Home, Others | N₂O (kgN₂O/TJ) - Energy, Manufacturing, Construction | N₂O (kgN₂O/TJ) - Commercial, Public, Home, Other |
|----------------------------|--------------|----------------|--------------------------|----------------------------------------------|------------------------------------|--------------------------------|------------------------------------------------------|--------------------------------------------------|
| Gasoline                   | 30.4         | 71,600         | 3                        | 3                                            | 10                                 | 10                             | 0.6                                                  | 0.6                                              |
| Kerosene                   | 34.2         | 73,200         | 3                        | 3                                            | 10                                 | 10                             | 0.6                                                  | 0.6                                              |
| Diesel                     | 35.2         | 73,200         | 3                        | 3                                            | 10                                 | 10                             | 0.6                                                  | 0.6                                              |
| B-A                        | 36.4         | 75,700         | 3                        | 3                                            | 10                                 | 10                             | 0.6                                                  | 0.6                                              |
| B-B                        | 38.0         | 78,400         | 3                        | 3                                            | 10                                 | 10                             | 0.6                                                  | 0.6                                              |
| B-C                        | 39.2         | 80,300         | 3                        | 3                                            | 10                                 | 10                             | 0.6                                                  | 0.6                                              |
| Naphtha                    | 29.9         | 70,200         | 3                        | 3                                            | 10                                 | 10                             | 0.6                                                  | 0.6                                              |
| Solvent                    | 30.3         | 70,200         | 3                        | 3                                            | 10                                 | 10                             | 0.6                                                  | 0.6                                              |
| JET-A1                     | 33.9         | 73,000         | 3                        | 3                                            | 10                                 | 10                             | 0.6                                                  | 0.6                                              |
| Asphalt                    | 39.2         | 78,900         | 3                        | 3                                            | 10                                 | 10                             | 0.6                                                  | 0.6                                              |
| Petro coke                 | 34.2         | 95,600         | 3                        | 3                                            | 10                                 | 10                             | 0.6                                                  | 0.6                                              |
| Lubricating oil            | 37.3         | 73,200         | 3                        | 3                                            | 10                                 | 10                             | 0.6                                                  | 0.6                                              |
| Byproduct fuel oil type 1  | 34.6         | 73,500         | 3                        | 3                                            | 10                                 | 10                             | 0.6                                                  | 0.6                                              |
| Byproduct fuel oil type 2  | 37.7         | 79,600         | 3                        | 3                                            | 10                                 | 10                             | 0.6                                                  | 0.6                                              |
| Propane                    | 46.3         | 64,600         | 1                        | 1                                            | 5                                  | 5                              | 0.1                                                  | 0.1                                              |
| Bhutan                     | 45.7         | 66,300         | 1                        | 1                                            | 5                                  | 5                              | 0.1                                                  | 0.1                                              |

Source: Greenhouse Gas Inventory and Research Center of Korea <br><br>

### **Emission Calculation**

Eᵢⱼ = Qᵢ × ECᵢ × EFᵢⱼ × fᵢ

| Symbol | Description |
|---------|--------------|
| **Eᵢⱼ** | Total greenhouse gas (*j*) emissions (**kgGHG**) from fixed combustion (*i*) |
| **Qᵢ** | Fuel (*i*) consumption (amount) = Energy purchase cost / Average fuel (*i*) cost (**KRW/unit**) |
| **ECᵢ** | Calorific value of fuel (*i*) (**TJ/unit**) |
| **EFᵢⱼ** | Greenhouse gas *j* emission factor of fuel (*i*) (**kgGHG/TJ**) |
| **fᵢ** | Oxidation factor of fuel (*i*) *(CH₄, N₂O not applicable)* |

*'Fuel (*i*) consumption (amount)' is used for usage-based while 'Energy purchase cost / Average fuel (*i*) cost' is used for cost-based calculation method.
<br><br>

### **Use case: Calculation of Fixed Combustion from Liquid Fuel for General Companies**

Scenario

Company F uses gasoline and diesel to operate production facilities. To comply with environmental regulations and practice ESG management, the company must calculate Scope 1 direct emissions annually.

1\) Data Collection

Priority 1 --- Direct activity data

- Obtain fuel consumption(L) data per site via meters, categorized by type (gasoline, diesel, kerosene, heavy oil, naphtha, etc.).
- If consumption data is unavailable, use annual purchase quantities as a proxy.

Priority 2 --- Cost-based Estimation
- If neither consumption nor purchase data are available for gasoline, estimate consumption using purchase costs and average unit price.
- Q = Total Purchase Cost / Average Unit Price

2\) NCV and Emission Factor Application

- Apply national default NCV(ECi) and emission factor(EFi,j)

- Distinguish by fuel type and GHG type (CO₂, CH₄, N₂O)

- Apply oxidation factor (f) where applicable (not applied for CH₄ and N₂O)

3\) Emission Calculation Procedure

- Enter fuel consumption or cost data.

- Apply calculation formula: Ei,j = Qi × ECi × EFi,j × ƒi

    - Qi: Fuel consumption (unit)

    - ECi: NCV (TJ/unit)

    - EFi,j: Emission Factor (kgGHG/TJ)

    - ƒi: Oxidation Factor

Calculation Example:

- Consumed 5,000,000 L of Gasoline

- ECi = 0.0000304 TJ/L

- CO₂ Emission Factor = 71,600 kg/TJ → Apply after conversion

- ƒi = 0.99

- Emissions (CO₂) = 5,000,000 × 0.0000304 × 71,600 × 0.99 = 10,774,368 kgCO₂ ≈ 10,774.37 tCO₂

4\) Result Application

- Sustainability reporting / ESG disclosure: Reflect in Scope 1
  emissions.

- Compare emissions by site and establish efficiency improvement
  strategies.

- Use as baseline data for scenario analysis of low-carbon transition.

<br><br>

## **Solid Fuel**

### **User Inputs**

- Business type

\- Energy / Manufacturing / Construction / Commercial / Public / Home

- Calculation method

\- Cost-based / Usage-based

- Applicable reporting year

- Fuel type

\- Domestic anthracite / Imported anthracite (fuel/raw material use) / Bituminous coal (fuel/raw material use) / Sub-bituminous coal

- Fuel consumption (amount)

\- If usage data is difficult to obtain, annual purchase quantity data may be used as a reference.

- Energy purchase cost (KRW)

## **Applied NCVs and Emission Factors**

- National default calorific values and emission factors must be used to
  calculate emissions

- National default oxidation factor for gaseous fuels: If not otherwise
  specified, 0.98.

| Fuel Type                | NCV (TJ/kg)  | CO₂ (kgCO₂/TJ) | CH₄ (kgCH₄/TJ) - Energy | CH₄ (kgCH₄/TJ) - Manufacturing, Construction | CH₄ (kgCH₄/TJ) - Commercial, Public | CH₄ (kgCH₄/TJ) - Home, Others | N₂O (kgN₂O/TJ) - Energy, Manufacturing, Construction | N₂O (kgN₂O/TJ) - Commercial, Public, Home, Other |
|---------------------------|--------------|----------------|--------------------------|----------------------------------------------|------------------------------------|--------------------------------|------------------------------------------------------|--------------------------------------------------|
| Domestic anthracite       | 0.0000194    | 110,600        | 1                        | 10                                           | 10                                 | 10                             | 300                                                  | 1.5                                              |
| Imported anthracite (Fuel)| 0.0000205    | 100,400        | 1                        | 10                                           | 10                                 | 10                             | 300                                                  | 1.5                                              |
| Imported anthracite (Raw) | 0.0000247    | 109,600        | 1                        | 10                                           | 10                                 | 10                             | 300                                                  | 1.5                                              |
| Bituminous coal (Fuel)    | 0.0000237    | 95,100         | 1                        | 10                                           | 10                                 | 10                             | 300                                                  | 1.5                                              |
| Bituminous coal (Raw)     | 0.0000280    | 95,100         | 1                        | 10                                           | 10                                 | 10                             | 300                                                  | 1.5                                              |
| Sub-bituminous coal       | 0.0000199    | 97,000         | 1                        | 10                                           | 10                                 | 10                             | 300                                                  | 1.5                                              |

Source: Greenhouse Gas Inventory and Research Center of Koreass
<br><br>

## **Emission Calculation**

Eᵢⱼ = Qᵢ × ECᵢ × EFᵢⱼ × fᵢ

| Symbol | Description |ㄴ
|---------|--------------|
| **Eᵢⱼ** | Total greenhouse gas (*j*) emissions (**kgGHG**) from fixed combustion (*i*) |
| **Qᵢ** | Fuel (*i*) consumption (amount) = Energy purchase cost / Average fuel (*i*) cost (**KRW/unit**) |
| **ECᵢ** | Calorific value of fuel (*i*) (**TJ/unit**) |
| **EFᵢⱼ** | Greenhouse gas *j* emission factor of fuel (*i*) (**kgGHG/TJ**) |
| **fᵢ** | Oxidation factor of fuel (*i*) *(CH₄, N₂O not applicable)* |

*'Fuel (*i*) consumption (amount)' is used for usage-based while 'Energy purchase cost / Average fuel (*i*) cost' is used for cost-based calculation method.
<br><br>

## **Use case: Calculation of Fixed Combustion from Solid Fuel for General Companies**

Scenario

Company D uses domestic anthracite and bituminous coal in its manufacturing processes and heating boilers. To comply with environmental regulations and ESG management, the company must calculate Scope 1 direct emissions annually.

1\) Data Collection

Priority 1 --- Direct activity data

- Record monthly or annual fuel consumption (ton) by fuel type: Domestic anthracite, imported anthracite. bituminous coal, sub-bituminous coal
- If measurement data is unavailable, use annual purchase quantities as a proxy for consumption.

Priority 2 --- Cost-based estimation:
- If neither consumption nor purchase data are available for gasoline, estimate consumption using purchase costs and average unit price.
- Q = Total Purchase Cost / Average Unit Price

2\) NCV and Emission Factor Application

- Apply national default NCV(ECi) and emission factor(EFi,j)

- Distinguish by fuel type and GHG type (CO₂, CH₄, N₂O)

- Apply oxidation factor (f) where applicable (not applied for CH₄ and
  N₂O)

3\) Emission Calculation Procedure

-  Enter monthly or annual solid fuel consumption

-  Apply calculation formula: GHG Emissions = Q × EFj

    - Qi: Fuel consumption (kg)

    - ECi: NCV(TJ/kg)

    - EFi,j: Emission Factor(kgGHG/TJ)

    - ƒi: Oxidation Factor

Calculation Example:

- Consumed 1,000 tons of domestic anthracite

- ECi = 0.0000194 TJ/kg

- CO₂ Emission Factor = 110,600 kgCO₂/TJ

- ƒi = 0.98

<!-- -->

- Emissions (ECO₂) = 1,000,000 kg × 0.0000194 × 110,600 × 0.98 =
  2,102,727.20 kgCO₂ ≈ 2,102.73 tCO₂

4\) Result Application

- Sustainability reporting / ESG disclosure: Reflect in Scope 1 emissions.

- Compare emissions by site and establish efficiency improvement Sstrategies.

- Use as baseline data for scenario analysis of low-carbon transition.

<br><br>

![텍스트, 도표, 스크린샷, 라인이(가) 표시된 사진 자동 생성된
설명](./gaseous_fuel_flow.png)
