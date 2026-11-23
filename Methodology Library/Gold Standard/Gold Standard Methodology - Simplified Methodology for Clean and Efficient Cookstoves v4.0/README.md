# Gold Standard Methodology – Simplified Methodology for Clean and Efficient Cookstoves Version 4.0

Across many regions, households rely on traditional cooking devices such as three-stone fires and other conventional stoves burning wood or charcoal as their primary fuel. This practice drives significant fuel consumption, indoor air pollution, and associated greenhouse gas (GHG) emissions.

The Simplified Methodology for Clean and Efficient Cookstoves (GS4GG PAA M400-07, V4.0) provides the standardized approach for quantifying GHG emission reductions achieved through the introduction of clean and efficient cooking technologies at the household level.

This methodology enables activity developers to introduce efficient cooking technologies such as improved biomass cookstoves, solar cookers, and other decentralized thermal energy devices that reduce or displace emissions from the thermal energy consumption of household cooking. It is a micro-scale methodology (≤10,000 tCO₂e/year) restricted to activities where the baseline is unambiguously a traditional stove (e.g., three-stone fire, or mud/clay stove with no grate or air vent) burning wood or charcoal as ≥90% of thermal energy needs. If baseline evidence shows heterogeneous or already-improved devices, the Reduced Emissions from Cooking and Heating (RECH, formerly TPDDTEC) methodology applies instead.

---

## Baseline Scenarios

To quantify baseline emissions, the policy accommodates two distinct baseline pathways for establishing baseline fuel consumption:

**Option A: Historical Consumption (B-KPT)**
Baseline fuel consumption is determined ex-ante via a statistically representative Baseline Kitchen Performance Test (B-KPT), subject to 90/10 statistical adjustment and per-capita capping (wood: 1.25 t/capita/yr cap; charcoal: 0.40 t/capita/yr cap). See "Assumptions & Fixed Parameters" for the separate per-capita thresholds above which third-party substantiation is required.

**Option B: Conservative Default / Minimum Service Level (MSL)**
Bypasses ex-ante field testing. Used when suppressed demand is claimed, meaning the pre-activity energy consumption of the target population is below basic human needs due to constraints such as poverty. Baseline fuel consumption is calculated using fixed per-capita defaults ($0.50$ tonnes/year for wood and $0.13$ tonnes/year for charcoal) multiplied by the baseline household size. A mandatory 5% conservativeness discount is automatically applied to this default.

---

## Applicability

The methodology applies where:

- Activity scale ≤10,000 tCO₂e/crediting year.
- Primary baseline fuel is wood or charcoal (>90% of thermal energy needs), and the baseline stove is a Traditional Stove.
- The activity stove meets minimum rated thermal efficiency thresholds (20–30% depending on technology/fuel), determined via ISO 19867-1 or WBT testing.
- Mechanisms are in place to encourage baseline technology displacement (e.g., trade-in programs, safe disposal, conditional subsidies, awareness campaigns).
- Technical life and replacement provisions are documented; retrofitted/repaired devices require warranty, guarantee, or durability-test evidence to continue claiming reductions.
- Double-counting safeguards are met: unique device tracking, informed consent/carbon-waiver documentation, and exclusion from overlapping mechanisms (SWS, jurisdictional REDD+, other PoAs).
- Indoor air pollution levels are demonstrated not to worsen relative to baseline, evidenced via baseline and activity IAP test result uploads captured in the PDD's Activity Technology and Applicability sub-schema.

---

## Policy Guide

### Available Roles
*   **Activity Developer (AD)**
Responsible for managing the project, maintaining the sales and distribution database, executing KPTs and usage surveys, uploading all required credentials and evidence to the platform, and assigning Validators and Verifiers for reviews.

*   **Validation and Verification Body (VVB)**
Independent party that checks whether an activity's emission reduction claims are correct: reviewing project documents and emissions data, conducting site visits or KPT/usage-survey audits, and issuing validation or verification reports.

*   **Authorization Body (Gold Standard)**
The standard registry acting as the ultimate authority, reviewing the VVB-approved files and authorizing the issuance of digital carbon credits.

### Schemas
*   **Project Form:** Captures preliminary information about the project activities, developer details, scale limits, and basic applicability checks.

*   **Project Design Document (PDD):** Documents project eligibility, applicability screening (including baseline and activity Activity Technology and Applicability evidence such as IAP test results), and additionality justification.

