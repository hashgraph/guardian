# **Indirect Emission (Electricity)**

### **Tool Summary**

This methodology provides guidance on how companies can measure and report greenhouse gas emissions in the Scope 2 indirect emissions category (electricity). It explains how to record and collect electricity usage data.

The methodology applies when a company operates facilities that consume electricity, and the related emissions occur at the electricity supplier. It is designed to calculate the indirect emissions resulting from electricity consumption. Electricity is generally supplied by KEPCO (Korea Electric Power Corporation), though companies may also self-generate renewable energy within their organizational boundary.

Both the location-based and market-based approaches are supported, allowing companies to account for purchased electricity and renewable certificates in accordance with the GHG Protocol and international standards.

Electricity consumption data can be measured using legal metering devices (e.g., electricity meters) or retrieved via KEPCO's website and mobile app.

### **This methodology is applicable for**

- Scope 2 (Indirect emissions): Electricity supplied externally

<!-- -->

- The emissions may be included under a supplier's Scope 3, Category 1 or 2. However, when calculating Scope 3 emissions, a separate Scope 3 methodology should be used.
<br><br>

### **User Input**

- Applicable reporting year

- Electricity consumption (MWh)

\- KEPCO ON <https://online.kepco.co.kr/>

\- KEPCO Energy Marketplace <https://en-ter.co.kr/main.do>

- Renewable energy certificate type (MWh)

\- Indirect PPA / Direct PPA / REC / Equity Participation

### **Note -- Use of Renewable Electricity**

If it is possible to distinguish and provide evidence for electricity generated from renewable energy sources or waste heat facilities, the corresponding greenhouse gas direct emissions shall be calculated using the emission factors applicable to those energy sources.

Electricity generated from renewable sources (solar, wind, hydro, ocean, geothermal, and bioenergy) that are **not subject to Renewable Portfolio
Standard obligations** can be calculated separately using the emission factors for renewable energy -- typically 0 tCO~2~eq/MWh -- provided that a valid Renewable Energy Usage Certificate is obtained through one of the following:

|           |                                                                                                      |
| :-------: | :--------------------------------------------------------------------------------------------------: |
| Indirect PPA   |                          Contract for power purchase via an electricity sales business operator                         |
| Direct PPA  |                         Contract for power purchase via a renewable electricity supply business operator                         |
| REC Purchase  | Purchase of Renewable Energy Certificates (REC) under Article 12-7 of the Act on the Promotion of the Development, Use, and Deployment of New and Renewable Energy.   |
| Equity Participation  |             Contract for power purchase and REC acquisition through equity investment.                |                                                                                   |

<br><br>

### **Applied Emission Factors**

- National default emission factors must be used to calculate emissions.

- Both the location-based and market-based emission factors are identical as electricity is supplied exclusively by the Korea Electric Power Corporation (KEPCO) in Korea.

**Location based**

| GHG Type                | Emission Factor |
| ----------------------- | --------------- |
| CO₂eq (tCO₂eq/MWh) | 0.4781          |
| CO₂ (tCO₂/MWh)      | 0.4747          |
| CH₄ (kgCH₄/MWh)     | 0.0125          |
| N₂O (kgN₂O/MWh)     | 0.0100          |

Source: Greenhouse Gas Inventory and Research Center of Korea

**Market based**

| GHG Type                | Emission Factor |
| ----------------------- | --------------- |
| CO₂eq (tCO₂eq/MWh) | 0.4781          |
| CO₂ (tCO₂/MWh)      | 0.4747          |
| CH₄ (kgCH₄/MWh)     | 0.0125          |
| N₂O (kgN₂O/MWh)     | 0.0100          |

Source: Greenhouse Gas Inventory and Research Center of Korea

**Renewable Energy Usage Certificate**
| Renewable Energy Usage Certificate | CO₂eq (tCO₂eq/MWh) | CO₂ (tCO₂/MWh) | CH₄ (tCH₄/MWh) | N₂O (tN₂O/MWh) |
|-----------------------------------|------------------|----------------|----------------|----------------|
| Indirect PPA                      | 0                | 0              | 0              | 0              |
| Direct PPA                        | 0                | 0              | 0              | 0              |
| REC                               | 0                | 0              | 0              | 0              |
| Equity Participation              | 0                | 0              | 0              | 0              |

Source: Greenhouse Gas Inventory and Research Center of Korea
<br><br>

### **Emission Calculation**

