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

The GHG Protocol Corporate Accounting and Reporting Standard (GHGP Corporate Standard) is the world’s leading standard outlining requirements and guidance for corporate-level and organizational-level GHG emission inventories. As of 2016, approximately 92% of Fortune 500 companies responding to the CDP—an investor-led effort to increase corporate carbon disclosures—referenced the used the GHGP Corporate Standard to conduct their GHG inventories.  Also, many other GHG-related standards—such as the Natural Capital Partner’s CarbonNeutral Protocol and the Science Based Targets Initiative (SBTi)—point to the Greenhouse Gas Protocol as the default standard for the quantification and accounting of corporate GHG emissions. As future regulations and standards are developed and implemented, they are likely to either prescribe or encourage the use of Greenhouse Gas Protocol standards. 

This Guardian Policy mints Carbon Emission Tokens (CETs) in accordance with the GHGP Corporate Standard, including the Scope 2 Guidance, which was later published as an amendment to the GHGP Corporate Standard. The policy and methodologies are designed to calculate emissions based on MRV data that can either be manually input, or automatically transmitted by devices such as IoT-enabled electricity meters. The policy is equipped with standard emission factors (such as eGRID emission rates) and Intergovernmental Panel on Climate Change (IPCC) global warming potentials (GWPs). 

The policy currently covers emissions from grid electricity consumption (location and market-based calculations), natural gas consumption, mobile combustion, and refrigerants. In future iterations of the policy, GHG sources can be modulated, and additional sources can be added as necessary. The policy is designed to be dynamic, allowing organizations to assign entities to organizations, assets/emission generating objects (EGOs) to entities, and GHG sources to assets/EGOs in a hierarchical structure to dynamically tailor the policy and inventory to specific corporate structures and operations. This aspect may also be modulated in future iterations of the policy.

## Need and Use of the GHGP Corporate Standard Policy

According to the IPCC, in order to avoid potentially irreversible impacts of climate change, global GHG emissions should be reduced by approximately 45% by 2030 (relative to 2010 levels) and achieve net zero by around 2050. Therefore, it comes as no surprise that the largest companies in the world are increasingly aligning their GHG reduction targets with the latest scientific models, in an effort to both exhibit their commitment to sustainability, as well as to remain viable in a low-carbon future. The number of companies working with the Science Based Targets initiative (SBTi) has increased nearly 1,900% between 2015 and 2020, with 1,039 cumulatively committed companies representing nearly 20% of global market capitalization (over $20.5 trillion USD).

The increase in corporate and organizational commitments to measure, disclose, and reduce GHG emissions is likely to continue to increase for the foreseeable future as stakeholders, investors, and regulators place a stronger focus on climate impacts and performance. The United Nations Principles for Responsible Investment (UN PRI) forecasts a “general acceleration in [climate] policy responses to 2025, driven in part by continuing pressure for change.” On March 21, 2022, the SEC proposed rules to enhance and standardize climate-related disclosures for investors. The proposed rule changes would require registrants to include certain climate-related disclosures in their registration statements and periodic reports.

Despite a growing interest in measuring, disclosing, and reducing GHG emissions from corporations, regulators, and investors alike, companies are struggling to accurately measure and report emissions. In general, current quantification methodologies are flawed, GHG accounting standards leave significant room for error, access to quality data is low, and there is a prevailing lack of GHG accounting expertise. As a result, high-profile companies have been exposed for incorrect GHG inventories and worse, misleading claims on carbon performance. According to an article by Bloomberg, ‘Corporate Greenhouse Gas Data Doesn’t Always Add Up,’ “As companies rush to set climate goals, some aren’t even getting the basics quite right when it comes to accounting for greenhouse-gas emissions. According to researchers in Ireland, the U.K. and Germany, based on decade’s worth of corporate emissions data, “when the numbers were tallied, many didn’t add up. They found instances of errors, omissions and rounding issues (often down rather than up).”

The Guardian GHGP Corporate Policy offers a unique technical opportunity for companies to streamline, add robustness, and build trust and transparency into their GHG inventories. The policy allows user to dynamically add entities and EGOs to organizations and GHG sources to EGOs to build their inventories in alignment with their specific corporate structures. MRV data can then be fed into GHG source schemas through verified devices such as IoT-enabled meters, or added manually depending on the users level of digitization. The inventory is further streamlined through schemas with built in auto-calculation blocks, emission factors, and GWPs. The results of the inventory can be immutably and transparently verified by third parties. Finally, the emissions are tokenized to allow for enhanced tracking, transparency, accounting, and reporting, with the results and data structured in accordance with GHGP reporting requirements.

## Demo Video

Coming Soon

## Policy Workflow

![image](https://github.com/hashgraph/guardian/assets/79293833/39075f78-6eba-4d9f-83df-4d7015d7921c)


## Policy Guide

This policy is published to Hedera network and can either be imported via Github (.policy file) or IPSF timestamp.

Latest Version - 1698402201.827872003

### Available Roles 
 
- Registry – The role responsible for publishing policies, creating tokens, and approving/rejecting GHG sources added by the organization
- Organization – Company or other organization generating, quantifying, and reporting GHG emissions.
- VVB (Validation & Verification Body) – Independent third party who audits organization’s critical documentation, MRV data and sources, and GHG inventories. Verification is optional for this policy as it is optional under the GHGP Corporate Standard. The workflow steps involving the VVBs will not block the subsequent steps or the minting of CETs, therefore they can be 1) executed according to the workflow above, 2) skipped, or 3) executed later in the workflow.
  
