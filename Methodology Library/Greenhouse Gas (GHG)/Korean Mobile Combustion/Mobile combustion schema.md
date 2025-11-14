# **Mobile Combustion (Road)**

### **Tool Summary**

This methodology provides a standardized framework for reporting
organizations in Korea to quantify, report, and verify direct greenhouse
gas (GHG) emissions from the combustion of transport fuels. It is
applicable to reporting organizations that own equipment (passenger,
commercial, freight vehicles, etc.) in the mobile combustion (road)
sector and generate greenhouse gas emissions, or to organizations that
do not own such equipment but report emissions from the mobile
combustion (road) sector. All parameters---such as calorific values,
emission factors, and vehicle classification---are based on national
default coefficients.

### **This methodology is applicable for**

- Companies with owned vehicles, or leased with operational control (Scope 1), using transport fuels
  (Passenger Car, Van, and Truck).

- Companies that leases or rent vehicles using transport fuels but do not have an operational control, with
  respect to their lease or rent emissions (Scope 3 category 8 and 13).

- Road transportation companies, with respect to their product emissions
  (Scope 3 category 11).

- Companies that uses road transportation services, with respect to their upstream or downstream emissions (Scope 3 category 4 and 9).
<br><br>

### **User Input**

- Vehicle type

\- Passenger Car / Van / Truck

- Applicable reporting year

- Vehicle Size

- Fuel type

- Primary driving road

\- Urban / Highway

\- Used to assume the average speed of the vehicle

- Activity Data Units

\- KRW, L, km

- Fuel Spend (KRW)

\- Available if 'KRW' is selected as an activity data unit

- Fuel Consumption (L)

\- Available if 'L' is selected as an activity data unit

- Driving Distance (km)

\- Available if 'km' is selected as an activity data unit

\- Most preferred activity data -- provides the most accurate emission
results
<br><br>

**[Unit Conversion]**

**Extrapolated Driving Distance (km)**

= (Fuel Spend (KRW) / Fuel Cost (KRW/L) x Fuel Efficiency (km/L))

OR = (Fuel Consumption (L) x Fuel Efficiency (km/L))
<br><br>

### **Applied Vehicle Types**

| **Type**  | **Size**   | **Description**                                                                                                                                              | **Fuel Type**                 |
| --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Passenger | Mini       | Engine displacement below 1,000cc                                                                                                                            | Gasoline, LPG                 |
|           | Small      | Engine displacement below 1,600cc                                                                                                                            | Gasoline, Diesel, LPG         |
|           | Medium     | 1,600cc ≤ Engine displacement \< 2,000cc                                                                                                                     | Gasoline, Diesel, LPG, Hybrid |
|           | Large      | Engine displacement 2,000cc or above                                                                                                                         | Gasoline, Diesel, LPG, Hybrid |
| Van       | Small      | Length ≤ 4.7m, Width ≤ 1.7m, Height ≤ 2m, Seating capacity ≤ 15 passengers                                                                                   | Diesel, LPG                   |
|           | Medium     | Exceeds at least one dimension of the small van standards (length, width, or height) AND total length less than 9 meters OR 16 ≤ passengers ≤ 35             | Diesel                        |
|           | Intercity  | Exceeds at least one dimension of the small van standards (length, width, or height) AND total length 9 meters or above OR Seating capacity ≤ 36 passengers  | Diesel, CNG                   |
|           | Urban      |                                                                                                                                                              | CNG                           |
|           | All Routes |                                                                                                                                                              | CNG                           |
| Truck     | Small      | Maximum payload ≤ 1 ton AND gross vehicle weight ≤ 3.5 tons                                                                                                  | Diesel                        |
|           | Medium     | 1 ton \< Maximum payload \< 5 tons OR 3.5 tons \< gross vehicle weight \< 10 tons                                                                            | Diesel                        |
|           | Large      | 5 tons ≤ Maximum payload OR 10 tons ≤ Gross vehicle weight                                                                                                   | Diesel                        |
<br><br>

### **Applied Emission Factors**

- National emission factors by each vehicle type must be used to
  calculate emissions

- y: emission factor

- x: average vehicle speed

- 50km/h automatically applied if 'urban' is selected as a primary
driving road

- 80km/h automatically applied if 'highway' is selected as a primary
driving road

