---
description: This policy is developed by Envision
---

# 🏭 GHGP Corporate Standard

## Table of Contents

[Introduction](ghgp-corporate-standard.md#\_toc141460612)

[Need and Use for the GHGP Corporate Standard Policy](ghgp-corporate-standard.md#\_toc141460613)

[Demo Video](ghgp-corporate-standard.md#\_toc141460614)

[Policy Workflow](ghgp-corporate-standard.md#\_toc141460615)

[Policy Guide](ghgp-corporate-standard.md#\_toc141460616)

[Available Roles](ghgp-corporate-standard.md#\_toc141460617)

[Important Documents & Schemas](ghgp-corporate-standard.md#\_toc141460618)

[Token (Carbon Emission)](ghgp-corporate-standard.md#\_toc141460619)

[Step by Step](ghgp-corporate-standard.md#\_toc141460620)

&#x20;     [Organization Flow](ghgp-corporate-standard.md#\_toc141460621)

&#x20;     [Administrator (Registry) Flow](ghgp-corporate-standard.md#\_toc141460622)

[Futureproofing (Automated GHG Inventories)](ghgp-corporate-standard.md#\_toc141460623)

[TODO](ghgp-corporate-standard.md#\_toc141460624)

## Introduction <a href="#_toc141460612" id="_toc141460612"></a>

The GHG Protocol Corporate Accounting and Reporting Standard (GHGP Corporate Standard) is the world’s leading standard outlining requirements and guidance for corporate-level and organizational-level GHG emission inventories. As of 2016, approximately 92% of Fortune 500 companies responding to the CDP—an investor-led effort to increase corporate carbon disclosures—referenced the used the GHGP Corporate Standard to conduct their GHG inventories.\[1] Also, many other GHG-related standards—such as the Natural Capital Partner’s CarbonNeutral Protocol and the Science Based Targets Initiative (SBTi)—point to the Greenhouse Gas Protocol as the default standard for the quantification and accounting of corporate GHG emissions. As future regulations and standards are developed and implemented, they are likely to either prescribe or encourage the use of Greenhouse Gas Protocol standards.

This Guardian Policy mints Carbon Emission Tokens (CETs) in accordance with the GHGP Corporate Standard, including the Scope 2 Guidance, which was later published as an amendment to the GHGP Corporate Standard. The policy and methodologies are designed to calculate emissions based on MRV data that can either be manually input, or automatically transmitted by devices such as IoT-enabled electricity meters. The policy is equipped with standard emission factors (such as eGRID emission rates) and Intergovernmental Panel on Climate Change (IPCC) global warming potentials (GWPs).

The policy currently covers emissions from grid electricity consumption (location and market-based calculations), natural gas consumption, mobile combustion, and refrigerants. In future iterations of the policy, GHG sources can be modulated, and additional sources can be added as necessary. The policy is designed to be dynamic, allowing organizations to assign entities to organizations, assets/emission generating objects (EGOs) to entities, and GHG sources to assets/EGOs in a hierarchical structure to dynamically tailor the policy and inventory to specific corporate structures and operations. This aspect may also be modulated in future iterations of the policy.

## Need and Use for the GHGP Corporate Standard Policy <a href="#_toc141460613" id="_toc141460613"></a>

According to the IPCC, in order to avoid potentially irreversible impacts of climate change, global GHG emissions should be reduced by approximately 45% by 2030 (relative to 2010 levels) and achieve net zero by around 2050. Therefore, it comes as no surprise that the largest companies in the world are increasingly aligning their GHG reduction targets with the latest scientific models, in an effort to both exhibit their commitment to sustainability, as well as to remain viable in a low-carbon future. The number of companies working with the Science Based Targets initiative (SBTi) has increased nearly 1,900% between 2015 and 2020, with 1,039 cumulatively committed companies representing nearly 20% of global market capitalization (over $20.5 trillion USD).

The increase in corporate and organizational commitments to measure, disclose, and reduce GHG emissions is likely to continue to increase for the foreseeable future as stakeholders, investors, and regulators place a stronger focus on climate impacts and performance. The United Nations Principles for Responsible Investment (UN PRI) forecasts a “general acceleration in \[climate] policy responses to 2025, driven in part by continuing pressure for change.” On March 21, 2022, the SEC proposed rules to enhance and standardize climate-related disclosures for investors. The proposed rule changes would require registrants to include certain climate-related disclosures in their registration statements and periodic reports.

Despite a growing interest in measuring, disclosing, and reducing GHG emissions from corporations, regulators, and investors alike, companies are struggling to accurately measure and report emissions. In general, current quantification methodologies are flawed, GHG accounting standards leave significant room for error, access to quality data is low, and there is a prevailing lack of GHG accounting expertise. As a result, high-profile companies have been exposed for incorrect GHG inventories and worse, misleading claims on carbon performance. According to an article by Bloomberg, ‘Corporate Greenhouse Gas Data Doesn’t Always Add Up,’ “As companies rush to set climate goals, some aren’t even getting the basics quite right when it comes to accounting for greenhouse-gas emissions. According to researchers in Ireland, the U.K. and Germany, based on decade’s worth of corporate emissions data, “when the numbers were tallied, many didn’t add up. They found instances of errors, omissions and rounding issues (often down rather than up).”

The Guardian GHGP Corporate Policy offers a unique technical opportunity for companies to streamline, add robustness, and build trust and transparency into their GHG inventories. The policy allows user to dynamically add entities and EGOs to organizations and GHG sources to EGOs to build their inventories in alignment with their specific corporate structures. MRV data can then be fed into GHG source schemas through verified devices such as IoT-enabled meters, or added manually depending on the users level of digitization. The inventory is further streamlined through schemas with built in auto-calculation blocks, emission factors, and GWPs. The results of the inventory can be immutably and transparently verified by third parties. Finally, the emissions are tokenized to allow for enhanced tracking, transparency, accounting, and reporting, with the results and data structured in accordance with GHGP reporting requirements.

## Demo Video <a href="#_toc141460614" id="_toc141460614"></a>

(Coming Soon)

## Policy Workflow <a href="#_toc141460615" id="_toc141460615"></a>

![](<../../../.gitbook/assets/0 (7) (1).png>)

## Policy Guide <a href="#_toc141460616" id="_toc141460616"></a>

This policy is published to Hedera network and can either be imported via Github (.policy file) or IPSF timestamp.

Latest Version - 1695216161.052983914

## Available Roles <a href="#_toc141460617" id="_toc141460617"></a>

**Registry** – The role responsible for publishing policies, creating tokens, and approving/rejecting GHG sources added by the organization.

**Organization** – Company or other organization generating, quantifying, and reporting GHG emissions.

**VVB (Validation & Verification Body)** – Independent third party who audits organization’s critical documentation, MRV data, and GHG emission calculations. Verification is optional for this policy as it is optional under the GHGP Corporate Standard.\[2]

## Important Documents & Schemas <a href="#_toc141460618" id="_toc141460618"></a>

1. **Organizational Profile** – The company or organization creates a profile of key information, targets, and reporting metrics. Entities (such as business units, subsidiaries, etc.) are assigned to the company or organization.
2. **Entity Schema** – The company creates profiles with key information for each entity. Assets and EGOs (such as facilities, vehicles, etc.) are assigned to entities. Together, the entities make up the corporate structure by which the inventory is based.
3. **Asset Schema** — Information on company assets is input and GHG sources (such grid electricity, fuel consumption, etc.) are assigned to assets.
4. **Source Schema** — Activity data (such electrical consumption, fuel consumption, etc.) are used to auto-calculate GHG emissions.
5. **Raw Data Schema** — Data from devices such as IoT-enabled electricity meters is collected and fed into the corresponding Source Schema for calculations.
6. **Reporting Metrics** — Key metrics are collected from the schemas to support reporting in alignment with the GHGP Corporate Standard.

## Token (Carbon Emission) <a href="#_toc141460619" id="_toc141460619"></a>

Carbon Emission Token (CET) equivalent to 1 metric ton of CO2e emissions

## Step by Step <a href="#_toc141460620" id="_toc141460620"></a>

### Organization Flow <a href="#_toc141460621" id="_toc141460621"></a>

The Organization is allowed to publish and edit policy config, schemas, tokens and all the workflow logic associated with it. They are responsible for inputting key information and assigning entities, assets, GHG sources, and devices in alignment with their corporate and operational structure.

1. Login into the service using credentials.

<figure><img src="../../../.gitbook/assets/image (227).png" alt="" width="255"><figcaption></figcaption></figure>

2. Choose role “Organization.”

<figure><img src="../../../.gitbook/assets/image (228).png" alt="" width="563"><figcaption></figcaption></figure>

3. Create Organization Profile and input all required and applicable fields.

<figure><img src="../../../.gitbook/assets/image (229).png" alt="" width="563"><figcaption></figcaption></figure>

4. Create an Entity Profile for each applicable corporate entity (e.g., subsidiaries, business units, etc.). It is often good practice to have the corporate structure of the GHG inventory aligned with the corporate structure reflected in financial reporting, if applicable.

<figure><img src="../../../.gitbook/assets/image (230).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (231).png" alt="" width="563"><figcaption></figcaption></figure>

5. If the company or organization has already set GHG reduction targets, add them here and input the required and applicable details. It is generally best practice to set targets in alignment with the Science Based Targets Initiative (SBTi).

<figure><img src="../../../.gitbook/assets/image (232).png" alt="" width="563"><figcaption></figcaption></figure>

6. For each organizational entity, add all assets/EGOs that generate emissions (e.g., facilities, fleet vehicles, etc.).

<figure><img src="../../../.gitbook/assets/image (233).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (234).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (235).png" alt="" width="563"><figcaption></figcaption></figure>

7. For each asset/EGO, add all applicable GHG sources and input the required and applicable fields. For example, common GHG sources for facilities are electricity, natural gas, and refrigerant consumption.

<figure><img src="../../../.gitbook/assets/image (236).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (237).png" alt="" width="563"><figcaption></figcaption></figure>

8. For each GHG source, enter activity data such as electricity consumption (kWh) for facilities or distance traveled (miles) for vehicles. Monitoring data can be input manually, or collected automatically by verified monitoring devices such as IoT-enabled meters that are assigned to specific GHG sources. During this step, market-based instruments such as Renewable Energy Certificates (RECs) can be allocated to applicable GHG sources.

<figure><img src="../../../.gitbook/assets/image (238).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (239).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (240).png" alt="" width="563"><figcaption></figcaption></figure>

9. After all the applicable monitoring data is input and approved for the reporting period, key reporting metrics will be automatically populated and can be viewed under the Reporting Metrics tab in the VC document.

<figure><img src="../../../.gitbook/assets/image (241).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (242).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (243).png" alt="" width="563"><figcaption></figcaption></figure>

10. Under the Token History tab, the user can view the Trust Chain, where all the collective VCs can be viewed.

<figure><img src="../../../.gitbook/assets/image (244).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (245).png" alt="" width="563"><figcaption></figcaption></figure>

### Administrator (Registry) Flow <a href="#_toc141460622" id="_toc141460622"></a>

1. Following step 8 of the Organizational Flow, the Administrator (Registry) will approve or reject each source.

<figure><img src="../../../.gitbook/assets/image (246).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (247).png" alt="" width="563"><figcaption></figcaption></figure>

### Futureproofing (Automated GHG Inventories) <a href="#_toc141460623" id="_toc141460623"></a>

Due to several factors such as lack of expertise, absent third-party assurance, and methodologies that leave significant room for error, corporate GHG inventories are often inaccurate and unreliable. In addition, manually collecting monitoring and activity data each year can be a cumbersome task. By automating and digitizing the collection of monitoring data, GHG quantification calculations, and (optionally) third-party verification of devices, data, and calculations, GHG inventories can be automated and streamlined to enhance trust, transparency, and efficiency.

### TODO <a href="#_toc141460624" id="_toc141460624"></a>

Currently, under the GHG Protocol Corporate Standard, third-party assurance/verification is encouraged, but optional. This initial version of the GHGP Corporate Policy is designed to meet the minimum requirements of the standard, and as such, the role of the VVB is optional and not included. However, future versions of the policy will include an optional role of the VVB and process steps for them to verify monitoring devices and GHG inventories.

The initial version of the GHGP Corporate Policy is includes schemas for some of the most common assets/EGOs (facilities and vehicles) and GHG sources (scope 1 - natural gas consumption, scope 1 - refrigerants, scope 1 - mobile combustion of fuel, and scope 2 - electrical consumption). However, there are other potential GHG sources that may be applicable to specific corporate GHG inventories. Further, scope 3 emissions are currently optional under the GHGP Corporate Standard, although companies may choose to include them as well. Going forward, schemas may be added for additional GHG sources and scope 3 GHG sources. These may be added to the Guardian policy in the form of policy modules.

1. [https://ghgprotocol.org/companies-and-organizations](https://ghgprotocol.org/companies-and-organizations) ↑
2. Independent third-party verification is currently optional under the GHGP Corporate Standard and is not included in the initial version of the GHGP Corporate Policy. ↑
