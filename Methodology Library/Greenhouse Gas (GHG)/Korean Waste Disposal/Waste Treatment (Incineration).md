## **Waste Treatment (Incineration) Methodology in Korea**

Policy by WinCL (Verified by the Korean Foundation for Quality, a third-party emission verifier)

**Policy Summary**

This methodology provides guidance on how companies can measure, and report greenhouse gas emissions generated during waste incineration in the reporting year. It explains how to record and collect data for calculating direct emissions from waste treated through on-site incineration facilities.

The methodology follows the national guidelines of the Greenhouse Gas Inventory and Research Center of Korea (GIR), ensuring transparency, consistency in reporting, and compliance with verification and regulatory requirements.

The scope of waste includes solid, liquid, and gaseous waste.

<a name="_hlk205460780"></a>**This methodology is applicable for**

- Scope 1 (Direct emissions): Waste Incineration

  - Emissions from waste treated by third parties (outsourced treatment) are not included in Scope 1 but must be accounted for under Scope 3 category 5.

**User Input**

- Total incinerated waste volume by waste type (solid, liquid, gaseous)
- If waste disposal is reported through the Allbaro system (<https://www.allbaro.or.kr/index.jsp>), incineration and treatment data can be retrieved directly from the platform.

**Applied Emission Factors**

- CO<sub>2</sub> Emission Factor

  - Solid Waste

|    household waste    |       |       |       |
| :-------------------: | :---- | :---- | :---- |
| Waste characteristics | dm    | CF    | FCF   |
|         paper         | 0\.9  | 0\.46 | 0\.01 |
|       textiles        | 0\.8  | 0\.5  | 0\.2  |
|         food          | 0\.4  | 0\.38 | 0     |
|         tree          | 0\.85 | 0\.5  | 0     |
| garden and park waste | 0\.4  | 0\.49 | 0     |
|        diaper         | 0\.4  | 0\.7  | 0\.1  |
|    rubber, leather    | 0\.84 | 0\.67 | 0\.2  |
|       plastics        | 1     | 0\.75 | 1     |
|        metals         | 1     | -     | -     |
|       glassware       | 1     | -     | -     |
| Other household waste | 0\.9  | 0\.03 | 1     |

|               household waste                |       |       |       |
| :------------------------------------------: | :---- | :---- | :---- |
|            Waste characteristics             | dm    | CF    | FCF   |
| <p>Food</p><p>(food, beverages, tobacco)</p> | 0\.4  | 0\.15 | 0     |
|                Waste textiles                | 0\.8  | 0\.4  | 0\.16 |
|                  Waste wood                  | 0\.85 | 0\.43 | 0     |
|                 Waste paper                  | 0\.9  | 0\.41 | 0\.01 |
|    Petroleum products, solvents, plastics    | 1     | 0\.8  | 0\.8  |
|            Waste synthetic rubber            | 0\.84 | 0\.56 | 0\.17 |
|      Construction and demolition debris      | 1     | 0\.24 | 0\.2  |
|            Other industrial waste            | 0\.9  | 0\.04 | 0\.03 |
|            sewage sludge(slurry)             | 0\.1  | 0\.45 | 0     |
|          Wastewater sludge (slurry)          | 0\.35 | 0\.45 | 0     |
|                medical waste                 | 0\.65 | 0\.4  | 0\.25 |

\- Liquid waste\
The carbon content value (CLi) for liquid waste is 0.8. However, liquid waste refers to waste legally classified as liquid, such as waste oil and waste organic solvents.

\
\- Gaseous waste

|                 Types of gaseous waste                 | CO2 (tCO2/t-Waste) |
| :----------------------------------------------------: | :----------------: |
| <p>Exhaust gas</p><p>(Refining and petrochemicals)</p> |      2\.8512       |
|                    Biogas (methane)                    |       .7518        |

- CH<sub>4</sub> , N<sub>2</sub>O Emission Factor\
  - Default CH<sub>4</sub> emission factors by incineration technology:

| incineration technology | CH4 Emission Factors (kgCH4/t-Waste) |         |
| :---------------------- | :----------------------------------- | :------ |
| continuous              | Fixed                                | 0\.0002 |
|                         | Fludised                             | 0       |
| quasi-continuous        | Fixed                                | 0\.006  |
|                         | Fludised                             | 0\.188  |
| Batch type              | Fixed                                | 0\.06   |
|                         | Fludised                             | 0\.237  |

\- Tier1 CH<sub>4</sub> , N<sub>2</sub>O Emission Factor

| incineration technology | CH4 (kgCH4/t-Waste) | N2O (gCH4/t-Waste) |
| :---------------------- | :------------------ | :----------------- |
| exhaust gas             | 0\.1935             | 3\.87              |
| Biogas (methane)        | 0\.252              | 5\.04              |

<a name="_hlk205456679"></a>**Emission Calculation**

### **1.** CO<sub>2</sub> Emissions

---

**(a) Solid waste**

<p></p><p><b><i>CO<sub>2</sub> Emissions = (SW<sub>i</sub> × dm<sub>i</sub> × CF<sub>i</sub> × FCF<sub>i</sub> × OF<sub>i</sub>) × 3.664</i></b></p><p></p><p>CO<sub>2</sub> Emissions : Amount of greenhouse gases generated from waste incineration (tCO<sub>2</sub>)</p><p>SW<sub>i</sub> : Incineration amount (t-Waste) by waste type (i)</p><p>dm<sub>i</sub>: Mass fraction of rjs material by waste type (i) (decimal between 0 and 1)</p><p>CF<sub>i</sub>: Carbon content by waste type (i) (tC/t-waste)</p><p>FCF<sub>i</sub>: Fossil carbon mass fraction (decimal between 0 and 1)</p><p>OF<sub>i</sub>: Oxidation factor (incineration efficiency, decimal between 0 and 1)</p><p>3\.664: Molecular weight of CO<sub>2</sub> (44.010)/Atomic weight of C (12.011)</p><p></p><p>**(b) Liquid waste**</p><p></p><p><b><i>CO<sub>2</sub> Emissions = (AL<sub>i</sub> × CL<sub>i</sub> × OF<sub>i</sub>) × 3.664</i></b></p><p></p><p>CO<sub>2</sub> Emissions: Amount of greenhouse gases emitted from waste incineration (tCO<sub>2</sub>)</p><p>AL<sub>i</sub> : Incineration quantity of liquid waste (i) (t-Waste)</p><p>CL<sub>i</sub> : Carbon content of waste (i) (tC/t-Waste)</p><p>OF<sub>i</sub> : Oxidation coefficient (incineration efficiency, a decimal between 0 and 1)</p><p>3\.664 : Molecular weight of CO<sub>2</sub> (44.010)/Atomic weight of C (12.011)</p><p></p><p></p><p>**(c) Gaseous waste**</p><p><b><i>CO<sub>2</sub> Emissions = (GW<sub>i</sub> × EF<sub>i</sub> × OF<sub>i</sub>)</i></b></p><p>CO<sub>2</sub> Emissions: Amount of greenhouse gases emitted from waste incineration (tCO<sub>2</sub>)</p><p>GW<sub>i</sub>: Amount of atmospheric waste incinerated (t-Waste)</p><p>EF<sub>i</sub>: Emission factor for atmospheric waste (i) (tC/t-Waste)</p><p>OF<sub>i</sub>: Oxidation factor (incineration efficiency, a decimal between 0 and 1)</p>

### **2)** CH<sub>4</sub>, N<sub>2</sub>O Emissions

---

<p><b><i>CH<sub>4</sub> Emissions = IW × EF × 10<sup>-3</sup></i></b></p><p><b><i>N<sub>2</sub>O Emissions = IW × EF × 10<sup>-3</sup></i></b></p><p></p><p>CH<sub>4</sub> Emissions: CH<sub>4</sub> emissions from waste incineration (tCH<sub>4</sub>)</p><p>N<sub>2</sub>O Emissions: N<sub>2</sub>O emissions from waste incineration (tN<sub>2</sub>O)</p><p>IW: Total incinerated waste volume (ton)</p><p>EF: Emission factor (kg CH<sub>4</sub>/t-Waste, kg N<sub>2</sub>O/t-Waste)</p>

## Use case: Calculation of Waste Incineration Emissions for General Companies

Scenario

Company A incinerates solid, liquid, and gaseous waste on-site, including paper, plastics, food waste, wood, rubber/leather, waste oil, solvents, and biogas. To comply with ESG management and regulatory obligations, the company must calculate Scope 1 direct emissions annually from waste incineration.

**1) Data Collection**

