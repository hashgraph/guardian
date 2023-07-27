---
description: Policy developed by Gautam Prajapati during the SBS Hackathon
---

# ♨ GoldStandard - Metered Energy Cooking

### Table of content

* [Table of content](goldstandard-metered-energy-cooking.md#table-of-content)
* [Introduction](goldstandard-metered-energy-cooking.md#introduction)
* [Why ME\&ED(Metered and Measured Energy) Methodology?](broken-reference/)
* [Demo Video](broken-reference/)
* [Policy Workflow](broken-reference/)
* [Policy Guide](broken-reference/)
  * [Available Roles](broken-reference/)
  * [Important Documents & Schemas](broken-reference/)
  * [Token(Carbon credit)](broken-reference/)
  * [Step By Step](broken-reference/)
    * [Registry(Gold Standard) Flow](broken-reference/)
    * [Project Proponent Flow](broken-reference/)
    * [VVB Flow](broken-reference/)
* [Futureproofing(Automated credit issuance)](broken-reference/)
* [TODO](broken-reference/)
* [Existing Cookstove Policy Comparison](broken-reference/)

### Introduction

According to [Gold Standard](https://www.goldstandard.org/our-story/sector-community-based-energy-efficiency) more than 3 billion people lack access to clean cooking solutions leading to over 4 million premature deaths each year. This doesn't attribute the havoc GHG emissions from wood or fossil fuel based cookstoves are going to cause in the future.

According to the 2021 State of the Voluntary Carbon Markets report by Ecosystem Marketplace, improved cookstoves were the second most popular project type in the voluntary carbon market in 2020, accounting for 13% of all carbon offsets transacted. In 2020, cookstove projects generated over 13 million carbon offsets, with an estimated value of $48.6 million USD. The report notes that cookstove projects continue to be popular due to their multiple co-benefits, including improved health outcomes, reduced fuel consumption, and reduced deforestation.

This Guardian Policy tokenizes the VER(verified emission reduction) after verifying emissions reductions from improved cookstove projects according to Gold standard's methodology for Metered & Measured Energy Cooking Devices (ME\&ED). The methodology is based on the use of energy meters and temperature sensors to collect data on the energy consumption and thermal efficiency of cookstoves, which is then used to calculate the emissions reductions achieved.

### Why ME\&ED(Metered and Measured Energy) Methodology?

Carbon offsets from improved cookstove projects help advance Sustainable Development Goals 13 (climate), 7 (energy), 5 (gender), and 3 (health). However, for the carbon offsets generated from these projects to be considered legitimate, methodologies must provide accurate or conservative measurements of the climate impact of these projects.

Recently, a striking [report](https://www.theguardian.com/environment/2023/jan/18/revealed-forest-carbon-offsets-biggest-provider-worthless-verra-aoe) by The Guardian (media group) exposed the flaws in Verra's REDD+ scheme leading them to [phase out](https://www.theguardian.com/environment/2023/mar/10/biggest-carbon-credit-certifier-replace-rainforest-offsets-scheme-verra-aoe) their methodologies. Such exposures dwindle the stakeholder's sentiment in the carbon markets and hence it is extremely important to build and choose right methodology for carbon projects.

There are a bunch of improved cookstove methodologies to choose from -

* [GS-TPDDTEC](https://globalgoals.goldstandard.org/407-ee-ics-technologies-and-practices-to-displace-decentrilized-thermal-energy-tpddtec-consumption/)
* [GS-Simplified](https://globalgoals.goldstandard.org/408-ee-ics-simplified-methodology-for-efficient-cookstoves/)
* [CDM-AMS-II-G](https://cdm.unfccc.int/methodologies/DB/GNFWB3Y6GM4WPXFRR2SXKS9XR908IO)
* [CDM-AMS-I-E](https://cdm.unfccc.int/methodologies/DB/JB9J7XDIJ3298CLGZ1279ZMB2Y4NPQ)
* [GS-Metered-Energy](https://globalgoals.goldstandard.org/news-methodology-for-metered-measured-energy-cooking-devices/)

According to a new [research](https://assets.researchsquare.com/files/rs-2606020/v1/c2e6a772-b013-49f9-9fc4-8d7d82d4bebc.pdf?c=1678869691) from scholars of University of California, Berkeley - Gold Standard’s Metered and Measured methodology, which directly monitors fuel use, is most aligned with the estimates (only 1.3 times over-credited) and is best suited for fuel switching projects which provide the most abatement potential and health benefit.

This approach is more precise than traditional methodologies, which rely on more generalized assumptions or estimates to calculate emissions reductions. It also places a strong emphasis on stakeholder engagement and the inclusion of local communities in the project development and monitoring process. This approach promotes greater transparency and accountability and helps to ensure that the environmental and social benefits of the project are maximized. This Guardian policy, is a reflection of same methodology according to the [Gold standard's typical project lifecycle](https://academy.sustain-cert.com/wp-content/uploads/sites/3/2021/10/GS-Project-Cycle\_15042021\_Annyta.pdf).

### Demo Video

[Youtube](https://youtu.be/nOQpLmbW0hA)

### Policy Workflow

<figure><img src="../../../.gitbook/assets/image (12) (4).png" alt=""><figcaption></figcaption></figure>

### Policy Guide

This policy is published to Hedera network and can either be imported via Github(.policy file) or IPSF timestamp.

Latest Version - 0.0.3 Hedera Topic - [0.0.3972127](https://explore.lworks.io/testnet/topics/0.0.3972127)

#### Available Roles

* Project Proponent - Project developer who proposes and executes cookstove project and receives credits(VER)
* VVB(Validation & Verification Body) - Independent third party who audits project's critical documentation and monitoring reports
* Gold Standard(GS) - GS is the trusted registry overseeing the entire project cycle and issuing the credits(VER)

#### Important Documents & Schemas

1. Registry Account Application(RAA) - Account applications to become a project proponent, VVB with registry
2. Project Inception Document (PID) - Preliminary design of project highlighting eligibility, additionality and methodology criteria along with stakeholder consultation report
3. Project Design Document (PDD) - Submitted after PID is approved, detailed report on project execution, emissions calculations and sustainable development goals.
4. Monitoring Report (MR) - Monitoring report contains analysis on cookstove usages on the sample group and estimates carbon avoided/reduced
5. VER Credit Request(VCR) - Requesting specified number of credits into Hedera account
6. Measuring Device - Registering a stove usage IOT device alongside the cookstove for automatic MRs
7. VER Auto Credit Request(VACR) - Requesting automated issuance of credits based on data sent by a measuring device

#### Token(Carbon credit)

Verified Emission Reduction(VER) equivalent to 1 ton of CO2 offset

#### Step By Step

**Registry(Gold Standard) Flow**

Registry is allowed to publish and edit policy config, schemas, tokens and all the workflow logic associated with it. They are responsible for approving projects, project proponents, VVBs, and credit issue requests.

1. Login into the service using registry credentials

<figure><img src="../../../.gitbook/assets/image (26).png" alt=""><figcaption></figcaption></figure>

2. Feel free to play around with policy config by clicking on edit icon and understanding the different schemas used by policy

<figure><img src="../../../.gitbook/assets/image (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (51) (2).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (29).png" alt=""><figcaption></figcaption></figure>

3. Registry can review account applications by clicking manage accounts

<figure><img src="../../../.gitbook/assets/image (63).png" alt=""><figcaption></figcaption></figure>

4. Registry can review project inception documents allowing the listing of projects on standard website and trigger project execution on ground.

<figure><img src="../../../.gitbook/assets/image (9) (3).png" alt=""><figcaption></figcaption></figure>

5. Once PDD and MR are approved by VVB, project proponents can submit credit issue requests(VER) which registries have to take decisions on.

<figure><img src="../../../.gitbook/assets/image (17) (2).png" alt=""><figcaption></figcaption></figure>

6. Once VER issue request is approved, an end-to-end trust chain can be viewed by administrator. Since everything is happening transparently on public ledger(Hedera), anyone can trace the source of credits and each step that happened in the process.

<figure><img src="../../../.gitbook/assets/image (28).png" alt=""><figcaption></figcaption></figure>

**Project Proponent Flow**

1. Complete the sign up form(RAA) to become a project proponent

<figure><img src="../../../.gitbook/assets/image (44).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (40).png" alt=""><figcaption></figcaption></figure>

2. Wait till the application is approved by the registry admin. Once approved, proponents will be able to submit project inception documents. This includes stakeholder consultation report as well.

<figure><img src="../../../.gitbook/assets/image (38).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (13) (1) (1).png" alt=""><figcaption></figcaption></figure>

3. Once project is approved by registry, a detailed PDD(project design document) needs to be submitted. This is the most important document highlighting the technical details of project. It includes calculations around baseline, project and leakage scenarios for accurate calculation of avoided emissions.

<figure><img src="../../../.gitbook/assets/image (19).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (50).png" alt=""><figcaption></figcaption></figure>

4. After PDD approval, project proponent will execute the project on ground and submit regular monitoring reports(MR)

<figure><img src="../../../.gitbook/assets/image (22).png" alt=""><figcaption></figcaption></figure>

5. Once a monitoring report is approved by VVB, project proponent can request corresponding carbon credits(VER in this case) to be credited in their account. It would need a VC document ID for both monitoring report and it's approved review by VVB.

<figure><img src="../../../.gitbook/assets/image (18).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (53).png" alt=""><figcaption></figcaption></figure>

6. Once registry reviews and approves the credit request, they'll be credited into the hedera account provided by project proponent. This is represented by successful minted status.

<figure><img src="../../../.gitbook/assets/image (4) (1).png" alt=""><figcaption></figcaption></figure>

**VVB Flow**

VVB is the external independent third party responsible for reviewing Project Design Documents and Monitoring reports submitted by proponents. They can comment and reject/request changes as well.

1. After logging in as VVB, they can view review requests related to project documents. First step is to review PDDs submitted by project proponents.

<figure><img src="../../../.gitbook/assets/image (61).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (10).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (46).png" alt=""><figcaption></figcaption></figure>

2. After PDD approval, proponents will be able to send monitoring reports for review. Once approved, project proponents will be able to claim corresponding VERs.

<figure><img src="../../../.gitbook/assets/image (24).png" alt=""><figcaption></figcaption></figure>

### Future proofing(Automated credit issuance)

This workflow includes a bonus flow which is a major distinction from other existing policies. Building monitoring reports for cookstove projects is a very manual and error-prone process due to distributed nature of project. Often, a sample group of households are selected to be monitored and results are extrapolated for all the households(in thousands) leading to overcrediting. Since this methodology focuses on having direct measurement devices associated with a stove, an automated way of monitoring is possible.

<figure><img src="../../../.gitbook/assets/image (223).png" alt=""><figcaption></figcaption></figure>

1. Project proponent can register a measuring device associated a given cookstove

<figure><img src="../../../.gitbook/assets/image (47) (2).png" alt=""><figcaption></figcaption></figure>

2. Device can be approved/rejected by the VVB

<figure><img src="../../../.gitbook/assets/image (41).png" alt=""><figcaption></figcaption></figure>

3. Once approved, project developer can raise on-demand credit issuance associated with approved devices. These requests would contain stove fuel usage and temperature data collected automatically by the device

<figure><img src="../../../.gitbook/assets/image (6) (5).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (5) (1) (4).png" alt=""><figcaption></figcaption></figure>

4. After an approval from VVB for the automated monitoring report, VER mint will be initiated in owner account. This will help in faster crediting cycles along with a transparent process for tracking all the intermediate steps. It'll be a huge boost to scaling up the supply of credits in VCM(Voluntary carbon markets).

### TODO

This policy was created during a hackathon so there may be couple of bugs here and there and it may not be foolproof. Here are some todos to make it production ready. You can reach out to the policy [author/contributor](https://github.com/gautamp8) for reviewing or reporting issues relevant to this specific policy.

\[ ] Improve and document list column names for each of the roles, some review IDs are coming as null \[ ] Improve all the schemas(especially PID, PDD). Add support for dynamically selecting fields on basis of fossil fuel or electric device \[ ] Automate emissions calculations on basis of incoming parameters of equations from schemas \[ ] Add Guardian support for list data type in schemas. Helpful for use cases where we're sending device usage data regularly via an API\
\[ ] Thoroughly test and improve the future proofing IOT device workflow, there are dummy checks and thresholds currently. Schemas need to be updated to accept list of usage parameters.

### Existing Cookstove Policy Comparison

Latest version of Guardian provides a policy for [improved cookstoves](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/improved-cookstove). This new Guardian policy builds on top of it to make it more robust, aligned and future-proof. [Here's a section in demo video](https://youtu.be/nOQpLmbW0hA?t=1318) on differences using policy compare feature provided by Guardian.

| Features                                                                                                                                                          | ME & ED                  | Improved Cookstove   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | -------------------- |
| Follows VCM industry project cycle and terminologies(Verra, Gold Standard)                                                                                        | Yes                      | No                   |
| Substantial over crediting possible                                                                                                                               | No                       | Yes                  |
| Critical metrics tracked directly in VC document - Additionality criteria \| Baseline emissions calculation \| Project emissions calculation \| Leakage emissions | Yes \| Yes \| Yes \| Yes | No \| No \| No \| No |
| IOT based monitoring & automated credit issuance                                                                                                                  | Yes                      | No                   |
| Scalable according to future credits demand                                                                                                                       | Yes                      | No                   |
| Exhaustive documentation                                                                                                                                          | Yes                      | No(incomplete)       |
