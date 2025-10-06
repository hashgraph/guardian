## **Waste Treatment (Landfilling of solid waste) Methodology in Korea**

Policy by WinCL (Verified by the Korean Foundation for Quality, a third-party emission verifier)

Executive Summary

This methodology provides a way to record and collect data to measure and report greenhouse gas emissions generated when a company disposes of solid waste through landfilling during the implementation year. It is intended to calculate direct emissions from waste treated within the company’s own facilities. The methodology follows the national guidelines of the Greenhouse Gas Inventory and Research Center of Korea (GIR) to ensure transparency and is designed to support consistency in reporting for verification and regulatory compliance.

This Methodology is applicable for

- Scope 1 (Direct Emission) : <a name="_hlk205460780"></a>Waste Treatment (Landfilling of solid waste)

  - Greenhouse gas emissions generated from the outsourcing of waste treatment to a third party, rather than being treated directly at the site, are included in Scope 3.

Data Collection

- Amount of solid waste landfilled
- If landfilled waste is excavated and removed, the quantity removed should be deducted from the previously landfilled amount
- Activity data such as incinerated waste by type, total incinerated waste, and incinerated gaseous waste
- If waste generation and treatment performance are reported through the Allbaro system (<https://www.allbaro.or.kr/index.jsp>), figures such as waste generation and treatment amounts can be verified within the system

Calorific Values and Emission Factors

- DOC (Degradable Organic Carbon ratio) and k (Methane Generation Rate Constant)

|        Household waste         | Industrial waste |        |                                             |       |        |
| :----------------------------: | :--------------: | :----- | :------------------------------------------ | :---- | :----- |
|     Waste characteristics      |       DOC        | k      | Waste characteristics                       | DOC   | k      |
| Mixed waste(bulk)<sup>1)</sup> |      0\.14       | 0\.09  | Mixed waste(bulk)<sup>1)</sup>              | 0\.15 | 0\.09  |
|             Paper              |      0\.40       | 0\.06  | <p>food</p><p>(food, beverage, tobacco)</p> | 0\.15 | 0\.185 |
|            Textile             |      0\.24       | 0\.06  | Waste textile                               | 0\.24 | 0\.06  |
|              Food              |      0\.15       | 0\.185 | Waste wood                                  | 0\.43 | 0\.03  |
|              Wood              |      0\.43       | 0\.03  | Waste paper                                 | 0\.40 | 0\.06  |
|     Garden, and park waste     |      0\.20       | 0\.1   | Petroleum products, solvents, plastics      | 0\.00 | 0      |
|             Diaper             |      0\.24       | 0\.06  | Waste synthetic rubber                      | 0\.39 | 0\.03  |
|        Rubber,, leather        |      0\.39       | 0\.03  | Construction and demolition debris          | 0\.04 | 0\.1   |
|            Plastic             |      0\.00       | 0      | Other industrial waste <sup>2)</sup>        | 0\.01 | 0\.1   |
|             Metal              |      0\.00       | 0      | sewage sludge(slurry)                       | 0\.05 | 0\.185 |
|             Glass              |      0\.00       | 0      | Wastewater sludge (slurry)                  | 0\.09 | 0\.185 |
|          Other waste           |      0\.00       | 0      | -                                           | -     | -      |

\
\- Mixed waste (bulk) may be applied only in exceptional cases, such as when the composition cannot be identified from historical landfill data. In general, default values by waste type determined through composition analysis should be applied.\
\- If no data are available for on-site waste, default values for total other waste from all manufacturing industries may be applied.

- MCF (Methane Correction Factor)

|             Types of landfill facilities              | Basic MCF value |
| :---------------------------------------------------: | :-------------: |
|            Controlled landfill - Anaerobic            |      1\.0       |
|          Controlled landfill – semi-aerobic           |      0\.5       |
|   Unmanaged landfill – Landfill height 5 m or more    |      0\.8       |
| Uncontrolled landfill – Landfill height less than 5 m |      0\.4       |
|                        others                         |      0\.6       |

- OX (Oxidation Rate)

|          Types of landfill facilities           |  OX  |
| :---------------------------------------------: | :--: |
| Landfill sites covered with soil, compost, etc. | 0\.1 |
|                     others                      |  0   |

- F (methane volume fraction)\
  If actual measurement data on methane content in LFG is available, the actual measurement value shall be applied first. If no actual measurement data is available, the default value of 0.5 specified in the IPCC guidelines shall be applied.

<a name="_hlk205456679"></a>Emission Calculation

### 1. CH<sub>4</sub> Emission

