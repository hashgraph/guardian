## Table of content
<!-- TOC -->

- [Table of content](#table-of-content)
- [Introduction](#introduction)
- [Why ME\&ED(Metered and Measured Energy) Methodology?](#why-meedmetered-and-measured-energy-methodology)
- [Policy Workflow](#policy-workflow)
- [Policy Guide](#policy-guide)
  - [Available Roles](#available-roles)
  - [Important Documents \& Schemas](#important-documents--schemas)
  - [Token(Carbon credit)](#tokencarbon-credit)
  - [Step By Step](#step-by-step)
    - [Registry(Gold Standard) Flow](#registrygold-standard-flow)
    - [Project Proponent Flow](#project-proponent-flow)
    - [VVB Flow](#vvb-flow)
- [Futureproofing(Automated credit issuance)](#futureproofingautomated-credit-issuance)

<!-- /TOC -->

## Introduction

According to [Gold Standard](https://www.goldstandard.org/our-story/sector-community-based-energy-efficiency) more than 3 billion people lack access to clean cooking solutions leading to over 4 million premature deaths each year. This doesn't attribute the havoc GHG emissions from wood or fossil fuel based cookstoves are going to cause in the future.

According to the 2021 State of the Voluntary Carbon Markets report by Ecosystem Marketplace, improved cookstoves were the second most popular project type in the voluntary carbon market in 2020, accounting for 13% of all carbon offsets transacted. In 2020, cookstove projects generated over 13 million carbon offsets, with an estimated value of $48.6 million USD. The report notes that cookstove projects continue to be popular due to their multiple co-benefits, including improved health outcomes, reduced fuel consumption, and reduced deforestation.

This Guardian Policy tokenizes the VER(verified emission reduction) after verifying emissions reductions from improved cookstove projects according to Gold standard's methodology for Metered & Measured Energy Cooking Devices (ME&ED). The methodology is based on the use of energy meters and temperature sensors to collect data on the energy consumption and thermal efficiency of cookstoves, which is then used to calculate the emissions reductions achieved.

## Why ME&ED(Metered and Measured Energy) Methodology?

Carbon offsets from improved cookstove projects help advance Sustainable Development Goals 13 (climate), 7 (energy), 5 (gender), and 3 (health). However, for the carbon offsets generated from these projects to be considered legitimate, methodologies must provide accurate or conservative measurements of the climate impact of these projects.

Recently, a striking [report](https://www.theguardian.com/environment/2023/jan/18/revealed-forest-carbon-offsets-biggest-provider-worthless-verra-aoe) by The Guardian (media group) exposed the flaws in Verra's REDD+ scheme leading them to [phase out](https://www.theguardian.com/environment/2023/mar/10/biggest-carbon-credit-certifier-replace-rainforest-offsets-scheme-verra-aoe) their methodologies. Such exposures dwindle the stakeholder's sentiment in the carbon markets and hence it is extremely important to build and choose right methodology for carbon projects.

There are a bunch of improved cookstove methodologies to choose from - 
- [GS-TPDDTEC](https://globalgoals.goldstandard.org/407-ee-ics-technologies-and-practices-to-displace-decentrilized-thermal-energy-tpddtec-consumption/)
- [GS-Simplified](https://globalgoals.goldstandard.org/408-ee-ics-simplified-methodology-for-efficient-cookstoves/)
- [CDM-AMS-II-G](https://cdm.unfccc.int/methodologies/DB/GNFWB3Y6GM4WPXFRR2SXKS9XR908IO)
- [CDM-AMS-I-E](https://cdm.unfccc.int/methodologies/DB/JB9J7XDIJ3298CLGZ1279ZMB2Y4NPQ)
- [GS-Metered-Energy](https://globalgoals.goldstandard.org/news-methodology-for-metered-measured-energy-cooking-devices/)

According to a new [research](https://assets.researchsquare.com/files/rs-2606020/v1/c2e6a772-b013-49f9-9fc4-8d7d82d4bebc.pdf?c=1678869691) from scholars of University of California, Berkeley - Gold Standard’s Metered and Measured methodology, which directly monitors fuel use, is most aligned with the estimates (only 1.3 times over-credited) and is best suited for fuel switching projects which provide the most abatement potential and health benefit.

This approach is more precise than traditional methodologies, which rely on more generalized assumptions or estimates to calculate emissions reductions. It also places a strong emphasis on stakeholder engagement and the inclusion of local communities in the project development and monitoring process. This approach promotes greater transparency and accountability and helps to ensure that the environmental and social benefits of the project are maximized. This Guardian policy, is a reflection of same methodology according to the [Gold standard's typical project lifecycle](https://academy.sustain-cert.com/wp-content/uploads/sites/3/2021/10/GS-Project-Cycle_15042021_Annyta.pdf).

## Policy Workflow
  
 <img width="1128" alt="image" src="https://user-images.githubusercontent.com/9518151/229273768-9fdd71c9-8bf6-41e8-b6ee-f494145fe0e5.png">

## Policy Guide

This policy is published to Hedera network and can either be imported via Github(.policy file) or IPSF timestamp.

<img width="1153" alt="image" src="https://user-images.githubusercontent.com/9518151/229278890-83b3b4b3-2c4b-45f5-8231-b02db2c2dd04.png">


### Available Roles 
 
  - Project Proponent - Project developer who proposes and executes cookstove project and receives credits(VER)
  - VVB(Validation & Verification Body) - Independent third party who audits project's critical documentation and monitoring reports
  - Gold Standard(GS) - GS is the trusted registry overseeing the entire project cycle and issuing the credits(VER)
  
### Important Documents & Schemas 
  
  1. Registry Account Application(RAA) - Account applications to become a project proponent, VVB with registry
  2. Project Inception Document (PID) - Preliminary design of project highlighting eligibility, additionality and methodology criteria along with stakeholder consultation report
  3. Project Design Document (PDD) - Submitted after PID is approved, detailed report on project execution, emissions calculations and sustainable development goals.
  4. Monitoring Report (MR) - Monitoring report contains analysis on cookstove usages on the sample group and estimates carbon avoided/reduced
  5. VER Credit Request(VCR) - Requesting specified number of credits into Hedera account
  6. Measuring Device - Registering a stove usage IOT device alongside the cookstove for automatic MRs
  7. VER Auto Credit Request(VACR) - Requesting automated issuance of credits based on data sent by a measuring device
  
### Token(Carbon credit) 
  Verified Emission Reduction(VER) equivalent to 1 ton of CO2 offset

### Step By Step 

#### Registry(Gold Standard) Flow 

Registry is allowed to publish and edit policy config, schemas, tokens and all the workflow logic associated with it. They are responsible for approving projects, project proponents, VVBs, and credit issue requests. 

1. Login into the service using registry credentials
    
    <img width="283" alt="image" src="https://user-images.githubusercontent.com/9518151/229285668-64f001c6-ded7-44f1-a55f-6a7b12a4e03f.png">
 
2. Feel free to play around with policy config by clicking on edit icon and understanding the differnt schemas used by policy
    
    <img width="1496" alt="edit policy" src="https://user-images.githubusercontent.com/9518151/229285942-edf2c3da-9d9e-44f4-a5d1-afeb326f3439.png">

    <img width="1496" alt="Schemas" src="https://user-images.githubusercontent.com/9518151/229286563-538144a0-bceb-47a1-994c-ee982ff1b394.png">

    <img width="1496" alt="Policy edit shot" src="https://user-images.githubusercontent.com/9518151/229285908-9f93f896-cb7f-4030-bdb5-deac5c018a3c.png">

3. Registry can review account applications by clicking manage accounts

    <img width="1496" alt="Screenshot 2023-04-01 at 5 04 16 PM" src="https://user-images.githubusercontent.com/9518151/229286362-522dc0f2-bc9b-44b7-83b6-f139c5857936.png">

4. Registry can review project inception documents allowing the listing of projects on standard website and trigger project execution on ground.

    <img width="1496" alt="image" src="https://user-images.githubusercontent.com/9518151/229287139-4717b23f-7c46-408e-8ed6-7af4405046f8.png">

5. Once PDD and MR are approved by VVB, project proponents can submit credit issue requests(VER) which registries have to take decisions on.

    <img width="1493" alt="Screenshot 2023-04-01 at 6 29 07 PM" src="https://user-images.githubusercontent.com/9518151/229294747-90409e66-2f9a-442d-a29d-3b49213e12d7.png">
    
6. Once VER issue request is approved, an end-to-end trust chain can be viewed by administrator. Since everything is happening transparently on public ledger(Hedera), anyone can trace the source of credits and each step that happened in the process.

    ![trustchain](https://user-images.githubusercontent.com/9518151/229289672-6e33a6b4-af1d-427a-b742-ba68a6a9e162.png)


#### Project Proponent Flow 

1. Complete the sign up form(RAA) to become a project proponent

    <img width="1496" alt="Screenshot 2023-04-01 at 5 03 05 PM" src="https://user-images.githubusercontent.com/9518151/229286448-be20689e-d66a-4adb-ad1f-c92e3fdeb16b.png">

    <img width="1496" alt="Screenshot 2023-03-26 at 9 04 01 PM" src="https://user-images.githubusercontent.com/9518151/229286617-7bffb63d-7b2b-4cba-8eb8-f5f0ae45da07.png">

2. Wait till the application is approved by the registry admin. Once approved, proponents will be able to submit project inception documents. This includes stakeholder consultation report as well.

    <img width="1496" alt="image" src="https://user-images.githubusercontent.com/9518151/229286814-f3b4ef4c-5948-476a-b792-4d31a828c893.png">

    <img width="663" alt="image" src="https://user-images.githubusercontent.com/9518151/229286942-5caf58f7-6331-453a-828e-257ee26f3961.png">

3. Once project is approved by registry, a detailed PDD(project design document) needs to be submitted. This is the most important document highlighting the technical details of project. It includes calculations around baseline, project and leakage scenarios for accurate calculation of avoided emissions. 

    <img width="1496" alt="image" src="https://user-images.githubusercontent.com/9518151/229287218-9bd53183-29c1-4ea9-9491-2db549f85eb3.png">
    
    <img width="710" alt="image" src="https://user-images.githubusercontent.com/9518151/229289284-3da025d3-16c0-4bce-b2c8-24e2dae472e3.png">

4. After PDD approval, project proponent will execute the project on ground and submit regular monitoring reports(MR)

    <img width="1387" alt="image" src="https://user-images.githubusercontent.com/9518151/229289434-f0181be6-b718-4e76-9d70-509074df547c.png">

5. Once a monitoring report is approved by VVB, project proponent can request corresponding carbon credits(VER in this case) to be credited in their account. It would need a VC document ID for both monitoring report and it's approved review by VVB.

    <img width="1391" alt="image" src="https://user-images.githubusercontent.com/9518151/229290181-ba076abf-7e34-4eb5-aca3-f748f6b4b427.png">

    <img width="582" alt="image" src="https://user-images.githubusercontent.com/9518151/229290262-c8087ed3-263b-4adc-b12f-9e06d2527a23.png">

6. Once registry reviews and approves the credit request, they'll be credited into the hedera account provided by project proponent. This is represented by successful minted status.

    <img width="1496" alt="image" src="https://user-images.githubusercontent.com/9518151/229290452-b6346557-4cb6-44dc-a653-43a6b8a0786a.png">


#### VVB Flow 

VVB is the external independent third party responsible for reviewing Project Design Documents and Monitoring reports submitted by proponents. They can comment and reject/request changes as well.

1. After logging in as VVB, they can view review requests related to project documents. First step is to review PDDs submitted by project proponents.

    <img width="1496" alt="Screenshot 2023-04-01 at 6 20 50 PM" src="https://user-images.githubusercontent.com/9518151/229294451-cbaa1e7a-9796-410f-9a1f-9e6ec002e8e9.png">

    <img width="575" alt="Screenshot 2023-04-01 at 6 21 49 PM" src="https://user-images.githubusercontent.com/9518151/229294461-25425f99-a316-4e8e-bcaa-1630f7c57120.png">

    <img width="578" alt="Screenshot 2023-04-01 at 6 22 34 PM" src="https://user-images.githubusercontent.com/9518151/229294467-1e9b061d-6a22-4007-bf76-2bc80b962c29.png">

2. After PDD approval, proponents will be able to send monitoring reports for review. Once approved, project proponents will be able to claim corresponding VERs.

    <img width="1496" alt="Screenshot 2023-04-01 at 6 24 00 PM" src="https://user-images.githubusercontent.com/9518151/229294542-6359707e-b6aa-4c4c-b5b5-c5a71ae14b88.png">


## Futureproofing(Automated credit issuance)

This workflow includes a bonus flow which is a major distinction from other existing policies. Building monitoring reports for cookstove projects is a very manual and error-prone process due to distributed nature of project. Often, a sample group of households are selected to be monitored and results are extrapolated for all the households(in thousands) leading to overcrediting. Since this methodology focuses on having direct measurement devices associated with a stove, an automated way of monitoring is possible.

1. Project proponent can register a measuring device associated a given cookstove

   <img width="1494" alt="image" src="https://user-images.githubusercontent.com/9518151/229299395-692e4b41-fc17-456d-8e1e-89c1b1a1cd07.png">

2. Device can be approved/rejected by the VVB

   <img width="1496" alt="image" src="https://user-images.githubusercontent.com/9518151/229299474-2b4aa6ff-c83c-417f-a1d0-a15a59b73d96.png">

3. Once approved, project developer can raise on-demand credit issuance associated with approved devices. These requests would contain stove fuel usage and temperature data collected automatically by the device

   <img width="574" alt="image" src="https://user-images.githubusercontent.com/9518151/229299617-bef5ae45-7a60-4bd8-9414-920050669eb2.png">

   <img width="578" alt="image" src="https://user-images.githubusercontent.com/9518151/229299665-623d859b-1ba9-401c-8f4a-70543e1a6316.png">

4. After an approval from VVB for the automated monitoring report, VER mint will be initiated in owner account. This will help in faster crediting cycles along with a transparent process for tracking all the intermediate steps. It'll be a huge boost to scaling up the supply of credits in VCM(Voluntary carbon markets).


Implementation is just a generic project cycle which doesn't capture critical flows