| **Vehicle Type** | **Size**   | **Fuel** | **Primary Driving Road** | **CO2 Emission Factors**              | **CH4 Emission Factors** | **N2O Emission Factors** |
| ---------------- | ---------- | -------- | ------------------------ | ------------------------------------- | ------------------------ | ------------------------ |
| Passenger Car    | Mini       | Gasoline | Urban                    | y = 1065.1722x\^(-0.5889)             | y = -0.0001 + 0.0448/x   | y = 0.0001 + 0.0739/x    |
|                  |            |          | Highway                  | y = 0.0225x\^2 -- 3.3075x + 212.8460  |                          |                          |
|                  |            | LPG      | Urban                    | y = 989.9413x\^(-0.5937)              | y = 0.0114x\^(-0.7073)   | y = -0.0001 + 0.0217/x   |
|                  |            |          | Highway                  | y = 0.0172x\^2 - 2.3601x + 167.3842   |                          |                          |
|                  | Small      | Gasoline | Urban                    | y = 1256.0382x\^(-0.5914)             | y = -0.0003 + 0.0341/x   | y = 0.1596x\^(-1.3285)   |
|                  |            |          | Highway                  | y = 0.0252x\^2 - 3.7270x + 245.9051   |                          |                          |
|                  |            | Diesel   | Urban                    | y = 1037.3974x\^(-0.5800)             | y = 0.0015 + 0.2136/x    | y = 0.0030 + 0.1311/x    |
|                  |            |          | Highway                  | y = 0.0133x\^2 - 1.3612x + 129.4859   |                          |                          |
|                  |            | LPG      | Urban                    | y = 1223.8670x\^(-0.6046)             | y = -0.0004 + 0.0462/x   | y = 0.0189x\^(-0.8916)   |
|                  |            |          | Highway                  | y = 0.0188x\^2 - 2.7902x + 203.7804   |                          |                          |
|                  | Medium     | Gasoline | Urban                    | y = 1446.3728x\^(-0.5793)             | y = 0.1204x\^(-1.1138)   | y = 0.0880x\^(-1.1179)   |
|                  |            |          | Highway                  | y = 0.0343x\^2 - 5.4212x + 339.8479   |                          |                          |
|                  |            | Diesel   | Urban                    | y = 1153.5685x\^(-0.5507)             | y = 0.1644x\^(-1.1595)   | y = 0.0007 + 0.1256/x    |
|                  |            |          | Highway                  | y = 0.0226x\^2 - 3.0857x + 225.8804   |                          |                          |
|                  |            | LPG      | Urban                    | y = 1513.8104x\^(-0.6075)             | y = 0.1805x\^(-1.3538)   | y = 0.0444x\^(-1.1455)   |
|                  |            |          | Highway                  | y = 0.0245x\^2 - 3.6654x + 257.7428   |                          |                          |
|                  |            | Hybrid   | Urban                    | y = 211.9807x\^(-0.1884)              | y = -0.0010 + 0.1519/x   | y = -0.0001 + 0.0914/x   |
|                  |            |          | Highway                  | y = 0.0205x\^2 -- 2.8635x + 190.4598  |                          |                          |
|                  | Large      | Gasoline | Urban                    | y = 2022.6604x\^(-0.6183)             | y = -0.00003 + 0.0758/x  | y = 0.0001 + 0.0587/x    |
|                  |            |          | Highway                  | y = 0.0374x\^2 - 5.9783x + 385.8791   |                          |                          |
|                  |            | Diesel   | Urban                    | y = 1149.2206x\^(-0.5313)             | y = 0.0046 + 0.2333/x    | y = 0.1131x\^(-0.7219)   |
|                  |            |          | Highway                  | y = 0.0246x\^2 - 3.3168x + 239.5643   |                          |                          |
|                  |            | LPG      | Urban                    | y = 1967.2719x\^(-0.6616)             | y = 0.0612x\^(-1.0387)   | y = 0.0694x\^(-1.1011)   |
|                  |            |          | Highway                  | y = 0.0295x\^2 - 4.6079x + 301.8248   |                          |                          |
|                  |            | Hybrid   | Urban                    | y = 522.2199x\^(-0.3855)              | y = 0.0668x\^(-1.2132)   | y = 0.1769x\^(-1.1254)   |
|                  |            |          | Highway                  | y = 0.0164x\^2 - 2.1338x + 176.8101   |                          |                          |
| Van              | Small      | Diesel   | Urban                    | y = 1656.7736x\^(-0.5824)             | y = 0.0455x\^(-0.8686)   | y = 0.0028 + 0.1269/x    |
|                  |            |          | Highway                  | y = 0.0137x\^2 - 1.3681x + 180.5588   |                          |                          |
|                  |            | LPG      | Urban                    | y = 1732.5734x\^(-0.5552)             | y = 0.0704x\^(-0.8867)   | y = 0.1053x\^(-0.9547)   |
|                  |            |          | Highway                  | y = 0.0023x\^2 + 0.2596x + 145.7436   |                          |                          |
|                  | Medium     | Diesel   | Urban                    | y = 264.4900 + 2879.7277/x            | y = 0.6210x\^(-0.9389)   | y = 0.0043 + 0.0907/x    |
|                  |            |          | Highway                  | y = 1.3266x + 201.4001                |                          |                          |
|                  | Intercity  | Diesel   | Urban                    | y = 4317.2386x\^(-0.5049)             | y = 0.4345x\^(-0.9658)   | y = 0.0265 + 0.4362/x    |
|                  |            |          | Highway                  | y = 0.1829x\^2 - 29.8145x + 1670.8962 |                          |                          |
|                  |            | CNG      | Urban                    | y = 5011.6276x\^(-0.5579)             | y = 50.5239x\^(-0.7111)  | y = 10.5990x\^(-1.7414)  |
|                  |            |          | Highway                  | y = 0.1122x\^2 - 17.5798x + 1141.5327 |                          |                          |
|                  | Urban      | CNG      | Urban                    | y = 5054.5880x\^(-0.4910)             | y = 56.0080x\^(-0.7349)  | y = 0.2641x\^(-0.8324)   |
|                  |            |          | Highway                  |                                       |                          |                          |
|                  | All Routes | CNG      | Urban                    | y = 5727.0583x\^(-0.5552)             | y = 53.0482x\^(-0.7242)  | y = 1.5910x\^(-1.3104)   |
|                  |            |          | Highway                  | y = 0.1122x\^2 - 17.5798x + 1141.5327 |                          |                          |
| Truck            | Small      | Diesel   | Urban                    | y = 1250.4831x\^(-0.4630)             | y = -0.0013 + 0.1734/x   | y = 0.3417x\^(-1.1361)   |
|                  |            |          | Highway                  | y = 0.0292x\^2 -- 2.9530x + 258.3205  |                          |                          |
|                  | Medium     | Diesel   | Urban                    | y = 1385.8860x\^(-0.4184)             | y = 0.5699x\^(-0.8608)   | y = 0.1216x\^(-0.7262)   |
|                  |            |          | Highway                  | y = 1.6720x + 141.2224                |                          |                          |
|                  | Large      | Diesel   | Urban                    | y = 3351.2892x\^(-0.4407)             | y = 0.3408x\^(-1.0456)   | y = 0.0346 + 0.8961/x    |
|                  |            |          | Highway                  |                                       |                          |                          |