| <p><b><i>CH<sub>4</sub> Emissions<sub>T</sub> = [ CH<sub>4</sub> generated<sub>x,T</sub> – R<sub>T</sub> ] × (1-OX)</i></b></p><p><b><i>CH<sub>4</sub> generated<sub>x,T</sub> = DDOC<sub>m,decomp(T)</sub> × F × 1.336</i></b></p><p><b><i>DDOC<sub>m,decomp(T)</sub> = DDOCma<sub>T-1</sub> × (1 – e<sup>-k</sup>)</i></b></p><p><b><i>DDOCma<sub>T-1</sub> = DDOCmd<sub>T-1</sub> + ( DDOCma<sub>T-2</sub> × e<sup>-k</sup> )</i></b></p><p><b><i>DDOCmd<sub>T-1</sub> = WT<sub>-1</sub> × DOC × DOC<sub>f</sub> × MCF</i></b></p><p></p><p>CH<sub>4</sub> Emissions<sub>T</sub> : Methane emissions in year T (tCH<sub>4</sub>)</p><p>CH<sub>4</sub> generated<sub>x,T</sub> : Maximum methane emissions possible in year T (tCH<sub>4</sub>)</p><p>R<sub>T</sub> : Methane recovered in year T (tCH<sub>4</sub>)</p><p>OX : Oxidation rate at the landfill surface</p><p>DDOC<sub>m,decomp(T)</sub> : Organic carbon decomposed anaerobically in year T (tC)</p><p>F : Methane volume fraction of generated landfill gas</p><p>1\.336 : Molecular weight of CH<sub>4</sub> (16.043)/Atomic weight of C (12.011)</p><p>DDOCma<sub>T-1</sub> : Cumulative organic carbon(tC) accumulated by the end of year T-1</p><p>k : Methane generation rate constant</p><p>DDOCmd<sub>T-1</sub> : Anaerobically degradable organic carbon (tC) landfilled in year T-1</p><p>W : Landfill waste quantity (t-Waste)</p><p>DOC : Degradable organic carbon ratio (tC/t-Waste)</p><p>DOC<sub>f</sub> : DOC ratio convertible to methane</p><p>MCF : Methane correction factor for aerobic decomposition</p><p>T : Calculation year</p><p>x : Waste characteristics</p><p></p><p>However,</p><p>(a) If ![](image_8_1.png) ≤ 0.75, calculate the amount generated and emitted according to the Tier 1 calculation method.</p><p>(b)If ![](image_8_1.png) > 0.75, emissions are applied as follows;</p><p></p><p><b><i>CH<sub>4</sub> generated<sub>x,T</sub> = R<sub>T</sub> × (1/0.75)</i></b></p><p></p><p>R<sub>T</sub> (Methane recovery amount in year T, tCH<sub>4</sub>) = Annual biogas recovery amount (m<sup>3</sup> Bio-gas) × Annual average methane concentration of biogas (%, V/V) × γ (Conversion factor for m<sup>3</sup> to t of CH<sub>4</sub> at 0°C and 1 atm, 0.7156 × 10-3),</p><p>In this case, CH<sub>4</sub> Emissions<sub>T</sub> = [CH<sub>4</sub> emissions – R (recovery amount)] × (1 – OX) </p><p>※ If the methane volume ratio is measured, use the measured value.</p> |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

## **Use Case: Calculation of Direct Emissions from Landfilling of Solid waste by a General Company**

**Scenario**

Company ‘A’ disposes of solid waste generated at its facilities through its own landfill site. To comply with annual ESG disclosure and statutory reporting obligations, the company must calculate methane (CH₄) emissions from landfilling as Scope 1 direct emissions.

**1) Data Collection**

Collection of waste activity data

- Annual volume of landfilled solid waste by type
- Information on the type of landfill facility
- Where possible, aggregation of methane recovery data from the previous year
- If using the Ministry of Environment’s Allbaro system, landfill performance data can be directly verified

**2) Application of Emission Factors**

- CH₄: Apply national default values for DOC, k, MCF, and F by waste type
- OX: Apply oxidation rate depending on whether landfill cover is in place

**3) Emission Calculation Procedure**

1. Aggregate monthly or annual landfilled waste volumes by type (deduct quantities removed for reprocessing, if applicable)
1. Set DOC, k, and MCF: Select from standard values based on waste type and facility type
1. Apply methane generation calculation formula:\
   DDOC<sub>m,decomp(T)</sub> = DDOCma<sub>T-1</sub> × (1 – e<sup>-k</sup>)
1. Apply methane emission calculation formula reflection recovery rate and oxidant factor:\
   CH4 EmissionsT = [ CH4 generatedx,T – RT ] × (1-OX)

**4) Reporting and Utilization**

- **Sustainability Report and ESG Disclosure:** Reflect as Scope 1 emissions
- **Internal Management:** Assess emission intensity by waste type and landfill characteristics to establish reduction strategies such as gas recovery and cover improvement
- **Regulatory Compliance:** Use as statutory reporting data, such as for the Emissions Trading Scheme
- **Project Evaluation:** Quantify reduction effects of LFG recovery and power generation facilities, and review investment feasibility

![텍스트, 도표, 스크린샷, 라인이(가) 표시된 사진AI 생성 콘텐츠는 정확하지 않을 수 있습니다.](image_8_2.png)

[ref1]: [image_8_1.png]