- Location based

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><em><strong>GHG Emissions = Q × EF<sub>j</sub></strong></em></p>
<p>GHG Emissions: Total Location based emissions from electricity (tonGHG(j))</p>
<p>Q : Electricity consumption (MWh)</p>
<p>EF<sub>j</sub> : Location based electricity GHG emission factor
(tGHG/MWh)</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

- Market based

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><em><strong>GHG Emissions = ∑(Q<sub>R</sub> × EF<sub>R</sub>) +
(Q<sub>N</sub> × EF<sub>j</sub>)</strong></em></p>
<p>GHG Emissions: Total Market based emissions from electricity (ton GHG(j))</p>
<p>Q<sub>R</sub> : Renewable energy certificate purchases (MWh)</p>
<p>Q<sub>N</sub> : Net electricity consumption (MWh) = Electricity
consumption (MWh) – Renewable energy certificate purchases (MWh)</p>
<p>EF<sub>R</sub> : Renewable energy certificate emission factor
(tGHG/MWh)</p>
<p>EF<sub>j</sub> : Market based electricity GHG emission factor
(tGHG/MWh)</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<br><br>

### **Use case: Calculation of Electricity Emissions for General Companies**

**Scenario**

Company C operates a headquarters office building and three
manufacturing plants, all of which consume electricity supplied by
KEPCO. For ESG disclosure and internal energy efficiency management, the
company calculates its Scope 2 indirect emissions annually.

**1) Data Collection**

Priority 1 --- Direct Measurement

- Obtain electricity consumption (MWh) data for each site using legal
  metering devices.

Priority 2 --- Supplier Data

- If meters fail or data is missing, retrieve usage records from KEPCO ON or Energy Marketplace.

2\) Verification of Renewable Electricity Usage

- Distinguish between electricity generated onsite (solar, wind, etc.)
  and purchased electricity.

- For renewable electricity with verified proof (such as REC or PPA
  contracts), the corresponding emissions are calculated using the
  renewable energy sources to reflect the avoided emissions in
  market-based approach.

3\) Emission Factor Application

- For the location-based approach, apply the national electricity
  emission factor (e.g., 0.4781 tCO2eq/MWh).

- For the market-based approach, distinguish the verified renewable electricity and the remaining electricity use. Apply the renewable energy emission factor for the verified renewable electricity purchases. If available, apply the residual mix emission factor for the net electricity use. Otherwise, apply the national grid emission factor used in location-based approach as well for the net electricity use.

4\) Emission Calculation Procedure

- Calculate total electricity consumption (MWh) and distinguish verified renewable electricity purchases amount.

- Apply the formula for location-based approach: Total Location based emissions = Q × EF<sub>j</sub>

    - Q : Electricity consumption (MWh)

    - EF<sub>j</sub> : Location based emission factor (tGHG/MWh)

-  Apply the formula for market-based approach: Total Market based emissions = ∑(Q<sub>R</sub> × EF<sub>R</sub>) + (Q<sub>N</sub> × EF<sub>j</sub>)

    - Q<sub>R</sub> : Renewable energy certificate purchases (MWh)

    - EF<sub>R</sub> : Renewable energy certificate emission factor

    - Q<sub>N</sub> : Net electricity consumption (MWh)

    - EF<sub>j</sub> : Market based emission Factor (tGHG/MWh)

Calculation Example:

- Electricity consumption: 15,000 MWh

- Renewable energy certificate purchases:

  - Indirect PPA: 300 MWh

  - Direct PPA: 0 MWh

  - REC: 1,200 MWh

  - Equity Participation: 0 MWh

- EF<sub>j</sub>: 0.4781 tCO₂eq/MWh

- EF<sub>R</sub>: 0 tCO₂eq/MWh

- Location based emission: 15,000 MWh × 0.4781 tCO₂eq/MWh = 7,171.5
  tCO₂eq

- Market based emission: (300 MWh x 0 tCO₂eq/MWh) + (1,200 MWh x 0
  tCO₂eq/MWh) + \[(15,000 MWh - 300 MWh - 1,200 MWh) x 0.4781
  tCO₂eq/MWh\] = 6,454.35 tCO₂eq

5\) Result Application

- Sustainability reporting / ESG disclosure: Reflect in Scope 2
  emissions

- Establish KPIs for energy efficiency improvement

- Track renewable usage ratio and develop expansion strategies

![](./Electricity%20Flow.jpg)
