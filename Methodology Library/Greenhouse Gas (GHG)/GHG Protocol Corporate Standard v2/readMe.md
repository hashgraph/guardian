## Table of content
<!-- TOC -->

- Introduction
- Need and Use for the GHGP Corporate Standard Policy
- Demo Video
- Policy Workflow
- Policy Guide
  - Available Roles
- Important Documents & Schemas
- Token (Carbon Emissions)
- Step By Step
  - Organization Flow
  - VVB Flow
  - Administrator (Registry) Flow
- Future Proofing (Automated GHG Inventories)
- TODO
<!-- /TOC -->

## Introduction

The GHG Protocol Corporate Accounting and Reporting Standard (GHGP Corporate Standard) is the world’s leading standard outlining requirements and guidance for corporate-level and organizational-level GHG emission inventories. Approximately 92% of Fortune 500 companies responding to the CDP—an investor-led effort to increase corporate carbon disclosures—referenced the used the GHGP Corporate Standard to conduct their GHG inventories. Also, many other GHG-related standards—such as the Natural Capital Partner’s CarbonNeutral Protocol and the Science Based Targets Initiative (SBTi)—point to the Greenhouse Gas Protocol as the commonplace standard for the quantification and accounting of corporate GHG emissions. As future regulations and standards are developed and implemented, they may prescribe or encourage the use of Greenhouse Gas Protocol standards.

This Guardian Policy mints Carbon Emission Tokens (CETs) in accordance with the GHGP Corporate Standard, including the Scope 2 Guidance, which was later published as an amendment to the GHGP Corporate Standard. In addition, the policy includes functionality to attribute emissions to products and services and use this data to calculate and publish product carbon footprints (PCFs) in accordance with the Pathfinder Framework v2.0. The policy and methodologies are designed to calculate emissions based on MRV data that can either be input manually by the organization, or automatically through API and trusted external data sources. The policy is equipped with standard emission factors (such as eGRID emission rates) and Intergovernmental Panel on Climate Change (IPCC) global warming potentials (GWPs).

The policy covers the following sources and future versions will have the ability add new modulated source categories and custom source schemas.

Included Sources: 
- Scope 1: Stationary Combustion 
- Scope 1: Mobile Combustion
- Scope 1: Refrigerants
- Scope 2: Purchased Electricity (Location-Based)
- Scope 2: Purchased Electricity (Market-Based)
- Scope 3.1: Purchased Goods and Services
- Scope 3.4: Upstream Transportation and Distribution

The policy is designed to be dynamic, allowing companies to assign entities to organizations, assets (facilities, vehicles, equipment, etc.) to entities, and GHG sources to assets in a hierarchical structure to dynamically tailor the policy and inventory to specific corporate structures and operations.

## Need and Use of the GHGP Corporate Standard Policy

According to the IPCC, in order to avoid potentially irreversible impacts of climate change, global GHG emissions should be reduced by approximately 45% by 2030 (relative to 2010 levels) and achieve net zero by around 2050. Therefore, it comes as no surprise that many of the largest companies in the world are increasingly aligning their GHG reduction targets with the latest scientific studies, in an effort to both exhibit their commitment to sustainability, as well as to remain viable in a low-carbon future. The number of companies working with the Science Based Targets initiative (SBTi) has increased nearly 1,900% between 2015 and 2020, with 1,039 cumulatively committed companies representing nearly 20% of global market capitalization (over $20.5 trillion USD).

In addition to momentum in voluntary GHG commitments, there are several new regulations requiring the measuring and reporting of GHG emissions (outlined below):

- The Securities and Exchange Commission (SEC) Climate Disclosure Rules: On March 6th, 2024, the SEC adopted rules to enhance and standardize climate-related disclosures by public companies and in public offerings. The rules will require registrants to disclose climate-related risks, targets, mitigating strategic efforts, and [for large, accelerated filers (LAFs) and accelerated filers (AFs) that are not otherwise exempted] scope 1 and 2 GHG emissions.

- The European Union Corporate Sustainability Reporting Directive (CSRD): On January 5th, 2023, the EU’s Corporate Sustainability Reporting Directive (CSRD) took effect, strengthening existing rules on social and environmental reporting [including climate risks and impacts]. The rules will now apply to a broader set of companies, as well as non-EU companies generating over EUR 150 million on the EU market.

- California Climate Corporate Data Accountability Act: On Oct. 7th, 2023. California Gov. Gavin Newsom signed into law California’s Climate Corporate Data Accountability Act, requiring corporations that do business in California, with annual revenues over $1 billion, to publicly disclose scope 1 and scope 2 GHG emissions beginning in 2026, and scope 3 emissions in 2027.