Source: Greenhouse Gas Inventory and Research Center of Korea

### **Fuel Efficiency & Cost**

- Based on 2024 January data

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 16%" />
<col style="width: 21%" />
<col style="width: 22%" />
<col style="width: 23%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Type</strong></th>
<th><strong>Size</strong></th>
<th><strong>Fuel Type</strong></th>
<th><p><strong>Fuel Efficiency</strong></p>
<p><strong>(km/L)</strong></p></th>
<th><p><strong>Fuel Cost</strong></p>
<p><strong>(KRW/L)</strong></p></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td rowspan="13">Passenger</td>
<td rowspan="2">Mini</td>
<td>Gasoline</td>
<td>14.3</td>
<td>1643.37</td>
</tr>
<tr class="even">
<td>LPG</td>
<td>11.58</td>
<td>1382</td>
</tr>
<tr class="odd">
<td rowspan="3">Small</td>
<td>Gasoline</td>
<td>12.45</td>
<td>1643.37</td>
</tr>
<tr class="even">
<td>Diesel</td>
<td>15.37</td>
<td>1568.06</td>
</tr>
<tr class="odd">
<td>LPG</td>
<td>10.47</td>
<td>1382</td>
</tr>
<tr class="even">
<td rowspan="4">Medium</td>
<td>Gasoline</td>
<td>10.61</td>
<td>1643.37</td>
</tr>
<tr class="odd">
<td>Diesel</td>
<td>13.71</td>
<td>1568.06</td>
</tr>
<tr class="even">
<td>LPG</td>
<td>9.42</td>
<td>1382</td>
</tr>
<tr class="odd">
<td>Hybrid</td>
<td>13.98</td>
<td>1643.37</td>
</tr>
<tr class="even">
<td rowspan="4">Large</td>
<td>Gasoline</td>
<td>8.49</td>
<td>1643.37</td>
</tr>
<tr class="odd">
<td>Diesel</td>
<td>11.80</td>
<td>1568.06</td>
</tr>
<tr class="even">
<td>LPG</td>
<td>7.14</td>
<td>1382</td>
</tr>
<tr class="odd">
<td>Hybrid</td>
<td>9.83</td>
<td>1643.37</td>
</tr>
<tr class="even">
<td rowspan="7">Van</td>
<td rowspan="2">Small</td>
<td>Diesel</td>
<td>10.55</td>
<td>1568.06</td>
</tr>
<tr class="odd">
<td>LPG</td>
<td>6.35</td>
<td>1382</td>
</tr>
<tr class="even">
<td>Medium</td>
<td>Diesel</td>
<td>10.55</td>
<td>1568.06</td>
</tr>
<tr class="odd">
<td rowspan="2">Intercity</td>
<td>Diesel</td>
<td>10.55</td>
<td>1568.06</td>
</tr>
<tr class="even">
<td>CNG</td>
<td>NA</td>
<td>NA</td>
</tr>
<tr class="odd">
<td>Urban</td>
<td>CNG</td>
<td>NA</td>
<td>NA</td>
</tr>
<tr class="even">
<td>All Routes</td>
<td>CNG</td>
<td>NA</td>
<td>NA</td>
</tr>
<tr class="odd">
<td rowspan="3">Truck</td>
<td>Small</td>
<td>Diesel</td>
<td>6.06</td>
<td>1568.06</td>
</tr>
<tr class="even">
<td>Medium</td>
<td>Diesel</td>
<td>3.58</td>
<td>1568.06</td>
</tr>
<tr class="odd">
<td>Large</td>
<td>Diesel</td>
<td>2.46</td>
<td>1568.06</td>
</tr>
</tbody>
</table>