Waste activity data collection

- Waste incineration data by type and technology applied
- If using the Allbaro system, retrieve incineration and treatment records directly

**2) Emission Factor Application**

- CO₂: Apply dry matter fraction, carbon fraction, fossil carbon fraction, oxidation factor by waste type.
- CH₄·N₂O: Apply emission factors by incineration technology.
- Apply national emission factors to each waste type (solid, liquid, and gaseous) for calculation.

**3) Emission Calculation Procedure**

1. Aggregate monthly or annual incineration data by waste type.
1. Apply formulas by GHG type:
   1. CO<sub>2</sub> Emissions (solid waste) = (SW<sub>i</sub> × dm<sub>i</sub> × CF<sub>i</sub> × FCF<sub>i</sub> × OF<sub>i</sub>) × 3.664
   1. CH<sub>4</sub> Emissions = IW × EF × 10<sup>-3</sup>
   1. N<sub>2</sub>O Emissions = IW × EF × 10<sup>-3</sup>

**4) Result Application**

- Sustainability reporting / ESG disclosure: Reflect in Scope 1 emissions.
- Internal Management: Analyze emissions by site and waste type to set reduction targets.
- Regulatory Compliance: Use for Emissions Trading Scheme and other legal reporting.
- Cost Analysis: Integrate waste treatment costs with emissions data to design efficient treatment strategies

  ![텍스트, 스크린샷, 도표, 라인이(가) 표시된 사진자동 생성된 설명](image_7.png)
