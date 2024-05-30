# 🏭 GHGP Corporate Standard V2

## Table of Contents

[Introduction](ghgp-corporate-standard-v2.md#toc146717947)

[Need and Use for the GHGP Corporate Standard Policy](ghgp-corporate-standard-v2.md#toc146717948)

[Policy Workflow](ghgp-corporate-standard-v2.md#toc146717950)

[Policy Guide](ghgp-corporate-standard-v2.md#toc146717951)

[Available Roles](ghgp-corporate-standard-v2.md#toc146717952)

[Important Documents & Schemas](ghgp-corporate-standard-v2.md#toc146717953)

[Token (Carbon Emission)](ghgp-corporate-standard-v2.md#toc146717954)

[Step by Step](ghgp-corporate-standard-v2.md#toc146717955)

&#x20;       [Organization Flow](ghgp-corporate-standard-v2.md#toc146717956)

&#x20;       [VVB Flow](ghgp-corporate-standard-v2.md#toc146717957)

&#x20;       [Administrator (Registry) Flow](ghgp-corporate-standard-v2.md#toc146717958)

[Futureproofing (Automated GHG Inventories)](ghgp-corporate-standard-v2.md#toc146717959)

[TODO](ghgp-corporate-standard-v2.md#toc146717960)

### Introduction <a href="#toc146717947" id="toc146717947"></a>

The GHG Protocol Corporate Accounting and Reporting Standard (GHGP Corporate Standard) is the world’s leading standard outlining requirements and guidance for corporate-level and organizational-level GHG emission inventories. As of 2016, approximately 92% of Fortune 500 companies responding to the CDP—an investor-led effort to increase corporate carbon disclosures—referenced the used the GHGP Corporate Standard to conduct their GHG inventories.\[1] Also, many other GHG-related standards—such as the Natural Capital Partner’s CarbonNeutral Protocol and the Science Based Targets Initiative (SBTi)—point to the Greenhouse Gas Protocol as the default standard for the quantification and accounting of corporate GHG emissions. As future regulations and standards are developed and implemented, they are likely to either prescribe or encourage the use of Greenhouse Gas Protocol standards.

This Guardian Policy mints Carbon Emission Tokens (CETs) in accordance with the GHGP Corporate Standard, including the Scope 2 Guidance, which was later published as an amendment to the GHGP Corporate Standard. The policy and methodologies are designed to calculate emissions based on MRV data that can either be provided manually by the organization, or automatically sourced from devices such as IoT-enabled electricity meters. The policy is equipped with standard emission factors (such as eGRID emission rates) and Intergovernmental Panel on Climate Change (IPCC) global warming potentials (GWPs).  &#x20;

The policy currently covers emissions from grid electricity consumption (location and market-based calculations), natural gas consumption, mobile combustion, and refrigerants. The policy is designed to be dynamic, allowing organizations to assign entities to organizations, assets/emission generating objects (EGOs) to entities, and GHG sources to assets/EGOs in a hierarchical structure to dynamically tailor the policy and inventory to specific corporate structures and operations.

### Need and Use for the GHGP Corporate Standard Policy <a href="#toc146717948" id="toc146717948"></a>

According to the IPCC, in order to avoid potentially irreversible impacts of climate change, global GHG emissions should be reduced by approximately 45% by 2030 (relative to 2010 levels) and achieve net zero by around 2050. Therefore, it comes as no surprise that the largest companies in the world are increasingly aligning their GHG reduction targets with the latest scientific models, in an effort to both exhibit their commitment to sustainability, as well as to remain viable in a low-carbon future. The number of companies working with the Science Based Targets initiative (SBTi) has increased nearly 1,900% between 2015 and 2020, with 1,039 cumulatively committed companies representing nearly 20% of global market capitalization (over $20.5 trillion USD).

The increase in corporate and organizational commitments to measure, disclose, and reduce GHG emissions is likely to continue to increase for the foreseeable future as stakeholders, investors, and regulators place a stronger focus on climate impacts and performance. The United Nations Principles for Responsible Investment (UN PRI) forecasts a “general acceleration in \[climate] policy responses to 2025, driven in part by continuing pressure for change.” On March 21, 2022, the SEC proposed rules to enhance and standardize climate-related disclosures for investors. The proposed rule changes would require registrants to include certain climate-related disclosures in their registration statements and periodic reports.

Despite a growing interest in measuring, disclosing, and reducing GHG emissions from corporations, regulators, and investors alike, companies are struggling to accurately measure and report emissions. In general, current quantification methodologies are flawed, GHG accounting standards leave significant room for error, access to quality data is low, and there is a prevailing lack of GHG accounting expertise. As a result, high-profile companies have been exposed for incorrect GHG inventories and worse, misleading claims on carbon performance. According to an article by Bloomberg, ‘Corporate Greenhouse Gas Data Doesn’t Always Add Up,’ “As companies rush to set climate goals, some aren’t even getting the basics quite right when it comes to accounting for greenhouse-gas emissions. According to researchers in Ireland, the U.K. and Germany, based on decade’s worth of corporate emissions data, “when the numbers were tallied, many didn’t add up. They found instances of errors, omissions and rounding issues (often down rather than up).” &#x20;

The Guardian GHGP Corporate Policy offers a unique technical opportunity for companies to streamline, add robustness, and build trust and transparency into their GHG inventories. The policy allows user to dynamically add entities and EGOs to organizations and GHG sources to EGOs to build their inventories in alignment with their specific corporate structures. MRV data can then be sourced by the Guardian automatically (e.g., via API, IoT-enabled devices, etc.) or provided manually depending on the user’s level of digitization. The inventory is further streamlined through Guardian policies with built in auto-calculation blocks, emission factors, and GWPs. The results of the inventory can be immutably and transparently verified by third parties. Finally, the emissions are tokenized to allow for enhanced tracking, transparency, accounting, and reporting, with the results and data structured in accordance with GHGP reporting requirements.

### Policy Workflow <a href="#toc146717950" id="toc146717950"></a>

<figure><img src="../../../.gitbook/assets/image (3) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### Policy Guide <a href="#toc146717951" id="toc146717951"></a>

This policy is published to Hedera network and can either be imported via Github (.policy file) or IPSF timestamp.

Latest Version - 1707206253.006698003

### Available Roles <a href="#toc146717952" id="toc146717952"></a>

**Registry** – The role responsible for publishing policies, creating tokens, and issuing CETs to organizations in accordance with the policy and methodology.

**Organization** – Company or other organization generating, quantifying, and reporting GHG emissions. The organization also provides MRV data and receives CETs.

**VVB (Validation & Verification Body)** – Independent third party who audits organization’s critical documentation, MRV data and sources, and GHG inventories. Verification is optional for this policy as it is optional under the GHGP Corporate Standard. The workflow steps involving the VVBs will not block the subsequent steps or the minting of CETs, therefore they can be 1) executed according to the workflow above, 2) skipped, or 3) executed later in the workflow.

### Important Documents & Schemas <a href="#toc146717953" id="toc146717953"></a>

1. Organizational Profile – The company or organization creates a profile of key information, targets, and reporting metrics. Entities (such as business units, subsidiaries, etc.) are assigned to the company or organization.
2. Entity Schema – The company profiles with key information for each entity. Assets and EGOs (such as facilities, vehicles, etc.) are assigned to entities. Together, the entities make up the corporate structure by which the inventory is based.
3. Asset Schema — Information on company assets provided by the organization and GHG sources (such grid electricity, fuel consumption, etc.) are assigned to assets.
4. Source Schema — Aggregated activity data (such electrical consumption, fuel consumption, etc.) which are used to auto-calculate GHG emissions.
5. Raw Data Schema — Raw activity data sourced manually or automatically from APIs or devices such as IoT-enabled electricity meters.
6. Reporting Metrics — Key metrics to support reporting in alignment with the GHGP Corporate Standard.

### Token (Carbon Emission) <a href="#toc146717954" id="toc146717954"></a>

Carbon Emission Token (CET) equivalent to 1 metric ton of CO2e emissions.

### Step by Step <a href="#toc146717955" id="toc146717955"></a>

### Organization Flow <a href="#toc146717956" id="toc146717956"></a>

The Organization is responsible for inputting key data and information and assigning entities, assets, GHG sources, and devices in alignment with their corporate and operational structure.

1\.     Login into the service using credentials.

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

7. For each asset/EGO, add all applicable GHG sources and input the required and applicable fields. For example, common GHG sources for facilities are electricity, natural gas, and refrigerant consumption

<figure><img src="../../../.gitbook/assets/image (236).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (237).png" alt="" width="563"><figcaption></figcaption></figure>

8. For each GHG source, enter activity data such as electricity consumption (kWh) for facilities or distance traveled (miles) for vehicles. MRV data can be provided manually by the organization, or sourced automatically from APIs or verified monitoring devices such as IoT-enabled meters that are assigned to specific GHG sources. During this step, market-based instruments such as Renewable Energy Certificates (RECs) can be allocated to applicable GHG sources.

<figure><img src="../../../.gitbook/assets/image (238).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (239).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (240).png" alt="" width="563"><figcaption></figcaption></figure>

9. After all the applicable monitoring data is input for the reporting period, key reporting metrics will be automatically populated and can be viewed under the Reporting Metrics tab in the VC document.

<figure><img src="../../../.gitbook/assets/image (241).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (242).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (243).png" alt="" width="563"><figcaption></figcaption></figure>

10. Under the Token History tab, the user can view the Trust Chain, where all the collective VCs can be viewed.

<figure><img src="../../../.gitbook/assets/image (244).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (245).png" alt="" width="563"><figcaption></figcaption></figure>

### VVB Flow <a href="#toc146717957" id="toc146717957"></a>

1. Assign role as VVB and add VVB name

<figure><img src="../../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

2. All the GHG resources once viewed can be verified.

<figure><img src="../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (3) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (4) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (5) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

3. After verification of GHG resources, VVB reviews reporting metrics and approve/reject.

<figure><img src="../../../.gitbook/assets/image (7) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### Administrator (Registry) <a href="#toc146717958" id="toc146717958"></a>

1. After the organizational emissions have been calculated, the Registry will approve or reject the CET issuance request, and consequently issue CETs if approved.

<figure><img src="../../../.gitbook/assets/image (8) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

2. Once it is approved, tokens are minted as shown:

<figure><img src="../../../.gitbook/assets/image (9) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### Futureproofing (Automated GHG Inventories) <a href="#toc146717959" id="toc146717959"></a>

Due to several factors such as lack of expertise, absent third-party assurance, and methodologies that leave significant room for error, corporate GHG inventories are often inaccurate and unreliable. In addition, manually collecting monitoring and activity data each year can be a cumbersome task. By automating and digitizing the collection of monitoring data, GHG quantification calculations, and (optionally) third-party verification of devices, data, and calculations, GHG inventories can be automated and streamlined to enhance trust, transparency, and efficiency.

### TODO <a href="#toc146717960" id="toc146717960"></a>

The policy currently covers emissions from grid electricity consumption (location and market-based calculations), natural gas consumption, mobile combustion, and refrigerants. In future iterations of the policy, GHG source schemas can be modulated, and new types of data sources can be added as necessary. The policy is designed to be dynamic, allowing organizations to assign entities to organizations, assets/EGOs to entities, and GHG sources to assets/EGOs in a hierarchical structure to dynamically tailor the inventory to specific corporate structures and operations. This aspect may also be modulated in future iterations of the policy.

The initial version of the GHGP Corporate Policy is includes schemas for some of the most common assets/EGOs (facilities and vehicles) and GHG sources (scope 1 - natural gas consumption, scope 1 - refrigerants, scope 1 - mobile combustion of fuel, and scope 2 - electrical consumption). However, there are other potential GHG sources that may be applicable to specific corporate GHG inventories. Further, scope 3 emissions are currently optional under the GHGP Corporate Standard, although companies may choose to include them as well. Going forward, schemas may be added for additional GHG sources and scope 3 GHG sources. These may be added to the Guardian policy in the form of policy modules.   &#x20;

1. [https://ghgprotocol.org/companies-and-organizations](https://ghgprotocol.org/companies-and-organizations) ↑