*   **Validation Report:** Captures the VVB's formal audit and approval of the project's ex-ante eligibility and boundary conditions.

*   **Monitoring Report:** Captures baseline fuel consumption data (B-KPT survey or MSL defaults), activity operational data (stove counts, usage rates, P-KPT results), fuel and emission factor data, and Hawthorne Effect monitoring data — all within a single document. All emission calculations (baseline, activity, Hawthorne, leakage, and net reductions) are performed automatically within this document via the Guardian mathBlock.

*   **Verification Report:** Records the VVB's independent check of the ex-post monitoring results and calculated emission reductions.

---

## Policy Workflow

The policy coordinates interactions between roles through a sequential, state-driven workflow:

<p align="center">
<img src="./Assets/Images/workflow_diagram.png" alt="Flow Diagram" width="90%"/>
</p>

## Step-by-Step Approach

#### User Onboarding
Users select their roles, submit onboarding forms with entity details, and wait for the Registry's approval. If approved, they unlock subsequent forms and if rejected, they are returned to onboarding again.

*   Log in as a Default User and select a role (Activity Developer or Validation and Verification Body).

<p align="center">
<img src="./Assets/Images/user_onboarding/001.png" alt="Select role" width="90%"/>
</p>

*   Fill in the User Onboarding form and submit that for approval.

<p align="center">
<img src="./Assets/Images/user_onboarding/002.png" alt="AD onboarding form" width="90%"/>
</p>

<p align="center">
<img src="./Assets/Images/user_onboarding/003.png" alt="VVB onboarding form" width="90%"/>
</p>

<p align="center">
<img src="./Assets/Images/user_onboarding/004.png" alt="User waiting" width="90%"/>
</p>

*   Administrator review pending user profiles.

<p align="center">
<img src="./Assets/Images/user_onboarding/005.png" alt="Pending AD" width="90%"/>
</p>

<p align="center">
<img src="./Assets/Images/user_onboarding/006.png" alt="Pending VVB" width="90%"/>
</p>

#### Registration Phase
The AD creates the project form and the detailed PDD, including eligibility screening, additionality justification, and applicability evidence (e.g. baseline and activity IAP test results). The assigned VVB conducts an independent audit, submits the Validation Report, and assigns the AD read-only access. The Registry reviews and grants final Design Certification.
<!-- MARK: Project Form -->
*   The AD submits Project Form, assigns an approved VVB, and awaits VVB and Registry approvals.

<p align="center">
<img src="./Assets/Images/registration/001.png" alt="Create Project Form" width="90%"/>
</p>

<p align="center">
<img src="./Assets/Images/registration/002.png" alt="Fill in Project Form" width="90%"/>
</p>

<p align="center">
<img src="./Assets/Images/registration/003.png" alt="Assign VVB to Project Form" width="90%"/>
</p>

*   VVB reviews pending Project Forms.

<p align="center">
<img src="./Assets/Images/registration/004.png" alt="VVB review Project Form" width="90%"/>
</p>

*   Administrator reviews third-party approved Project Forms.

<p align="center">
<img src="./Assets/Images/registration/005.png" alt="Administrator review Project Form" width="90%"/>
</p>

<!-- MARK: PDD -->
*   The AD submits Project Design Document, assigns a VVB, and awaits VVB and Registry approval.

<p align="center">
<img src="./Assets/Images/registration/006.png" alt="Create Project Design Document" width="90%"/>
</p>

<p align="center">
<img src="./Assets/Images/registration/007.png" alt="Fill in Project Design Document" width="90%"/>
</p>

<p align="center">
<img src="./Assets/Images/registration/008.png" alt="Assign VVB to Project Design Document" width="90%"/>
</p>

*   VVB reviews pending Project Design Documents.

<p align="center">
<img src="./Assets/Images/registration/009.png" alt="VVB review Project Design Document" width="90%"/>
</p>

*   Administrator reviews third-party approved Project Design Documents.

<p align="center">
<img src="./Assets/Images/registration/010.png" alt="Administrator review Project Design Document" width="90%"/>
</p>

<!-- MARK: Validation Report -->
*   The VVB submits Validation Report, assigns corresponding AD, and awaits Registry approvals.

<p align="center">
<img src="./Assets/Images/registration/011.png" alt="Create Validation Report" width="90%"/>
</p>