Source: Opinet & Transportation Integrated Operation System
<br><br>

### **Emission Calculation**

<p><strong><em>E<sub>i,j</sub> = Distance<sub>i,k,l,m</sub> × EF<sub>i,j,k,l</sub> × 10<sup>-6</sup></em></strong></p>

<p><strong>E<sub>i,j</sub></strong> : Total greenhouse gas <em>(j)</em> emissions (<strong>tGHG</strong>)</p>

<p><strong>Distance<sub>i,k,l,m</sub></strong> : Driving distance (<strong>km</strong>)</p>
<ul>
  <li>If driving distance data is unavailable, Fuel Spend (<strong>KRW</strong>) or Fuel Consumption (<strong>L</strong>) data can be used to calculate extrapolated driving distance (<strong>km</strong>).</li>
</ul>

<p><strong>EF<sub>i,j,k,l</sub></strong> : GHG (<em>j</em>) emission factor (<strong>g/km</strong>)</p>
<ul>
  <li><strong>i</strong>: fuel type</li>
  <li><strong>j</strong>: GHG type</li>
  <li><strong>k</strong>: vehicle type</li>
  <li><strong>l</strong>: vehicle size</li>
  <li><strong>m</strong>: average speed</li>
</ul>
<br><br>

### **Use case: Calculation of Mobile Combustion Emissions for General Companies**

**Scenario**

Company A owns a fleet of vehicles, including passenger cars, vans, and
trucks, for business operations. These vehicles run on various fuels
such as gasoline, diesel, LPG, and CNG, and operate under different
driving conditions. To comply with ESG management and legal obligations
(e.g., the GHG & Energy Target Management System), the company annually
reports its Scope 1 greenhouse gas emissions from the combustion of
transport fuels in its owned vehicles.

**1) Data Collection**

Priority 1 -- Direct activity data

- Driving distance (km) data per vehicle for the reporting year, measured from
  odometer/GPS or retrieved via a mapping service API.

Priority 2 -- Cost based proxy

- If driving distance data is unavailable, use total fuel cost (KRW) or
  fuel consumption (L) data per vehicle for the reporting year from the finance system or receipts

- The average cost of fuel and mileage are applied to estimate driving
  distance

**2) Emission Factor Application**

- Apply emission factor provided by the GHG Inventory and Research
  Center according to the vehicle type and size.

**3) Emission Calculation Procedure**

1.  Obtain a vehicle's driving distance (km) data.

    A. Measured via odometer, GPS, or mapping service API

2.  If a driving distance data is unavailable, estimate a driving
    distance by fuel spend (KRW) data or fuel consumption (L) data with
    the average fuel cost and mileage.

3.  Calculate the appropriate emission factors based on vehicle and fuel
    type.

4.  Apply calculation formula

    A. _E~i,j~ = Distance~i,k,l,m~ × EF~i,j,k,l~ × 10^-6^_

Calculation Example:

- Vehicle type: Passenger Car

- Vehicle Size: Medium

- Fuel type: Gasoline

- Primary Driving Road: Urban

- Driving distance: 15,000 km

- _EF~i,j,k,l ~_= 149.99 CO₂g/km

- Emissions (CO₂) = 15,000 km x 149.99 CO₂g/km*×* 10^-6^ = 2.25 ton CO₂

**4) Result Application**

- Sustainability reporting / ESG disclosure: Reflect in Scope 1
  emissions

- Internal management: Monitor emissions by site and department and set
  reduction targets for mobile combustion.

- Cost analysis: Manage energy costs and emissions to develop vehicle
  efficiency strategies

![텍스트, 영수증, 스크린샷, 도표이(가) 표시된 사진 자동 생성된
설명](./image_3.png)