Despite a growing interest in measuring, disclosing, and reducing GHG emissions from corporations, regulators, and investors alike, companies are struggling to accurately measure and report emissions. In general, current quantification methodologies are flawed, GHG accounting standards leave significant room for error, access to quality data is low, and there is a prevailing lack of GHG accounting expertise. As a result, high-profile companies have been exposed for incorrect GHG inventories and worse, misleading claims on carbon performance. According to an article by Bloomberg, ‘Corporate Greenhouse Gas Data Doesn’t Always Add Up,’ “As companies rush to set climate goals, some aren’t even getting the basics quite right when it comes to accounting for greenhouse-gas emissions. According to researchers in Ireland, the U.K. and Germany, based on decade’s worth of corporate emissions data, “when the numbers were tallied, many didn’t add up. They found instances of errors, omissions and rounding issues (often down rather than up).”

The Guardian GHGP Corporate Policy offers a unique technical opportunity for companies to streamline, add robustness, and build trust and transparency into their GHG inventories. The policy allows users to dynamically add entities assets to organizations and GHG sources to assets to build their inventories in alignment with their specific corporate and operational structures. MRV data can then be fed into GHG source schemas through verified devices such as IoT-enabled meters, or added manually depending on the users level of digitization. The inventory is further streamlined through schemas with built in auto-calculation blocks, emission factors, and GWPs. The results of the inventory can be immutably and transparently verified by independent third parties. Finally, the emissions are tokenized to allow for enhanced tracking, transparency, accounting, and reporting, with the results and data structured in accordance with GHGP reporting requirements.

## Demo Video

Coming Soon

## Policy Workflow

![image](https://github.com/user-attachments/assets/6136b047-7176-4c37-85e4-6688b2fab027)


## Policy Guide

This policy is published to Hedera network and can either be imported via Github (.policy file) or IPFS timestamp.

Latest Version - 1732046664.657263946

### Available Roles 
 
- Registry – The role responsible for publishing policies, creating tokens, and approving/rejecting GHG sources added by the organization
- Organization – Company or other organization generating, quantifying, and reporting GHG emissions.
- VVB (Validation & Verification Body) – Independent third party who audits organization’s critical documentation, MRV data and sources, and GHG inventories. Verification is optional (as of this writing) for this policy as it is optional under the GHGP Corporate Standard. The workflow steps involving the VVBs will not block the subsequent steps or the minting of CETs, therefore they can be 1) executed according to the workflow above, 2) skipped, or 3) executed later in the workflow.
  
### Important Documents & Schemas 
  
**Organizational Profile** - The company or organization creates a profile of key information, targets, and reporting metrics. Entities (such as business units, subsidiaries, etc.) are assigned to the company or organization. 

**Entity Schema** – The company creates profiles with key information for each entity. Assets and EGOs (such as facilities, vehicles, etc.) are assigned to entities. Together, the entities make up the corporate structure by which the inventory is based. 

**Asset Schema** - Information on company assets is input and GHG sources (such grid electricity, fuel consumption, etc.) are assigned to assets. 

**Source Schema** – Activity data (such electrical consumption, fuel consumption, etc.) are used to auto-calculate GHG emissions. 

**Raw Data Schema** — Data from devices such as IoT-enabled electricity meters is collected and fed into the corresponding Source Schema for calculations.

**Reporting Metrics** — Key metrics are collected from the schemas to support reporting in alignment with the GHGP Corporate Standard.

**Product Carbon Footprint (PCF)** - Data fields outlined by the Pathfinder Framework v 2.0. The PCF is publishable and can be referenced by supply chain partners to support improved scope 3 calculations.
   
### Token(Carbon credit) 

Carbon Emission Token (CET) equivalent to 1 metric ton of CO2e emissions 

### Step By Step 

**Organization Flow**

The Organization is allowed to publish and edit policy config, schemas, tokens and all the workflow logic associated with it. They are responsible for inputting key information and assigning entities, assets, GHG sources, and devices in alignment with their corporate and operational structure.

1. Login into the service using credentials.

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/76291b11-f02d-401f-bd88-947e4a2bdb09">

2. Choose role “Organization.” 

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/889ac217-dd07-4344-8361-fd4e49011d42">

3. Create Organization Profile and input all required and applicable fields.

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/27779c64-5650-47e1-ad86-26ee57f5f6c9">

4. Create an Entity Profile for each applicable corporate entity (e.g., subsidiaries, business units, etc.). It is often good practice to have the corporate structure of the GHG inventory aligned with the corporate structure reflected in financial reporting, if applicable.

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/5b9d07d8-a1e6-4db8-9fd6-a2e24e9a6836">

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/1fe37179-fbd3-41a7-8cde-1d332fcbf098">

5. If the company or organization has already set GHG reduction targets, add them here and input the required and applicable details. It is generally best practice to set targets in alignment with the Science Based Targets initiative (SBTi).
  
<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/003f2190-f99e-4602-ac0b-e2840d406200">

6. For each organizational entity, add all assets that generate emissions (e.g., facilities, fleet vehicles, etc.).

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/dafcacc9-7eb9-4a08-ae3b-cfe6d20eb424">

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/ab6c9d8c-cf03-40a8-9803-6961ff37dd4a">

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/43bf1992-52ff-4b55-9680-9f13d7a40f37">