<p align="center">
<img src="./Assets/Images/registration/012.png" alt="Fill in Validation Report" width="90%"/>
</p>

<p align="center">
<img src="./Assets/Images/registration/013.png" alt="Assign AD to Validation Report" width="90%"/>
</p>

*   Administrator reviews pending Validation Reports.

<p align="center">
<img src="./Assets/Images/registration/014.png" alt="Administrator review Validation Report" width="90%"/>
</p>

#### Verification & Issuance Phase
The AD submits the Monitoring Report, which includes both baseline fuel consumption data (B-KPT survey or MSL defaults) and ex-post monitoring data (operational stove count, annual usage rate surveys, and biennial P-KPT parameters). The VVB audits the Monitoring Report, verifies the physical records (calibrations, survey samples), and submits the Verification Report for Registry final sign-off. Upon Registry approval, the platform automatically calculates the net emission reductions, mints the equivalent amount of digital carbon tokens, and transfers them to the AD's account.

<!-- MARK: Monitoring Report -->
*   The AD submits Monitoring Report, assigns a VVB, and awaits VVB approval.

<p align="center">
<img src="./Assets/Images/verification/001.png" alt="Create Monitoring Report" width="90%"/>
</p>

<p align="center">
<img src="./Assets/Images/verification/002.png" alt="Fill in Monitoring Report" width="90%"/>
</p>

<p align="center">
<img src="./Assets/Images/verification/003.png" alt="Assign VVB to Monitoring Report" width="90%"/>
</p>

*   VVB reviews pending Monitoring Reports.

<p align="center">
<img src="./Assets/Images/verification/004.png" alt="VVB review Monitoring Report" width="90%"/>
</p>

<!-- MARK: Verification Report -->
*   The VVB submits Verification Report, assigns corresponding AD, and awaits Registry approvals.

<p align="center">
<img src="./Assets/Images/verification/005.png" alt="Create Verification Report" width="90%"/>
</p>

<p align="center">
<img src="./Assets/Images/verification/006.png" alt="Fill in Verification Report" width="90%"/>
</p>

<p align="center">
<img src="./Assets/Images/verification/007.png" alt="Assign AD to Verification Report" width="90%"/>
</p>

*   Administrator reviews pending Verification Reports.

<p align="center">
<img src="./Assets/Images/verification/008.png" alt="Administrator review Verification Report" width="90%"/>
</p>

<!-- MARK: Token -->
*   Once the Verification Report is Approved, system automatically mints and transfer the tokens to the AD account. 

<p align="center">
<img src="./Assets/Images/verification/009.png" alt="Tokens minted and transferred" width="90%"/>
</p>

<p align="center">
<img src="./Assets/Images/verification/010.png" alt="Trustchain" width="90%"/>
</p>







---

## Methodology Calculations (mathBlock)

All calculations are executed automatically within the Hedera Guardian **mathBlock** to ensure transparent, tamper-proof, and verifiable computations:

### Baseline Fuel Consumption Adjustment ($P_{b,adj}$)
Before calculating baseline emissions, the system establishes the conservative, adjusted baseline fuel consumption per household.

#### Path A: Historical Baseline (B-KPT)
When using empirical field data, the unadjusted baseline consumption ($P_{b,mean}$) is statistically adjusted based on a 90/10 precision target and capped to prevent over-crediting:
$$P_{b,adj} = \min(P_{b,stat}, P_{CAP} \times HN_b)$$

#### Path B: Conservative Default / Minimum Service Level (MSL)
When utilizing default values under suppressed demand, a mandatory 5% conservativeness discount is automatically applied:
$$P_{b,adj} = P_{b,mean} \times 0.95$$

#### Variable Definitions:
*   **$P_{b,adj}$** (tonnes/household/year): Uncertainty adjusted baseline fuel consumption used in subsequent emissions equations.
*   **$P_{b,stat}$** (tonnes/household/year): The statistically adjusted baseline fuel consumption. Equals the unadjusted mean ($P_{b,mean}$) if the 90/10 precision target is met; otherwise, it automatically defaults to the Lower Bound of the one-sided 90% confidence interval ($P_{b,LB90}$).
*   **$P_{CAP}$** (tonnes/person/year): The maximum allowable baseline fuel consumption cap per capita. Hardcoded to 1.25 for wood and 0.40 for charcoal.
*   **$HN_b$** (persons): Number of individuals per household in the baseline scenario, established ex-ante.
*   **$P_{b,mean}$** (tonnes/household/year): The unadjusted baseline fuel consumption. Under Path B, this is equal to the per-capita default ($P_{MSL,capita}$) multiplied by $HN_b$ (where defaults are 0.50 for wood and 0.13 for charcoal).
*   **$0.95$**: The mandatory 5% downward conservativeness discount factor.

