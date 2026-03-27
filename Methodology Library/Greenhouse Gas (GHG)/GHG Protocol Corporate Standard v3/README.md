# 🌱 GHGP Corporate Standard Guardian Policy (Version 3.0)

## Table of Contents
* [Introduction](#introduction)
* [Need and Use for the GHGP Corporate Standard Policy](#need-and-use-for-the-ghgp-corporate-standard-policy)
* [Demo Video](#demo-video)
* [Policy Workflow](#policy-workflow)
* [Policy Guide](#policy-guide)
* [Available Roles](#available-roles)
* [Important Documents & Schemas](#important-documents--schemas)
    * [Main Framework Schemas](#main-framework-schemas)
    * [Source Calculation Tools](#source-calculation-tools)
    * [Secondary Data Tools](#secondary-data-tools)
    * [Activity Data Tools](#activity-data-tools)
    * [Supplemental Reporting Tools](#supplemental-reporting-tools)
* [Token (Carbon Emission)](#token-carbon-emission)
* [Step by Step](#step-by-step)
    * [Organizational Representative Flow](#organizational-representative-flow)
    * [Summary of the Organizational Representative Flow](#summary-of-the-organizational-representative-flow)
    * [Assurance Provider Flow](#assurance-provider-flow)
    * [Summary of the Assurance Provider Flow](#summary-of-the-assurance-provider-flow)
* [Cross-Schema Dependencies & Technical Input Requirements](#cross-schema-dependencies--technical-input-requirements)
* [Futureproofing (Automated GHG Inventories)](#futureproofing-automated-ghg-inventories)
* [TODO](#todo)
* [Technical Development Guide](#technical-development-guide)

## Introduction

The GHG Protocol Corporate Accounting and Reporting Standard (GHGP Corporate Standard) is the world’s leading standard outlining requirements and guidance for corporate-level and organizational-level GHG emission inventories. As of 2023, approximately 97% of S&P 500 companies responding to the CDP an investor led effort to increase corporate carbon disclosures referenced the used GHG Protocol to conduct their GHG inventories.[^1] Also, many other GHG-related frameworks and regulations such as the Corporate Sustainability Reporting Directive (CSRD) and the Science Based Targets Initiative (SBTi) point to the Greenhouse Gas Protocol as the default standard for the quantification and accounting of corporate GHG emissions. As future regulations and standards are developed and implemented, they are likely to either prescribe or encourage the use of Greenhouse Gas Protocol standards.

The GHGP Guardian Policy mints Carbon Emission Tokens (CETs) in accordance with the GHGP Corporate Standard, including the Scope 2 Guidance, which was later published as an amendment to the GHGP Corporate Standard. The policy and methodologies are designed to calculate emissions based on MRV data that can either be provided manually by the organization or automatically sourced via API from sources such as ERP systems and IoT-enabled meters.

Although the GHGP Standard provides useful guidance and requirements for corporate GHG accounting, specific calculation methods, secondary data sources, and activity data sources may vary considerably based on geographies, industries, data availability, regulations, and business contexts. In addition, many companies will conduct and report their GHG inventories based on the GHGP, but also have to report emissions data through additional frameworks and standards such as the CDP, the CSRD, and emissions trading systems (ETSs). As such, the GHGP policy is designed based on a Main Framework of schemas common to all instances combined with specific tools for the user to choose from which are customized to specific methodological approaches, secondary data sources, and activity data sources, and additional reporting frameworks. This library of tools will continue to build over time to optimize scalability and accommodate an increasing number of business contexts and requirements.

The **Main Framework** is designed to dynamically map organizational and operational boundaries in a hierarchy of the organization, business entities, and facilities/assets, while tools are designed to capture activity data, select secondary data sources, and calculate GHG emissions.

![1](Screenshots/1.%20The%20Main%20Framework.png)

![2](Screenshots/2.%20Type%20of%20tools.png)

## Need and Use for the GHGP Corporate Standard Policy

According to the Intergovernmental Panel on Climate Change (IPCC), in order to avoid potentially irreversible impacts of climate change, global GHG emissions should be reduced by approximately 45% by 2030 (relative to 2010 levels) and achieve net zero by 2050. Therefore, it comes as no surprise that the largest companies in the world are increasingly aligning their GHG reduction targets with the latest scientific models, in an effort to both exhibit their commitment to sustainability, as well as to remain viable in a low-carbon future. As of 2026, over 10,000 companies have had their science-based targets validated by the SBTi, representing over 40% of global market capitalization and including many of the world’s leading businesses[^2].

The increase in corporate and organizational commitments to measure, disclose, and reduce GHG emissions is likely to continue to increase for the foreseeable future as stakeholders, investors, and regulators place a stronger focus on climate impacts and performance. Regulations (such as the CSRD and the California Climate Corporate Data Accountability Act) have been recently issued that require companies to measure and disclose their GHG emissions and climate risks to better inform their investors and stakeholders. More stringent climate-related regulations are nearly inevitable as global temperatures, atmospheric GHG concentrations, and related risks increase, and we approach critical thresholds. In addition to new regulations, as major brands look to achieve their scope 3 (supply chain) emission targets, they are increasingly requesting climate data and commitments from their suppliers[^3].

Despite a growing interest in measuring, disclosing, and reducing GHG emissions from corporations, regulators, and investors alike, companies are struggling to accurately measure and report emissions. In general, current quantification methodologies are flawed, GHG accounting standards leave significant room for error, access to quality/granular data is low, and there is a prevailing lack of GHG accounting expertise. As a result, corporate GHG inventories and carbon claims come with high margins of error and low levels of trust. According to a Harvard Study, “74% of S&P 500 firms revised emissions data at least once in their Corporate Social Responsibility (CSR) reports from 2010-2020. In a majority of cases, the total emissions reported in previous years was revised upward.”[^4]

The Guardian GHGP Corporate Policy offers a unique technical opportunity for companies to streamline, add robustness, and build trust and transparency into their GHG inventories and carbon claims. The policy allows users to dynamically add entities and assets to organizations and GHG sources to assets to build their inventories in alignment with their specific corporate and operational structures. MRV data can then be sourced by the Guardian automatically (e.g., via API, IoT-enabled devices, etc.) or provided manually depending on the user’s level of digitization.

The inventory process is further streamlined through a library of tools that automatically calculate and attribute emissions based on a broad-spectrum of data sources and calculation methodologies, with the outputs supporting the generation of digital GHG reports in alignment with GHGP requirements. From the activity data collection to report generation, key data and information are encapsulated in verified credentials, streamlining the processes to support reasonable levels of assurance.

Finally, the emissions are tokenized to allow for enhanced tracking, transparency, accounting, and reporting, with the results and data structured in accordance with GHGP reporting requirements.

## Demo Video

[GHGP v3 Policy Demo](https://youtu.be/KMvClODQQN8)

## Policy Workflow

![3](Screenshots/3.%20Workflow.png)

## Policy Guide

This policy is published to Hedera network and can either be imported via Github (.policy file) or IPSF timestamp **1773266098.748000224**.

🔥 Latest Version – **GHGP Version 3.0**

### Available Roles

► **Administrator**

The **Administrator** is responsible for the overall governance of the reporting environment.
Key responsibilities include:

* _Policy Management_: Publishing the policy.

* _Access Control_: Assigning and managing the roles for Organization Representatives and Assurance Providers.

►  **Organizational Representative**

The **Organizational Representative** is a designated individual authorized to act on behalf of the organization.
Key responsibilities include:

* _Data Submission_: Providing all necessary entity, facility, and asset data.

* _Inventory Management_: Identifying GHG sources and inputting activity (MRV) data.

* _Reporting_: Generating the Primary GHGP Report and managing the assurance process.

>Assurance is optional for this policy as it is (as of this writing) optional under the GHGP Corporate Standard.

► **Assurance Provider**

The **Assurance Provider** is an independent third party responsible for the verification of the organization’s environmental claims.
Key responsibilities include:

* _Audit Performance_: Reviewing critical documentation, emission calculations, MRV data, and GHG inventory reports for accuracy and compliance.

* _Status Determination_: Issuing an outcome of Acceptance, Rejection, or a Request for Resubmission.

> _Optional Status_: In alignment with the current GHGP Corporate Standard, third-party assurance is an optional component of this policy.


## Important Documents & Schemas

The GHGP (as of this writing) is equipped with the following Main Framework and tool schemas, with the intention of growing the library of tools over time.
A roadmap of planned tools for the Tool Library is available in the TODO section below.

### Main Framework Schemas

* Organizational Profile: The organization inputs key information such as descriptions of organizational and operational boundaries, industry classifications, and GHG accounting approaches.
* Entity Profile: Key information on business entities such as subsidiaries, joint ventures, and business units is captured.
* Facility/Asset: Information on company assets and facilities.
* GHGP Primary Report: Metrics, KPIs, and additional information are aggregated and reported in accordance with the GHG Protocol based on a user defined reporting period.
* Target Setting Tool: Organizations can set and provide details on absolute or intensity GHG targets.
* Assurance Provider Profile: Captures information in assurance providers upon registration and onboarding.
* Assurance (Statement) Report: Provides the assurance opinion.

> Detailed documentation for the GHGP policy tools is available in the [Methodology Library](https://github.com/hashgraph/guardian/tree/48ef2927cbfe21a30c2fb17377944a39764edcf4/Methodology%20Library/Greenhouse%20Gas%20(GHG)/GHG%20Protocol%20Corporate%20Standard%20v3/Tools).

### Source Calculation Tools

* Scope 1: Stationary Combustion: Calculates CO2, CH4, N2O, and CO2e emissions from the stationary combustion of fuels. Includes an emission factor unit conversion function to automatically convert emission factors into units compatible with the selected activity data. This tool supports both fuel- and send-based methods.
* Scope 2: Purchased Electricity: Calculates CO2, CH4, N2O, and CO2e emissions from the purchase and consumption of electricity. The tool supports both location- and market-based methods and allows users to account for renewable energy certificates (RECs) and other market instruments.
* Scope 3, Category 1: Purchased goods and services: Calculates indirect emissions from the purchase of goods and services. The user may select from a database of published supplier specific PCFs, define/input PCF details, or a combination of both.

Within these tools, the user selects secondary data tools that reference GWPs and emission factor databases.

> 💡 Note: All source calculation tools include the ability to attribute and allocate emissions to product IDs to support the calculation of digital PCFs.

### Secondary Data Tools

* EPA GHG Emission Factors Hub: Provides default emission factors for stationary combustion.

* EPA eGRID Subregion Emission Rates: Supplies US-specific grid emission rates based on subregions to account for localized electricity generation profiles.

* Green-e® Residual Mix Emission Rates: Market-based electricity factors for US/Canada.
> 💡 Note: These factors are proprietary and cannot be redistributed. Users must manually input these rates into the system.

* IPCC Fifth Assessment Report (AR5): The primary source for Global Warming Potential (GWP) values. These values are embedded directly for consistent CO₂e calculations.

* PACT v3 PCF Database: Provides the methodology and data schema for calculating cradle-to-gate Product Carbon Footprints (PCFs) and Scope 3 value chain emissions.

* Defra UK Government Conversion Factors: A comprehensive set of UK-specific grid average and conversion factors for organizations reporting on UK operations.

> _Required Attributions_
>> IPCC: "Global Warming Potentials sourced from IPCC Fifth Assessment Report (AR5), 2013."\
>> PACT: "This software implements the PACT Methodology Version 3 developed by the World Business Council for Sustainable Development (WBCSD)."\
>> Defra: "UK Government GHG Conversion Factors for Company Reporting, © Crown copyright, licensed under the Open Government Licence v3.0."\

### Activity Data Tools

* Fuel meter data
* Fuel invoice data
* Fuel spend data
* Electricity meter data
* Electricity invoice data
* Constractual instruments
* ERP Product purchases


### Supplemental Reporting Tools

* Product Carbon Footprint (PCF) PACT v3

>_Required Attributions_
>> This software implements the PACT Methodology Version 3 developed by the World Business Council for Sustainable Development (WBCSD).

## Token (Carbon Emission)

🟡 Carbon Emission Token (CET) equivalent to **1 metric ton of CO2e emissions**.

## Step by Step

To begin working with this policy, you must first import it into your **Administrator** account.

This is a required step that enables the assignment of the two main policy roles as mentioned above:
* Organizational Representative
* Assurance Provider

![4](Screenshots/4.%20Roles.png)

For detailed insights on managing methodologies and leveraging the Administrator account as the trusted engine for policy publishing and ecosystem enablement, explore the [Guardian documentation here](https://guardian.hedera.com/guardian/standard-registry).

> 💡 Note: The screenshots provided in this documentation were captured using the Dry Run mode. While the data shown is for illustrative purposes, the workflows and interface steps remain identical to the live environment.

### Organizational Representative Flow
As an Organizational Representative, you are responsible for managing the reporting lifecycle within the Guardian:

* **Establish Identity**: Create your Organization Profile and assign relevant entities.
* **Map the Environment**: Define your Facilities, Assets, and GHG Sources.
* **Input & Report**: Provide Activity Data to generate your Primary and Supplemental Reports.
* **Finalize**: Select an Assurance Provider to verify your findings (this step is currently optional).

Follow the screen-by-step guide below to complete these tasks.

1. Once you log in as an **Organizational Representative**, go to **Create Organization Profile**.

* **Fill out the form**: Enter your details in the empty fields.
* **Use the dropdowns**: For some sections, just click and pick the right option from the list.
* **Watch for Red Stars** ($\color{Red}{*}$) : Any field with a red star is required. You can't skip these.

![5](Screenshots/5.%20OF%20step%201.png)

* **Follow-up Sections**: Some questions are dynamic. For example, if you select "**Yes**" for the question regarding _sources of Scope 1, 2, or 3 emissions that are excluded from your disclosure_, additional fields will appear. Be sure to fill out these new sections as they become visible.

![6](Screenshots/6.%20OF%20step%201.png)

* **Adding Multiple Entries**: In sections that allow more than one answer (like **Unique Identifiers**), you can add different types by clicking the button below the section. For example, click <kbd> <br> + Add Unique identifier(s) <br> </kbd> to create a new rows for each identifier you need to list.

![7](Screenshots/7.%20OF%20step%201.png)

2. Walkthrough of the Organization Profile

Once your **Organization Profile** is saved and validated, you will land on the main Profile window. While you will see several Action Buttons, you must follow a specific order to ensure your data flows correctly.

**Important**: Create Entities First

>Before you can generate a Primary GHGP Report, you must first set up your Entities, Facility and/or assets and Source Calculation Tools.
>> 👀  Why? The final GHGP Report automatically pulls data from different Tools.

**Available Action Buttons**\
Once you are ready, use these buttons to manage your workflow:

<kbd> <br> Create Entity <br> </kbd> (Start Here)

<kbd> <br> Add PCF <br> </kbd> (Product Carbon Footprint)

<kbd> <br> Create Primary GHGP Report <br> </kbd>

<kbd> <br> Create Target <br> </kbd>

<kbd> <br> View Document <br> </kbd>

>For every document generated within the policy, you can find the <kbd> <br> View Document <br> </kbd> button. This allows you to inspect both the manually provided data and the automatic calculations performed by the system.

💁‍♀️ **Pro-Tip**: If you don't see all the buttons listed above, please **scroll to the right** using the scrollbar at the bottom of the table to reveal all available actions.

![8](Screenshots/8.%20OF%20step%201.png)

![9](Screenshots/9.%20OF%20step%201.png)

3. Create an Entity

Now, you will create an **Entity Profile** for each part of your organization that needs to be included in your report (such as subsidiaries, business units, or branches, etc.).

🟩 _You can create as many entities as needed to accurately represent your organization's footprint._

* **Best Practice**: aligning your GHG inventory structure with your company's financial reporting structure. This makes it much easier to track and audit your data later.
* **Filling the Form**: Enter all required details for the specific entity you are setting up.
* **Finalize**: Once you have provided all the information, click the <kbd> <br> Validate & Create <br> </kbd> button to save the profile.

![10](Screenshots/10.%20OF%20step%203.png)

4. Assigning Facilities and Assets

Once your entities are created, you need to link them to their physical locations or equipment.

* **Navigate**: Go to the **Organization Entity** section.
* **Assigning Details**: Start assigning **Facilities or Assets** to the correct entity using <kbd> <br> Create Facility or Asset <br> </kbd>  button.

![11](Screenshots/11.%20OF%20step%204.png)

![12](Screenshots/12.%20OF%20step%204.png)

5. Setting Targets

This section is used to input established Greenhouse Gas (GHG) reduction goals into the system.
It is generally best practice to set targets in alignment with the _Science Based Targets initiative (SBTi)_.


- **Action**: Click the <kbd> <br> Create Target <br> </kbd>  button located on the **Organization Profile** screen.
- **Target Coverage**: While targets are managed from the organization profile, you can define the specific coverage by selecting:
  - Entities: Manually type the specific entity or multiple entities included in the target.
  - Scope: Specify which emission scopes apply.
  - Greenhouse Gases: Select the specific gases covered by the goal.

![13](Screenshots/13.%20OF%20step%205.png)
![14](Screenshots/14.%20OF%20step%205.png)
![15](Screenshots/15.%20OF%20step%205.png)

6.  Defining GHG Sources

For every **Facility** and **Asset** created, you must identify and add its specific GHG sources.
* **Action**: Select the Facility or Asset and input all required data for each applicable GHG source using <kbd> <br> Add GHG Source <br> </kbd>  button.

![16](Screenshots/16.%20OF%20step%206.png)
![17](Screenshots/17.%20OF%20step%206.png)

GHG Sources can also be **attributed to products and services** when applicable to support PCF calculations and scope 3 accounting.

![18](Screenshots/18.%20OF%20step%206.png)

> ⚠️ Note: Ensure that all relevant Secondary Data Tools (such as the EPA Emission Factors Hub or IPCC GWP values) are selected and added to the source profile.
>> These tools provide the necessary calculation methodologies and emission factors for the source.

![19](Screenshots/19.%20OF%20step%206.png)
![20](Screenshots/20.%20OF%20step%206.png)
![21](Screenshots/21.%20OF%20step%206.png)
![22](Screenshots/22.%20OF%20step%206.png)
![23](Screenshots/23.%20OF%20step%206.png)
![24](Screenshots/24.%20OF%20step%206.png)

7. Inputting Activity Data

For each **GHG Source** identified in the previous step, you must provide the specific **activity data** (e.g., electricity consumption in kWh for a facility).

**Data Submission Methods**:\
Activity data (MRV data) can be added in two ways:\
	- _Manual Entry_: Information is input directly into the system by the organization.\
	- _Automated Sourcing_: Data is pulled automatically via APIs or from verified monitoring devices (such as IoT-enabled meters) assigned to the source.

![25](Screenshots/25.%20OF%20step%207.png)
![26](Screenshots/26.%20OF%20step%207.png)
![27](Screenshots/27.%20OF%20step%207.png)
![28](Screenshots/28.%20OF%20step%207.png)

**Market-Based Instruments**: During this process, you may allocate contractual instruments such as **Renewable Energy Certificates (RECs)** to the applicable GHG sources.

![29](Screenshots/29.%20OF%20step%207.png)
![30](Screenshots/30.%20OF%20step%207.png)
![31](Screenshots/31.%20OF%20step%207.png)

8. Generating the Primary GHGP Report

Once all monitoring and activity data for the reporting period has been entered, you can generate a **Primary GHGP Report**.
- **Action**: Navigate back to the **Organization Profile** section.
- **Generate Report**: Click the <kbd> <br> Create Primary GHGP Report <br> </kbd> button.
- **Automatic Population**: The system will automatically pull your previously entered data to populate the key reporting metrics.
- **Viewing Reports**: Once generated, the finalized documents can be accessed and viewed under the **Primary Reports** section.

![32](Screenshots/32.%20OF%20step%208.png)
![33](Screenshots/33.%20OF%20step%208.png)
![34](Screenshots/34.%20OF%20step%208.png)

9. Assigning an Assurance Provider

After the Primary GHGP Report has been validated and created, you can initiate the third-party verification process.
- **Assigning a Provider**: You may select and assign an **Assurance Provider** to review your report.
- **Verification Workflow**: This action triggers the verification process, which is handled through a separate flow for the Assurance Provider (described in the next section).

> 💡 Note: This step is currently optional.

![35](Screenshots/35.%20OF%20step%209.png)
![36](Screenshots/36.%20OF%20step%209.png)

10. Assurance Review and Outcomes

Once the assurance has been requested, the **Assurance Provider** will review the Primary GHGP Report.
The report will result in one of three statuses:
* **Accepted**: The report is verified and finalized.
* **Rejected**: The report is not approved.
* **Resubmission Requested**: The provider requires corrections or additional information. You will need to update the data and submit the report again for review.

![37](Screenshots/37.%20OF%20step%2010.png)
![38](Screenshots/38%20OF%20step%2010.png)
![39](Screenshots/39%20OF%20step%2010.png)

11. Finalizing Emissions and CETs Generation

Once the organizational emissions have been calculated and the data is finalized, the Organization Representative is responsible for the CET issuance process.

* **Action**: The Organization Representative reviews the calculated data in GHG Primary reprt to continue with the issuance of Carbon Emissions Tokens (CETs).
* **Result**: Upon approval by the representative, the system formally issues the CETs, documenting the verified emissions within the registry.

![40](Screenshots/40%20OF%20step%2011.png)
![41](Screenshots/41%20OF%20step%2011.png)
![42](Screenshots/42%20OF%20step%2011%20new.png)

12. If applicable, the organization can create and publish digital PCFs.\
The PCF is based on all emissions attributed to a specific product/service IDs and made relative to the declared unit.

![43](Screenshots/43%20OF%20step%2012.png)
![44](Screenshots/44%20OF%20step%2012.png)
![45](Screenshots/45%20OF%20step%2012.png)


### Summary of the Organizational Representative Flow

* **Complete Organization Profile**: Fill in all required fields.
* **Navigate to the Hub**: Use the Organization Profile window as your "command center."
* **Create Entities**: Build your corporate structure by creating profiles for all relevant subsidiaries or business units. You can create as many as needed.
* **Assign Facilities & Assets**: Link physical sites and specific equipment to their respective entities via the Organization Entity section.
* **Set GHG Targets (Optional)**: Input reduction goals at the Organization, Entity, or Facility/Asset level using the Create Target button.
* **Define GHG Sources**: Identify emission sources (e.g., electricity, natural gas) for each Facility/Asset. Attribute these to specific products or services where applicable for PCF or Scope 3 accounting.
* **Input Activity Data**: Provide consumption data (e.g., kWh) for each source. This can be done Manually or Automatically via APIs and IoT-enabled meters.
* **Allocate Market (Constractual) Instruments**: During data entry, assign instruments like Renewable Energy Certificates (RECs) to the applicable GHG sources.
* **Generate Primary GHGP Report**: Once all data is input, return to the Organization Profile to click Create Primary GHGP Report. The system will automatically populate the reporting metrics. But your input for other fields is required.
* **Assurance (Optional)**: If third-party verification is required, assign an Assurance Provider and request a review. The provider may Accept, Reject, or Request Resubmission of the report.

### Assurance Provider Flow

1. Assurance Provider Account Registration

When you log into the system for the first time after being assigned, you must establish your professional profile.

* **Mandatory Fields**: Complete all fields marked with a red star ($\color{Red}{*}$).
* **Account Activation**: Once the form is validated, your account is activated. This allows you to view and manage incoming assurance requests.

![46](Screenshots/46%20AP%20step%201.png)
![47](Screenshots/47%20AP%20step%201.png)
![48](Screenshots/48%20AP%20step%201.png)

2. Accessing Assigned Reports

When an organization assigns a **Primary Report** to you, it will within the **Organization Reports** section.

* **Navigation**: Go to the **Organization Reports** tab to see a list of reports awaiting your review.
* **Visibility**: You will only see reports where you have been specifically designated as the Assurance Provider.

![49](Screenshots/49%20AP%20step%202.png)

3. Review Operations

Within the **Organization Reports** section, you have three primary actions available to process the assigned report. Use these buttons to manage the workflow:

| Action | Result |
| :--- | :--- |
| <kbd> <br> Approve <br> </kbd> | Finalizes the report as verified, compliant, and accurate. |
| <kbd> <br> Reject <br> </kbd> | Formally declines the report due to significant inaccuracies. |
| <kbd> <br> Request Resubmission <br> </kbd> | Sends the report back to the Org Representative for specific corrections. |

![50](Screenshots/50%20AP%20step%203.png)

4. Statement Reports

After completing your review, approving the GHG report, you must document the formal conclusion of the audit.

* **Action**: Use the <kbd> <br> Create Statement Report <br> </kbd> button.
* **Purpose**: This serves as the official certification of the verification process, detailing the scope and findings of your audit.

![51](Screenshots/51%20AP%20step%204.png)
![52](Screenshots/52%20AP%20step%204.png)

5. Viewing Statements

Transparency is key. All historical audit data is preserved for future reference.

* **Storage**: Every statement report you create is archived.
* **Access**: You can view these at any time within the **Statement Report** section of the system.

> 💡 **Note**: Once a report is "Accepted" and a Statement is issued, the data is locked to maintain the integrity of the verified carbon footprint.


![53](Screenshots/53%20AP%20step%205.png)


### Summary of the Assurance Provider Flow

* **Registration**: Complete the account registration form upon initial login.
* **Report Access**: Navigate to the **Organization Reports** section to view assigned filings.
* **Execution**: Select <kbd> <br> Acceptance <br> </kbd>, <kbd> <br> Rejection <br> </kbd>, or <kbd> <br> Request Resubmission <br> </kbd> for the Primary Report.
* **Documentation**: Utilize the <kbd> <br> Create Statement Report <br> </kbd>  button to issue a formal audit statement.
* **Record Keeping**: Access all finalized statements in the Statement Report section.

## Cross-Schema Dependencies & Technical Input Requirements

The schemas within this policy are architected as an interconnected network. Specific fields serve as **Calculative Anchors**; the data entered here triggers automated calculations and filters the final output in the Primary GHG Report.

### 1. Organization Profile Schema
* **Consolidation Approach**
    * **Logic:** If `Equity Share` is selected, the system will look for the `Equity Share % (Decimal)` field in the Entity Profile.
    * **Calculation:** All associated activity data will be multiplied by the decimal value provided (e.g., `0.50` for 50%).
* **Scope 2 Performance Calculation Approach**
    * **Logic:** If `Market-based` is selected, the Primary Report will prioritize market-based totals, and emissions allocated to products will follow market-based logic.
* **Base Year(s) Section**
    * **Logic:** If a GHG report has not yet been generated for a specific year, the system pulls base year values directly from this profile for comparative analysis.

### 2. Entity & Facility Schemas
* **Entity Name & Type**
    * **Requirement:** Required for the `Break down emissions by business entity` toggle in the GHG Report.
* **Equity Share % (Decimal)**
    * **Technical Requirement:** Must be entered as a decimal (e.g., `1` for 100%). This acts as a multiplier if the Organization Profile is set to Equity Share.
* **Facility/Asset Name & Category**
    * **Requirement:** Required for the `Break down emissions by facility or asset` reporting feature.
* **Countries or Areas**
    * **Requirement:** Populates the `Break down emissions by country or area` section of the final report.

### 3. GHG Source & Calculation Tools
These fields determine whether data is included in the inventory and which emission factors are applied.

#### Common Logic (Scope 1, 2, & 3)
* **Included in Inventory:** If set to `No`, all assigned activity data for this source is excluded from final totals.
* **Hierarchical Double Counting Avoidance:** If `Activity data overlapped with parent` is selected, the system omits these values to prevent inflationary errors.

#### Scope 2: Purchased Electricity Specifics
* **EPA eGRID Tool:** You must select a subregion in the `Select Subregion Name` field. Without this, the system cannot fetch the correct emission factor.
* **Supplier/Product Specific Electricity Data:** If `Yes`, the system requires a selection in the `Secondary Data Tool for Emission Factor` field.
* **Green-e® Residual Mix:** If selected, you must ensure the `Subregion Name` is selected and the CO2 factor is **manually entered** (proprietary data).
* **Defra (UK):** Ensure the tool is explicitly added to enable UK-specific grid calculations.

#### Scope 3: Purchased Goods and Services
* **Referenced Digital PCF:** If selected, you must:
    1.  Add the `Secondary Data: PACT v3 PCF Database` tool to the source.
    2.  Input the correct **PCF ID** for the selected products.
* **User-specified PCF:** If selected, the `User-specified PCF` tool must be added with all custom data fields completed.


## Futureproofing (Automated GHG Inventories)

Due to several factors such as lack of expertise, absent third-party assurance, and methodologies that leave significant room for error, corporate GHG inventories are often inaccurate and unreliable. In addition, manually collecting monitoring and activity data each year can be a cumbersome task. By automating and digitizing the collection of monitoring data, GHG quantification calculations, and (optionally) third-party verification of devices, data, and calculations, GHG inventories can be automated and streamlined to enhance trust, transparency, and efficiency.

## TODO

The GHGP policy is designed to be as dynamic as possible to accommodate the diversity of business contexts, data sources, and methodological approaches that affect companies’ GHG inventories. For example, in addition to the requirements of the GHG Protocol, many companies could be subjected to additional GHG regulations, reporting frameworks, national guidelines, and the corresponding methodology and reporting requirements. Therefore, it is the intention to continuously build a library of calculation, reporting, secondary data, and activity data tools over time.

The following tools are planned for future development:

* _**Source calculation tools**_
- [ ] Korean National Guideline tools for
  - [ ] Fixed fuel combustion
  - [ ] Mobile combustion
  - [ ] Scope 2 (Electricity, heat, and steam)
  - [ ] Waste disposal
  - [ ] Biological treatment
  - [ ] Cement production

- [ ] EU ETS Stationary Combustion
- [ ] K-ETS Stationary Combustion
- [ ] EPA CFR 40 p75 (CEMS)
- [ ] Scope 3 Business Travel

* _**Secondary data tools**_
- [ ] Utility-specific Emission Factors
- [ ] Open Footprint (OFP) PCF Database
- [ ] National Grid Emission Factors
- [ ] Watershed’s Comprehensive Environmental Data Archive (CEDA)
- [ ] CCRI MiCA Indicators
- [ ] National Calorific Values (NCVs)
- [ ] Extend the secondary data tools to include emission factors from different sources, ensuring coverage for all available reporting years.


* _**Supplemental Reporting Tools**_
- [ ] CDP
- [ ] SBTi
- [ ] CSRD ESRS E1
- [ ] EU ETS Annual Emissions Reports
- [ ] K-ETS GHG Emissions Inventory
- [ ] CarbonNeutral Protocol
- [ ] PAS 2060
- [ ] SEC Climate-Related Disclosure Rules

Where specific use cases may call for calculation approaches, reporting requirements, data sources, etc. that may not be captured by existing tools, guardian community members are encouraged to develop and publish additional tools that support their use case.

## Technical Development Guide

Developing tools within this policy is a multi-stage process involving conceptual design, schema architecture, and integration into the Hedera Guardian ecosystem. 

This guide uses **Scope 1: Stationary Combustion** as the primary example to demonstrate how to build a source calculation tool that integrates secondary data and activity data collection.

### 1. Conceptual Design & Discovery Questions
Before building the schema, define the parameters that drive the tool's logic. For a Scope 1 tool, the following fields are required:

* **Source Identity:** `Source Name` (String) and `Source ID` (String).
* **Classification:** `Scope` (Hardcoded: Scope 1) and `Source Category` (Hardcoded: Stationary Combustion).
* **Methodology Selection:** `Emissions Calculation Methodology` (Enum: "Spend-based" or "Fuel-based").
* **Inventory Logic:** * `Included in Inventory` (Enum: Yes/No).
    * **Hierarchical Double Counting Avoidance:** (Enum: "Independent Activity Data" or "Activity Data Overlapped with Parent").
    * > **Note:** If "Overlapped with Parent" is selected, the tool must include `Parent Name` and `Parent ID` fields. The system uses a technical rule to exclude these values from the final GHG aggregation to prevent data inflation.
* **Included in Aggregation:** A hidden formula field (Output: Yes/No) that triggers based on the inclusion and double-counting logic above.

### 2. Building the Secondary Data Tool (Emission Factors)
The source structure must link to a **Secondary Data Tool** for emission factors (e.g., EPA GHG Emission Factors Hub).

**Key Requirements for EPA Scope 1 Tool:**
* **Fuel Type:** (Enum) User selects the specific fuel (e.g., Natural Gas, Diesel).
* **Factor Mapping:** Formulas must fetch the following based on the Fuel Type:
    * $CO_2, CH_4,$ and $N_2O$ Factors.
    * **Specific Unit of Measure (UoM):** Hardcoded based on the dataset.
* **Global Warming Potentials (GWP):** A secondary tool for GWPs must be added to enable the conversion of $CH_4$ and $N_2O$ into $CO_2e$.

### 3. Activity Data Collection Tools
Activity tools allow users to input actual consumption. For Stationary Combustion, we utilize three specialized tools:
1.  **Fuel Utility Invoice (Basic)**
2.  **Fuel Meter Data (Basic)**
3.  **Fuel Spend (Basic)**

**Common Connection Fields:**
All activity tools must include hardcoded fields for `Scope` (Scope 1) and `Source Category` (Stationary Combustion) to maintain the relational link.

**Specific Input Requirements (Example: Utility Invoice):**
* **Administrative:** Invoice/Account/Meter numbers, Utility provider, and Billing period (Start/End dates).
* **Calculation Keys:** `Fuel Quantity` (Required Numeric) and `Fuel Units of Measure` (Required Enum).

### 4. Automated Calculation & Product Attribution
The final stage converts raw activity data into reportable metric tons.

#### Conversion Logic
The system employs an **EF Unit Conversion Module**. This module uses a multiplier to align the Activity Data Units with the Emission Factor Units.
* **Output Fields:** Individual emissions for $CO_2, CH_4,$ and $N_2O$ (Metric Tons).
* **Calculated $CO_2e$:** For $CH_4$ and $N_2O$ using GWP values.
* **Total GHG Emissions:** Metric Tons of $CO_2e$.

#### Product Attribution (The "Anchor" for PCFs)
To support Product Carbon Footprints (PCFs), the tool includes an attribution section:
* **Product Name & ID:** The `Product ID` acts as the primary anchor for later PCF generation.
* **Allocation Percentage:** (Decimal) Defines how much of the source's total emissions are assigned to a specific product.
* **Calculated Output:** The system automatically calculates attributed emissions for each gas type based on the allocation percentage.

### 5. Critical Requirements for Reporting
For the tool to function within a report, the following are strictly required:

* **Dates:** Every activity entry **must** have an end date or date range to be captured by the reporting engine.
* **Required Values:** Any field involved in a multiplication formula (Quantity, Factors, Allocation) must be marked as **"Required"** in the schema to prevent errors in the final report.


[^1]: https://ghgprotocol.org/about-us#:~:text=GHG%20Protocol%20supplies%20the%20world's,reporting%20program%20in%20the%20world.&text=In%202023%2C%2097%25%20of%20disclosing,to%20CDP%20using%20GHG%20Protocol.
[^2]: https://sciencebasedtargets.org/news/sbti-celebrates-10000-company-validations#:~:text=The%20number%20of%20companies%20with,has%20accelerated%20in%20recent%20years.
[^3]: https://getgoodlab.com/resources/supply-chain-emissions/#:~:text=Fostering%20Sustainable%20Supply%20Chain%20Emissions,proactive%20around%20supply%20chain%20emissions.
[^4]: https://www.hbs.edu/bigs/harvard-study-74-percent-sp-500-companies-revise-emissions-data?utm_source=chatgpt.com
