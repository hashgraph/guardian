# GHGP Corporate Standard V2

## Table of Contents

[Introduction](ghgp-corporate-standard-v2.md#toc146717947)

[Need and Use for the GHGP Corporate Standard Policy](ghgp-corporate-standard-v2.md#toc146717948)

[Policy Workflow](ghgp-corporate-standard-v2.md#toc146717950)

[Policy Guide](ghgp-corporate-standard-v2.md#toc146717951)

[Available Roles](ghgp-corporate-standard-v2.md#toc146717952)

[Important Documents & Schemas](ghgp-corporate-standard-v2.md#toc146717953)

[Token (Carbon Emission)](ghgp-corporate-standard-v2.md#toc146717954)

[Step by Step](ghgp-corporate-standard-v2.md#toc146717955)

[Organization Flow](ghgp-corporate-standard-v2.md#toc146717956)

[VVB Flow](ghgp-corporate-standard-v2.md#toc146717957)

[Administrator (Registry) Flow](ghgp-corporate-standard-v2.md#toc146717958)

[Futureproofing (Automated GHG Inventories)](ghgp-corporate-standard-v2.md#toc146717959)

### Introduction <a href="#toc146717947" id="toc146717947"></a>

The GHG Protocol Corporate Accounting and Reporting Standard (GHGP Corporate Standard) is the world’s leading standard outlining requirements and guidance for corporate-level and organizational-level GHG emission inventories. Approximately 92% of Fortune 500 companies responding to the CDP—an investor-led effort to increase corporate carbon disclosures—referenced the used the GHGP Corporate Standard to conduct their GHG inventories.\[1] Also, many other GHG-related standards—such as the Natural Capital Partner’s CarbonNeutral Protocol and the Science Based Targets Initiative (SBTi)—point to the Greenhouse Gas Protocol as the commonplace standard for the quantification and accounting of corporate GHG emissions. As future regulations and standards are developed and implemented, they may either prescribe or encourage the use of Greenhouse Gas Protocol standards.

This Guardian Policy mints Carbon Emission Tokens (CETs) in accordance with the GHGP Corporate Standard, including the Scope 2 Guidance, which was later published as an amendment to the GHGP Corporate Standard. In addition, the policy includes functionality to attribute emissions to products and services and use this data to calculate and publish product carbon footprints (PCFs) in accordance with the Pathfinder Framework v2.0. The policy and methodologies are designed to calculate emissions based on MRV data that can either be input manually by the organization, or automatically through API and trusted external data sources. The policy is equipped with standard emission factors (such as eGRID emission rates) and Intergovernmental Panel on Climate Change (IPCC) global warming potentials (GWPs).

The policy currently covers the following sources and future versions will have the ability add new modulated source categories and custom source schemas.

Included Sources:

\- Scope 1: Stationary Combustion

\- Scope 1: Mobile Combustion

\- Scope 1: Refrigerants

\- Scope 2: Purchased Electricity (Location-Based)

\- Scope 2: Purchased Electricity (Market-Based)

\- Scope 3.1: Purchased Goods and Services

\- Scope 3.4: Upstream Transportation and Distribution

The policy is designed to be dynamic, allowing companies to assign entities to organizations, assets(facilities, vehicles, equipment, etc.) to entities, and GHG sources to assets/EGOs in a hierarchical structure to dynamically tailor the policy and inventory to specific corporate structures and operations.

### Need and Use for the GHGP Corporate Standard Policy <a href="#toc146717948" id="toc146717948"></a>

According to the IPCC, in order to avoid potentially irreversible impacts of climate change, global GHG emissions should be reduced by approximately 45% by 2030 (relative to 2010 levels) and achieve net zero by around 2050. Therefore, it comes as no surprise that many of the largest companies in the world are increasingly aligning their GHG reduction targets with the latest scientific studies, in an effort to both exhibit their commitment to sustainability, as well as to remain viable in a low-carbon future. The number of companies working with the Science Based Targets initiative (SBTi) has increased nearly 1,900% between 2015 and 2020, with 1,039 cumulatively committed companies representing nearly 20% of global market capitalization (over $20.5 trillion USD).

In addition to momentum in voluntary GHG commitments, there are several new regulations requiring the measuring and reporting of GHG emissions (outlined below):

The Securities and Exchange Commission (SEC) Climate Disclosure Rules: On March 6th, 2024, the SEC adopted rules to enhance and standardize climate-related disclosures by public companies and in public offerings. The rules will require registrants to disclose climate-related risks, targets, mitigating strategic efforts, and \[for large, accelerated filers (LAFs) and accelerated filers (AFs) that are not otherwise exempted] scope 1 and 2 GHG emissions.

The European Union Corporate Sustainability Reporting Directive (CSRD): On January 5th, 2023, the EU’s Corporate Sustainability Reporting Directive (CSRD) took effect, strengthening existing rules on social and environmental reporting \[including climate risks and impacts]. The rules will now apply to a broader set of companies, as well as non-EU companies generating over EUR 150 million on the EU market.

California Climate Corporate Data Accountability Act: On Oct. 7th, 2023. California Gov. Gavin Newsom signed into law California’s Climate Corporate Data Accountability Act, requiring corporations that do business in California, with annual revenues over $1 billion, to publicly disclose scope 1 and scope 2 GHG emissions beginning in 2026, and scope 3 emissions in 2027.

Despite a growing interest in measuring, disclosing, and reducing GHG emissions from corporations, regulators, and investors alike, companies are struggling to accurately measure and report emissions. In general, current quantification methodologies are flawed, GHG accounting standards leave significant room for error, access to quality data is low, and there is a prevailing lack of GHG accounting expertise. As a result, high-profile companies have been exposed for incorrect GHG inventories and worse, misleading claims on carbon performance. According to an article by Bloomberg, ‘Corporate Greenhouse Gas Data Doesn’t Always Add Up,’ “As companies rush to set climate goals, some aren’t even getting the basics quite right when it comes to accounting for greenhouse-gas emissions. According to researchers in Ireland, the U.K. and Germany, based on decade’s worth of corporate emissions data, “when the numbers were tallied, many didn’t add up. They found instances of errors, omissions and rounding issues (often down rather than up).”

The Guardian GHGP Corporate Policy offers a unique technical opportunity for companies to streamline, add robustness, and build trust and transparency into their GHG inventories. The policy allows users to dynamically add entities and assets to organizations and GHG sources to assets to build their inventories in alignment with their specific corporate and operational structures. MRV data can then be sourced by the Guardian automatically (e.g., via API, IoT-enabled devices, etc.) or provided manually depending on the user’s level of digitization. The inventory is further streamlined through Guardian policies with built in auto-calculation blocks, emission factors, and GWPs. The results of the inventory can be immutably and transparently verified by independent third parties. Finally, the emissions are tokenized to allow for enhanced tracking, transparency, accounting, and reporting, with the results and data structured in accordance with GHGP reporting requirements.

### Policy Workflow <a href="#toc146717950" id="toc146717950"></a>

<figure><img src="../../../.gitbook/assets/image (734).png" alt=""><figcaption></figcaption></figure>

### Policy Guide <a href="#toc146717951" id="toc146717951"></a>

This policy is published to Hedera network and can either be imported via Github (.policy file) or IPFS timestamp.

Latest Version - 1707206253.006698003

### Available Roles <a href="#toc146717952" id="toc146717952"></a>

**Registry** – The role responsible for publishing policies, creating tokens, and issuing CETs to organizations in accordance with the policy and methodology.

**Organization** – Company or other organization generating, quantifying, and reporting GHG emissions. The organization also provides MRV data and receives CETs.

**VVB (Validation & Verification Body)** – Independent third party who audits organization’s critical documentation, MRV data and sources, and GHG inventories. Verification is optional for this policy as it is (as of this writing) optional under the GHGP Corporate Standard. The workflow steps involving the VVBs will not block the subsequent steps or the minting of CETs, therefore they can be 1) executed according to the workflow above, 2) skipped, or 3) executed later in the workflow.

### Important Documents & Schemas <a href="#toc146717953" id="toc146717953"></a>

1. Organizational Profile – The company or organization creates a profile of key information, targets, and reporting metrics. Entities (such as business units, subsidiaries, etc.) are assigned to the company or organization.
2. Entity Schema – The company profiles with key information for each entity. Assets (such as facilities, vehicles, etc.) are assigned to entities. Together, the entities make up the corporate structure by which the inventory is based.
3. Asset Schema — Information on company assets provided by the organization and GHG sources (such grid electricity, fuel consumption, etc.) are assigned to assets.
4. Source Schema — Aggregated activity data (such electrical consumption, fuel consumption, etc.) which are used to auto-calculate GHG emissions.
5. Raw Data Schema — Raw activity data sourced manually or automatically from APIs or devices such as IoT-enabled electricity meters.
6. Reporting Metrics — Key metrics to support reporting in alignment with the GHGP Corporate Standard.
7. Product Carbon Footprint (PCF): Data fields outlined by the Pathfinder Framework v 2.0. The PCF is publishable and can be referenced by supply chain partners to support improved scope 3 calculations.

### Token (Carbon Emission) <a href="#toc146717954" id="toc146717954"></a>

Carbon Emission Token (CET) equivalent to 1 metric ton of CO2e emissions.

### Step by Step <a href="#toc146717955" id="toc146717955"></a>

### Organization Flow <a href="#toc146717956" id="toc146717956"></a>

The Organization is responsible for inputting key data and information and assigning entities, assets, GHG sources, and devices in alignment with their corporate and operational structure.

1\. Login into the service using credentials.

<figure><img src="../../../.gitbook/assets/image (227).png" alt="" width="255"><figcaption></figcaption></figure>

2. Choose role “Organization.”

<figure><img src="../../../.gitbook/assets/image (228).png" alt="" width="563"><figcaption></figcaption></figure>

3. Create Organization Profile and input all required and applicable fields.

<figure><img src="../../../.gitbook/assets/image (229).png" alt="" width="563"><figcaption></figcaption></figure>

4. Create an Entity Profile for each applicable corporate entity (e.g., subsidiaries, business units, etc.). It is often good practice to have the corporate structure of the GHG inventory aligned with the corporate structure reflected in financial reporting, if applicable.

<figure><img src="../../../.gitbook/assets/image (230).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (231).png" alt="" width="563"><figcaption></figcaption></figure>

5. If the company or organization has already set GHG reduction targets, add them here and input the required and applicable details. It is generally best practice to set targets in alignment with the Science Based Targets initiative (SBTi).

<figure><img src="../../../.gitbook/assets/image (232).png" alt="" width="563"><figcaption></figcaption></figure>

6. For each organizational entity, add all assets that generate emissions (e.g., facilities, fleet vehicles, etc.).

<figure><img src="../../../.gitbook/assets/image (233).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (234).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (235).png" alt="" width="563"><figcaption></figcaption></figure>

7. For each asset, add all applicable GHG sources and input the required and applicable fields. For example, common GHG sources for facilities are electricity, natural gas, and refrigerant consumption

<figure><img src="../../../.gitbook/assets/image (236).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (237).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (735).png" alt=""><figcaption></figcaption></figure>

8. For each GHG source, enter activity data such as electricity consumption (kWh) for facilities or distance traveled (miles) for vehicles. MRV data can be provided manually by the organization, or sourced automatically from APIs or verified monitoring devices such as IoT-enabled meters that are assigned to specific GHG sources. During this step, market-based instruments such as Renewable Energy Certificates (RECs) can be allocated to applicable GHG sources.

<figure><img src="../../../.gitbook/assets/image (238).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (239).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (240).png" alt="" width="563"><figcaption></figcaption></figure>

9. After all the applicable monitoring data is input for the reporting period, key reporting metrics will be automatically populated and can be viewed under the Reporting Metrics tab in the VC document.

<figure><img src="../../../.gitbook/assets/image (241).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (242).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (243).png" alt="" width="563"><figcaption></figcaption></figure>

10. Once the reporting metrics have been calculated, a VVB can be assigned, and the metrics can be submitted for verification. This step is currently optional.

<figure><img src="../../../.gitbook/assets/image (736).png" alt=""><figcaption></figcaption></figure>

11. If applicable, the organization can create and publish digital PCFs in alignment with the Pathfinder Framework v2.0. The PCF is based on all emissions attributed to a specific product/service IDs and made relative to the declared unit.

<figure><img src="../../../.gitbook/assets/image (737).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (738).png" alt=""><figcaption></figcaption></figure>

Supply chain partners can reference the PCF to support their scope 3 calculations.

<figure><img src="../../../.gitbook/assets/image (739).png" alt=""><figcaption></figcaption></figure>

12. Under the Token History tab, the user can view the Trust Chain, where all the collective VCs can be viewed.

<figure><img src="../../../.gitbook/assets/image (244).png" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (245).png" alt="" width="563"><figcaption></figcaption></figure>

### VVB Flow <a href="#toc146717957" id="toc146717957"></a>

1. Once the organization assigns a VVB, the VVB will be able to approve or reject MRV data and GHG sources. The VVB will also be able to approve or reject the GHG inventory reporting metrics after it’s calculated by the Guardian. These steps are optional and can be skipped or executed later in the workflow.

<figure><img src="../../../.gitbook/assets/image (740).png" alt=""><figcaption></figcaption></figure>

### Administrator (Registry) <a href="#toc146717958" id="toc146717958"></a>

1. After the organizational emissions have been calculated, the Registry will approve or reject the CET issuance request, and consequently issue CETs if approved.

<figure><img src="../../../.gitbook/assets/image (8) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### Futureproofing (Automated GHG Inventories) <a href="#toc146717959" id="toc146717959"></a>

In future iterations of the policy, GHG source schemas can be modulated, and new types of data sources can be added as necessary. In addition, new GHG source categories will be added, as well as an option to add custom source schemas and emission factors. These may be added to the Guardian policy in the form of policy modules.

The policy is designed to be dynamic, allowing organizations to assign entities to organizations, assets to entities, and GHG sources to assets in a hierarchical structure to dynamically tailor the inventory to specific corporate structures and operations. This aspect may also be modulated in future iterations of the policy.

GHGP v3 will include an optional tool to manage disclosures to the SEC in alignment with their Climate Disclosure Rules.