### Unadjusted Baseline Emissions ($BE_{unadj,y}$)
Calculated to establish a starting point before applying statistical or regulatory adjustments:
$$BE_{unadj,y} = \sum_{b} \left( N_{b,y} \times U_{b,y} \times P_{b,mean} \times NCV_{fuel} \times (EF_{fuel,CO2} \times fNRB_{y} + EF_{fuel,non-CO2}) \right)$$

#### Variable Definitions:
*   **$BE_{unadj,y}$** ($tCO_2e/year$): Total unadjusted baseline emissions in year $y$.
*   **$N_{b,y}$** (stoves): Number of stoves in the baseline scenario, as established ex-ante.
*   **$U_{b,y}$** (fraction): Usage rate applied to the baseline scenario in year $y$.
*   **$P_{b,mean}$** (tonnes/household/year): Mean quantity of baseline fuel consumed in year $y$.
*   **$NCV_{fuel}$** (TJ/tonne): Net calorific value of baseline fuel.
*   **$EF_{fuel,CO2}$** ($tCO_2/TJ$): $CO_2$ emission factor of baseline fuel.
*   **$EF_{fuel,non-CO2}$** ($tCO_2e/TJ$): Weighted non-$CO_2$ ($CH_4$ and $N_2O$) emission factor of baseline fuel.
*   **$fNRB_{y}$** (fraction): Fraction of non-renewable biomass used in year $y$.

### Uncertainty-Adjusted Baseline Emissions ($BE_{unc,y}$)
Integrates the statistically adjusted and capped baseline fuel consumption ($P_{b,adj}$) to ensure baseline emissions are conservatively calculated:
$$BE_{unc,y} = \sum_{b} \left( N_{b,y} \times U_{b,y} \times P_{b,adj} \times NCV_{fuel} \times (EF_{fuel,CO2} \times fNRB_{y} + EF_{fuel,non-CO2}) \right)$$

#### Variable Definitions:
*   **$BE_{unc,y}$** ($tCO_2e/year$): Total uncertainty-adjusted baseline emissions in year $y$.
*   **$P_{b,adj}$** (tonnes/household/year): Adjusted baseline fuel consumption from "Baseline Fuel Consumption Adjustment".
*   *(All other variables as defined under "Unadjusted Baseline Emissions").*

### Downward Adjusted Baseline Emissions ($BE_{adj,y}$)
Saves the baseline emissions adjusted downward by the country's net-zero transition rate:
$$BE_{adj,y} = BE_{unc,y} \times (1 - DAF_{NetZero,y})$$

#### Variable Definitions:
*   **$BE_{adj,y}$** ($tCO_2e/year$): Downward-adjusted baseline emissions in year $y$.
*   **$BE_{unc,y}$** ($tCO_2e/year$): Uncertainty-adjusted baseline emissions.
*   **$DAF_{NetZero,y}$** (fraction): Downward Adjustment Factor sourced from GS4GG Tool 05, based on the host country and monitoring year.

### Conservative Business-As-Usual Emissions ($BAU_y$)
Quantifies baseline emissions excluding national policy ambition trends to serve as a safety boundary:
$$BAU_y = BE_{unc,y}$$

#### Variable Definitions:
*   **$BAU_y$** ($tCO_2e/year$): Conservative Business-as-Usual emissions in year $y$.
*   **$BE_{unc,y}$** ($tCO_2e/year$): Uncertainty-adjusted baseline emissions.

### Final Crediting Baseline Emissions ($BE_y$)
Enforces conservative crediting by programmatically selecting the lower value between the downward-adjusted baseline and the unadjusted BAU scenario:
$$BE_y = \min(BE_{adj,y}, BAU_y)$$

#### Variable Definitions:
*   **$BE_y$** ($tCO_2e/year$): Final crediting baseline emissions in year $y$.
*   **$BE_{adj,y}$** ($tCO_2e/year$): Downward-adjusted baseline emissions in year $y$.
*   **$BAU_y$** ($tCO_2e/year$): Conservative Business-as-Usual emissions in year $y$.

