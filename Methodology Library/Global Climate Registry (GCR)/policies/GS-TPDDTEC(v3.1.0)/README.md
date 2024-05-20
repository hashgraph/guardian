## Table of content
<!-- TOC -->

- [Table of content](#table-of-content)
- [Introduction](#introduction)
- [Demo Video](#demo-video)
- [Policy Workflow](#policy-workflow)
- [Policy Guide](#policy-guide)
  - [Available Roles](#available-roles)
  - [Important Documents \& Schemas](#important-documents--schemas)
  - [Carbon credit](#tokencarbon-credit)
  - [Step By Step](#step-by-step)
    - [Project Proponent Flow](#project-proponent-flow)
    - [VVB Flow](#vvb-flow)
    - [Registry(GCR) Flow](#registrygold-standard-flow)
- [TODO](#todo)

<!-- /TOC -->

## Introduction

According to a report by [Gold Standard](https://www.goldstandard.org/our-story/sector-community-based-energy-efficiency), 1 in every 9 person on the planet has no access to safe, clean water for them or their families and almost one-third of the world is struggling with access to clean cooking technologies. As a result, most people are still reliant on wood or fossil fuel based cookstoves which will attribute to grave GHG emissions in the future. 

Improved cookstove projects account for 14 percent of projects on the Voluntary Carbon Market (VCM). These projects continue to be demanding due to their benefits, such as reduced deforestation, reduced fuel consumption etc. Safe Water project type is growing exponentially in popularity as they address issues like water scarcity, water pollution, and public health, making them appealing to both environmental and social impact-focused investors.

Gold Standard's Technologies and Practices to Displace Decentralized Thermal Energy Consumption (TPDDTEC v3.1.0)  methodology is applicable to programmes or activities introducing technologies and/or practices that reduce or displace greenhouse gas (GHG) emissions from the thermal energy consumption of households and non-domestic premises. Examples of these technologies include the introduction of improved biomass or fossil fuel cookstoves, ovens, dryers, space and water heaters (solar and otherwise), heat retention cookers, solar cookers, bio-digesters , safe water supply and treatment technologies that displace the boiling of water, thermal insulation in cold climates, etc. Examples of practices include the improved application of such technologies, a shift from non-renewable to renewable fuel (e.g. shift to plant oil fired stoves) , humidity control through improved storage and drying of fuels, etc.

Global Climate Registry (GCR) has built this Guardian Policy that tokenizes the carbon credits after verifying emissions reductions from improved cookstove projects according to Gold standard's TPDDTEC v3.1.0. GCR has digitised the calculation of the Baseline emissions for baseline scenario b in year y, Project emissions for project scenario p in year y, Leakage for project scenario p in year y and Emission reduction for total project activity in year y using formulas defined in the methodology. This Guardian policy, is a reflection of same methodology according to the [Gold standard's typical project lifecycle](https://academy.sustain-cert.com/wp-content/uploads/sites/3/2021/10/GS-Project-Cycle_15042021_Annyta.pdf).

## Demo Video

[Youtube](https://youtu.be/nOQpLmbW0hA)

## Policy Workflow Through GCR Platform

<img width="1232" alt="TPDDTEC guardian policy workflow on GCR platform" src="https://github.com/saharshkhicha18/guardian/assets/71884962/aeb7e479-a5a2-4d1c-9f61-9d64cedd89d5">

## Policy Guide

This policy is published to Hedera network and can either be imported via Github(.policy file) or IPSF timestamp.

Hedera Topic (testnet) - [0.0.4234489](https://explore.lworks.io/testnet/topics/0.0.4234489)

### Available Roles 
 
  - Project Developer - Project developer who proposes and executes carbon offset project relevent to the methodology and receives credits
  - Validation & Verification Body(VVB) - Independent third party who audits project's critical documentation and monitoring reports and submits validation and verification reports before issuance of the credits
  - Global Climate Registry(GCR) - GCR is the trusted registry overseeing the entire project design, development and execution cycle and issuing the credits.
  
### Important Documents & Schemas 
  
  1. Project Developer Application (PDA) - Application submitted by the Project Developer Entity with basic information about the developer.
  2. Validation & Verification Body Application (VVBA) - Application submitted by the VVB Entity with basic information about the VVB.
  3. Project Listing Application (PLA) - Preliminary design of project highlighting eligibility, additionality and methodology criteria along with stakeholder consultation report
  4. Project Design Document (PDD) - Submitted after PID is approved, detailed report on project execution, emissions calculations and sustainable development goals.
  5. Validation Report - Report submitted by the VVB after the review of the PDD submitted by the project developer
  6. Monitoring Report (MR) - Monitoring report contains analysis on usages on the sample group and estimates carbon avoided/reduced
  7. Verification Report - Report submitted by the VVB after the review of the MR submitted by the project developer.
  8. Submit Mint - Requesting specified number of credits into Hedera account of the project developer. This step is done by the registry

### Policy Calculations

Formulas have been incorporated in the methodology in order to calculate baseline emissions, project emissions, leakages and total emission reduction of the project in tons. The calculations are to calculate the estimated emission reductions for Project Design Document and actual emission reductions of the project for Monitoring report. (In order for the calculations to be done automatically, the formulas have been incorporated on Global Climate Registry platform)
  
  <img width="1583" alt="calculations" src="https://github.com/saharshkhicha18/guardian/assets/71884962/44f44deb-5563-45a1-8ee2-98aa39e569ea">

  
### Carbon credit
  Carbon credits issued will be a Non-fungible token with 1 NFT equivalent to 1 ton of CO2 offset

  [Example of a minted 1 ton credit NFT](https://explore.lworks.io/testnet/tokens/0.0.4318457/nfts/1)

### Step By Step 


#### Project Developer Flow 

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


#### Registry(Global Climate Registry) Flow 

Registry is allowed to publish and edit policy config, schemas, tokens and all the workflow logic associated with it. They are responsible for approving projects, project proponents, VVBs, and credit issue requests. 

1. Login into the service using registry credentials.
    
    <img width="259" alt="Registry Account" src="https://github.com/saharshkhicha18/guardian/assets/71884962/5f9d4ac8-8bd6-4f9b-aa30-407182b906a1">

 
2. Policy Configuration, Schemas and Token
    
    <img width="1908" alt="edit policy" src="https://github.com/saharshkhicha18/guardian/assets/71884962/245dd2df-0e9e-42be-a30f-4b8860b45267">

    <img width="1581" alt="Schemas" src="https://github.com/saharshkhicha18/guardian/assets/71884962/70f16a12-d888-4371-b0a9-546cae716e32">

    <img width="697" alt="token" src="https://github.com/saharshkhicha18/guardian/assets/71884962/038b7261-3463-409e-ac60-849309bb03b2">


5. Once PDD and MR are approved by VVB and VVB has submitted Validation report and Verification report, Registry can review the documents and decide on the amount of credits to be issued/minted to project developer account

   Review Verification Report
   
   <img width="819" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/5ba29a06-f341-4570-b9df-a819e08afed5">

   Minting carbon credits
   
    <img width="1508" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/e49a9de7-fdfd-43aa-9fbd-aeacccf54be2">

    
7. Once carbon credits are minted to project developer account, an end-to-end trust chain can be viewed by the admin. Since everything is happening transparently on public ledger(Hedera), anyone can trace the source of credits and each step that happened in the process.

   Trust Chain

    <img width="1619" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/feb4d35f-abb3-4d01-9972-38ffdb34dda6">

    

## TODO
This policy was created during a hackathon so there may be couple of bugs here and there and it may not be foolproof. Here are some todos to make it production ready. You can reach out to the policy [author/contributor](https://github.com/saharshkhicha18) for reviewing or reporting issues relevant to this specific policy.

[ ] Improve and document list column names for each of the roles, some review IDs are coming as null
[ ] Improve all the schemas(especially PID, PDD). Add support for dynamically selecting fields on basis of fossil fuel or electric device
[ ] Automate emissions calculations on basis of incoming parameters of equations from schemas
[ ] Add Guardian support for list data type in schemas. Helpful for usecases where we're sending device usage data regularly via an API   
[ ] Thoroughly test and improve the futureproofing IOT device workflow, there are dummy checks and thresholds currently. Schemas need to be updated to accept list of usage parameters.