7. For each asset, add all applicable GHG sources and input the required and applicable fields. For example, common GHG sources for facilities are electricity, natural gas, and refrigerant consumption.

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/05e07a05-d810-4e39-8345-1f4584e5994d">

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/71b6e509-7d9b-4eac-802c-9ec5c4c27d6e">

8. For each GHG source, enter activity data such as electricity consumption (kWh) for facilities or distance traveled (miles) for vehicles. Monitoring data can be input manually, or collected automatically by verified monitoring devices such as IoT-enabled meters that are assigned to specific GHG sources. During this step, market-based instruments such as Renewable Energy Certificates (RECs) can be allocated to applicable GHG sources.
  
<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/d905e53e-b4e6-4955-b2f5-866fe2e102a0">

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/b6fb0f3e-3278-44aa-b88b-f3bfac481700">

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/6f1a78be-277a-45e8-877f-8dcf7e9623e4">

9. After all the applicable monitoring data is input and approved for the reporting period, key reporting metrics will be automatically populated and can be viewed under the Reporting Metrics tab in the VC document.
  
<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/77d721e7-ca29-4826-bae9-3bad8dc4149c">

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/c1acba2d-df68-49a5-8b2b-1e9b6976a3c4">

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/b408233c-4279-49c1-b76c-435009fa175d">

10. Once the reporting metrics have been calculated, a VVB can be assigned, and the metrics can be submitted for verification. This step is currently optional.

![image](https://github.com/user-attachments/assets/f96465f0-3db9-4085-af11-2b1c89220a3d)

11. If applicable, the organization can create and publish digital PCFs in alignment with the Pathfinder Framework v2.0. The PCF is based on all emissions attributed to a specific product/service IDs and made relative to the declared unit. 

![image](https://github.com/user-attachments/assets/8c53a372-e0ab-470a-8159-e03864e50df2)

![image](https://github.com/user-attachments/assets/d7351b2d-ea1e-4c20-93bd-5641c2adfbff)

![image](https://github.com/user-attachments/assets/1457161b-a82b-4f6c-b6c3-ca6107eb6ff1)

12. Under the Token History tab, the user can view the Trust Chain, where all the collective VCs can be viewed.

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/ba72b9f3-659f-487a-9913-bfbec7ccabb2">

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/ac0b1856-8bc2-47da-a7d9-4d9ca40a1a0a">

**VVB Flow**

1. Once the organization assigns a VVB, the VVB will be able to approve or reject MRV data and GHG sources. The VVB will also be able to approve or reject the GHG inventory reporting metrics after it’s calculated by the Guardian. These steps are optional and can be skipped or executed later in the workflow.

![image](https://github.com/hashgraph/guardian/assets/79293833/b8431bb5-78ac-48a7-97c0-73f36ef236ac)

2. All the GHG resources once viewed can be verified.

![image](https://github.com/hashgraph/guardian/assets/79293833/e42a02fa-838b-4b1b-aa2c-a54f0b29a3ea)

![image](https://github.com/hashgraph/guardian/assets/79293833/6ea6cb4c-b1c0-4ebe-ae8d-762d6776e570)

![image](https://github.com/hashgraph/guardian/assets/79293833/80fbed65-9f7e-460c-84a3-9467da7d2ffd)

![image](https://github.com/hashgraph/guardian/assets/79293833/df2105cc-9889-4851-bf1f-0e0ac1dde342)

3. After verification of GHG resources, VVB reviews reporting metrics and approve/reject.

![image](https://github.com/hashgraph/guardian/assets/79293833/43197dbb-2e1c-492b-81b1-d737b8806cad)


**Administrator (Registry) Flow**

1. After the organizational emissions have been calculated, the Registry will approve or reject the CET issuance request, and consequently issue CETs if approved.

![image](https://github.com/user-attachments/assets/97ed6544-3381-495e-80bb-de7b9dcd4958)

### Futureproofing (Automated GHG Inventories)

Due to several factors such as lack of expertise, absent third-party assurance, and methodologies that leave significant room for error, corporate GHG inventories are often inaccurate and unreliable. In addition, manually collecting monitoring and activity data each year can be a cumbersome task. By automating and digitizing the collection of monitoring data, GHG quantification calculations, and (optionally) third-party verification of devices, data, and calculations, GHG inventories can be automated and streamlined to enhance trust, transparency, and efficiency.  

### TODO

In future iterations of the policy, GHG source schemas can be modulated, and new types of data sources can be added as necessary. In addition, new GHG source categories will be added, as well as an option to add custom source schemas and emission factors. These may be added to the Guardian policy in the form of policy modules. 

The policy is designed to be dynamic, allowing organizations to assign entities to organizations, assets to entities, and GHG sources to assets in a hierarchical structure to dynamically tailor the inventory to specific corporate structures and operations. This aspect may also be modulated in future iterations of the policy. 

GHGP v3 will include an optional tool to manage disclosures to the SEC in alignment with their Climate Disclosure Rules.