### Excluded Emissions due to Ambition Adjustment ($\Delta_y$)
Identifies and logs emissions excluded from carbon credit claims due to country-level net-zero alignment:
$$\Delta_y = BAU_y - BE_y$$

#### Variable Definitions:
*   **$\Delta_y$** ($tCO_2e/year$): Emissions excluded from the crediting baseline due to the ambition adjustment in year $y$.
*   **$BAU_y$** ($tCO_2e/year$): Conservative Business-as-Usual emissions in year $y$.
*   **$BE_y$** ($tCO_2e/year$): Final crediting baseline emissions in year $y$.

### Total Activity Emissions ($AE_y$)
Calculates actual emissions generated during the activity scenario:
$$AE_y = \sum_{p} \left( N_{p,y} \times U_{p,y} \times P_{a,adj,y} \times NCV_{fuel} \times (EF_{fuel,CO2} \times fNRB_{y} + EF_{fuel,non-CO2}) \right)$$

#### Variable Definitions:
*   **$AE_y$** ($tCO_2e/year$): Total activity emissions for the project activity in year $y$.
*   **$N_{p,y}$** (stoves): Number of operational activity stoves of each age cohort/batch in year $y$.
*   **$U_{p,y}$** (fraction): Monitored annual usage rate for activity stoves in year $y$.
*   **$P_{a,adj,y}$** (tonnes/household/year): Uncertainty-adjusted quantity of fuel consumed in the activity scenario in year $y$. Determined ex-post via a biennial Project Kitchen Performance Test (P-KPT).
    *   *Statistical Logic Check:* If the P-KPT data meets the 90/10 precision target, $P_{a,adj,y}$ equals the empirical statistical mean ($P_{p,mean,y}$). If precision is not met, the Upper Bound of the one-sided 90% confidence interval ($P_{p,UB90,y}$) is programmatically applied as a penalty.