### Important Documents & Schemas 
  
**Organizational Profile** - The company or organization creates a profile of key information, targets, and reporting metrics. Entities (such as business units, subsidiaries, etc.) are assigned to the company or organization. 

**Entity Schema** – The company creates profiles with key information for each entity. Assets and EGOs (such as facilities, vehicles, etc.) are assigned to entities. Together, the entities make up the corporate structure by which the inventory is based. 

**Asset Schema** - Information on company assets is input and GHG sources (such grid electricity, fuel consumption, etc.) are assigned to assets. 

**Source Schema** – Activity data (such electrical consumption, fuel consumption, etc.) are used to auto-calculate GHG emissions. 

**Raw Data Schema** — Data from devices such as IoT-enabled electricity meters is collected and fed into the corresponding Source Schema for calculations.

**Reporting Metrics** — Key metrics are collected from the schemas to support reporting in alignment with the GHGP Corporate Standard.
   
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

5. If the company or organization has already set GHG reduction targets, add them here and input the required and applicable details. It is generally best practice to set targets in alignment with the Science Based Targets Initiative (SBTi).
  
<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/003f2190-f99e-4602-ac0b-e2840d406200">

6. For each organizational entity, add all assets/EGOs that generate emissions (e.g., facilities, fleet vehicles, etc.).

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/dafcacc9-7eb9-4a08-ae3b-cfe6d20eb424">

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/ab6c9d8c-cf03-40a8-9803-6961ff37dd4a">

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/43bf1992-52ff-4b55-9680-9f13d7a40f37">

7. For each asset/EGO, add all applicable GHG sources and input the required and applicable fields. For example, common GHG sources for facilities are electricity, natural gas, and refrigerant consumption.

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

10. Under the Token History tab, the user can view the Trust Chain, where all the collective VCs can be viewed.

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/ba72b9f3-659f-487a-9913-bfbec7ccabb2">

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/ac0b1856-8bc2-47da-a7d9-4d9ca40a1a0a">

**VVB Flow**

1. Assign role as VVB and add VVB name

![image](https://github.com/hashgraph/guardian/assets/79293833/b8431bb5-78ac-48a7-97c0-73f36ef236ac)

2. All the GHG resources once viewed can be verified.

![image](https://github.com/hashgraph/guardian/assets/79293833/e42a02fa-838b-4b1b-aa2c-a54f0b29a3ea)

![image](https://github.com/hashgraph/guardian/assets/79293833/6ea6cb4c-b1c0-4ebe-ae8d-762d6776e570)

![image](https://github.com/hashgraph/guardian/assets/79293833/80fbed65-9f7e-460c-84a3-9467da7d2ffd)

![image](https://github.com/hashgraph/guardian/assets/79293833/df2105cc-9889-4851-bf1f-0e0ac1dde342)

3. After verification of GHG resources, VVB reviews reporting metrics and approve/reject.

![image](https://github.com/hashgraph/guardian/assets/79293833/43197dbb-2e1c-492b-81b1-d737b8806cad)


**Administrator (Registry) Flow**

1. Following step 8 of the Organizational Flow, the Administrator (Registry) will approve or reject each source.

![image](https://github.com/hashgraph/guardian/assets/79293833/ae1f2694-733b-4029-81c6-73209a10ef8a)

2. Once it is approved, tokens are minted as shown:

![image](https://github.com/hashgraph/guardian/assets/79293833/38a164dd-f0d6-44cc-9c99-3ba6475523da)


### Futureproofing (Automated GHG Inventories)

Due to several factors such as lack of expertise, absent third-party assurance, and methodologies that leave significant room for error, corporate GHG inventories are often inaccurate and unreliable. In addition, manually collecting monitoring and activity data each year can be a cumbersome task. By automating and digitizing the collection of monitoring data, GHG quantification calculations, and (optionally) third-party verification of devices, data, and calculations, GHG inventories can be automated and streamlined to enhance trust, transparency, and efficiency.  

### TODO

Currently, under the GHG Protocol Corporate Standard, third-party assurance/verification is encouraged, but optional. This initial version of the GHGP Corporate Policy is designed to meet the minimum requirements of the standard, and as such, the role of the VVB is optional and not included. However, future versions of the policy will include an optional role of the VVB and process steps for them to verify monitoring devices and GHG inventories.

The initial version of the GHGP Corporate Policy is includes schemas for some of the most common assets/EGOs (facilities and vehicles) and GHG sources (scope 1 - natural gas consumption, scope 1 - refrigerants, scope 1 - mobile combustion of fuel, and scope 2 - electrical consumption). However, there are other potential GHG sources that may be applicable to specific corporate GHG inventories. Further, scope 3 emissions are currently optional under the GHGP Corporate Standard, although companies may choose to include them as well. Going forward, schemas may be added for additional GHG sources and scope 3 GHG sources. These may be added to the Guardian policy in the form of policy modules.