*   **$NCV_{fuel}$** (TJ/tonne): Net calorific value of the fuel used in the activity scenario (defaults as defined under "Unadjusted Baseline Emissions).
*   **$EF_{fuel,CO2}$** ($tCO_2e/TJ$): $CO_2$ emission factor of the fuel used in the activity scenario.
*   **$EF_{fuel,non-CO2}$** ($tCO_2e/TJ$): Weighted non-$CO_2$ emission factor of the fuel used in the activity scenario.
*   **$fNRB_y$** (fraction): Fraction of non-renewable biomass used in year $y$ for the activity scenario.

### Leakage Emissions ($LE_y$)
Accounts for Net GHG emissions occurring outside the activity physical boundary attributable to project activities.
$$LE_y = LE_{Embodied,y} + LE_{Market,y}$$

#### Variable Definitions:
*   **$LE_y$** ($tCO_2e/year$): Total Leakage emissions in year $y$.
*   **$LE_{Embodied,y}$** ($tCO_2e/year$): Leakage due to the cradle-to-gate manufacturing and long-distance transport of distributed technologies.
    *   *Default Emission Factor ($EMEF$):* Enforced default of 0.017 $tCO_2e/unit$.
    *   *Path 1 (Short-Lived / Technical Life < 5 years):* Total leakage is deducted entirely upfront:
        $$LE_{Embodied,y} = N_{disseminated,y} \times EMEF$$
    *   *Path 2 (Durable / Technical Life $\ge$ 5 years):* Deductions are annualized evenly over the 5-year crediting period:
        $$LE_{Embodied,y} = N_{disseminated,y} \times \left( \frac{EMEF}{5} \right)$$
*   **$LE_{Market,y}$** ($tCO_2e/year$): Leakage due to market and behavioural effects, calculated using a mandatory 2% default deduction:
    $$LE_{Market,y} = (BE_y - AE_y) \times 0.02$$
*   **$N_{disseminated,y}$** (stoves): Number of new activity technology units disseminated in year $y$.

### Net GHG Emission Reductions ($ER_y$)
Calculated automatically to output the final volume of eligible carbon credits:
$$ER_y = \left( (BE_y - AE_y) \times HE_{ind} \right) - LE_y$$

#### Variable Definitions:
*   **$ER_y$** ($tCO_2e$): Net GHG emission reductions during the monitoring period $y$.
*   **$BE_y$** ($tCO_2e$): Final Crediting Baseline emissions from "Final Crediting Baseline Emissions".
*   **$AE_y$** ($tCO_2e$): Total Activity emissions from "Total Activity Emissions".
*   **$LE_y$** ($tCO_2e$): Total Leakage emissions from "Leakage Emissions".
*   **$HE_{ind}$** (fraction): Hawthorne Effect adjustment index to compensate for observer bias during field monitoring.
    *   *Option 1 (Manual Monitoring):* The Activity Developer manually enters the applicable $HE_{ind}$ default value at the time of Monitoring Report submission. This is a single value per monitoring period; the Activity Developer is responsible for entering a figure appropriate to the monitoring conditions, subject to VVB review.
    *   *Option 2 (SUMs-based monitoring):* Calculated dynamically as the ratio of average unobserved events to observed events:
        $$HE_{ind} = \min(1, PTC_m / PTC_{KPT})$$
        *(Where $PTC_m$ is unobserved cooking events/day using Stove Use Monitors, and $PTC_{KPT}$ is observed events/day during P-KPT).*
    *   *Option 3 (Continuous Sensor Exemption):* Where the Monitoring Approach is set to dMRV-based (continuous telemetry), $HE_{ind}$ is automatically set to 1.0, reflecting the removal of observer bias under continuous monitoring.

---

## Structural Changes of the Version 4.0

*   **Version 4.0 of the Clean and Efficient Cookstoves Methodology (SMEC) involves a 5-step approach for baseline determination:**
    *   Step 1: Selection and Justification of the Baseline Approach.
    *   Step 2: Application of the selected approach prior to downward adjustment.
    *   Step 3: Application of the Downward Adjustment (Uncertainty and Ambition).
    *   Step 4: Identification of a conservative Business-as-Usual (BAU) baseline.
    *   Step 5: Comparison and selection of the final Crediting Baseline.

*   **Additional inputs are required for the downward-adjustment and monitoring process:**
    1.  Downward Adjustment Factor ($DAF_{NetZero,y}$): Sourced from the GS4GG Tool 05 to adjust baseline emissions downward based on host country NDCs.
    2.  Hawthorne Effect Adjustment ($HE_{ind}$): A manually-entered default factor applied under Manual monitoring to compensate for observer bias. SUMs-based monitoring calculates $HE_{ind}$ dynamically from the ratio of unobserved to observed usage; dMRV-based (continuous telemetry) monitoring is fully exempt ($HE_{ind} = 1.0$).
    3.  Wood-to-Charcoal Conversion Factor ($WCCF$): A selectable conversion ratio (1, 4:1, or 6:1) recorded for documentation and VVB reference. Associated emission factor and NCV values for wood and charcoal are entered directly by the Activity Developer for each project.

*   **Replaced theoretical stove efficiency loss models with empirical ex-post measurements:** Project-scenario fuel consumption ($P_{a,adj,y}$) must now be determined via biennial Project Kitchen Performance Tests (P-KPT).

*   **Enforced strict statistical uncertainty penalties (90/10 precision target ex-post):** If the precision target is missed, the baseline fuel consumption is penalized using the Lower Bound ($P_{b,LB90}$), and the activity fuel consumption is penalized using the Upper Bound ($P_{a,UB90,y}$).

*   **Standardized leakage emissions are now compulsory and divided into two categories:**
    1.  Market and Behavioural Leakage ($LE_{Market,y}$): Quantified using a mandatory conservative default deduction of 2% of pre-project emission reductions.
    2.  Embodied Emissions ($LE_{Embodied,y}$): Applied as a standard default of 0.017 $tCO_2e$ per distributed stove.

---

## Assumptions & Fixed Parameters

*   **B-KPT Threshold and Cap Values (Per Capita):**
    *   *Wood:* Threshold = $0.75$ tonnes/person/year (values above this require third-party study justification); Absolute Cap ($P_{CAP}$) = $1.25$ tonnes/person/year.
    *   *Charcoal:* Threshold = $0.20$ tonnes/person/year (values above this require third-party study justification); Absolute Cap ($P_{CAP}$) = $0.40$ tonnes/person/year.   
*   **Mandatory Precision Target:** All empirical surveys (KPTs and Usage Surveys) must plan for and target a 90% confidence level and a 10% margin of error (90/10 precision).