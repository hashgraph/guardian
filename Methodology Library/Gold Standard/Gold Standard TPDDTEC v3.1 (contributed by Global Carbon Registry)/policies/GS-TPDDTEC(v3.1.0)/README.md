## Table of content
<!-- TOC -->

- [Table of content](#table-of-content)
- [Introduction](#introduction)
- [Demo Video](#demo-video)
- [Policy Workflow Through GCR platform](#policy-workflow-through-gcr-platform)
- [Policy Guide](#policy-guide)
  - [Available Roles](#available-roles)
  - [Important Documents \& Schemas](#important-documents--schemas)
  - [Carbon credit](#carbon-credit)
  - [Step By Step](#step-by-step)
    - [Project Proponent Flow](#project-developer-flow)
    - [VVB Flow](#vvb-flow)
    - [Registry(Global Climate Registry) Flow](#registryglobal-climate-registry-flow)
- [TODO](#todo)

<!-- /TOC -->

## Introduction

According to a report by [Gold Standard](https://www.goldstandard.org/our-story/sector-community-based-energy-efficiency), 1 in every 9 person on the planet has no access to safe, clean water for them or their families and almost one-third of the world is struggling with access to clean cooking technologies. As a result, most people are still reliant on wood or fossil fuel based cookstoves which will attribute to grave GHG emissions in the future. 

Improved cookstove projects account for 14 percent of projects on the Voluntary Carbon Market (VCM). These projects continue to be demanding due to their benefits, such as reduced deforestation, reduced fuel consumption etc. Safe Water project type is growing exponentially in popularity as they address issues like water scarcity, water pollution, and public health, making them appealing to both environmental and social impact-focused investors.

Gold Standard's Technologies and Practices to Displace Decentralized Thermal Energy Consumption (TPDDTEC v3.1.0)  methodology is applicable to programmes or activities introducing technologies and/or practices that reduce or displace greenhouse gas (GHG) emissions from the thermal energy consumption of households and non-domestic premises. Examples of these technologies include the introduction of improved biomass or fossil fuel cookstoves, ovens, dryers, space and water heaters (solar and otherwise), heat retention cookers, solar cookers, bio-digesters , safe water supply and treatment technologies that displace the boiling of water, thermal insulation in cold climates, etc. Examples of practices include the improved application of such technologies, a shift from non-renewable to renewable fuel (e.g. shift to plant oil fired stoves) , humidity control through improved storage and drying of fuels, etc.

Global Climate Registry (GCR) has built this Guardian Policy that tokenizes the carbon credits after verifying emissions reductions from improved cookstove projects according to Gold standard's TPDDTEC v3.1.0. GCR has digitised the calculation of the Baseline emissions for baseline scenario b in year y, Project emissions for project scenario p in year y, Leakage for project scenario p in year y and Emission reduction for total project activity in year y using formulas defined in the methodology. This Guardian policy, is a reflection of same methodology according to the [Gold standard's typical project lifecycle](https://academy.sustain-cert.com/wp-content/uploads/sites/3/2021/10/GS-Project-Cycle_15042021_Annyta.pdf).

## Demo Video

[Policy worklow demo on GCR](https://www.youtube.com/watch?v=GarMI-1Y-7s&t=528s&ab_channel=StellaZhou)

[Policy worflow on guardian](https://drive.google.com/file/d/1ijr1yanmhVgKagSTaCkMfj13niptvul1/view?usp=sharing)

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

1. Select the project developer role and submit the project developer application

    <img width="1583" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/3c5a4291-dcf4-4fda-9f92-e17f25ef5cc3">

    <img width="1559" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/1cf94a20-e813-4148-923f-c207c956f741">


2. The project developer can now submit a Project listing Application which is initial details about the project developer entity and the carbon offset project

    <img width="1459" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/bd9b082c-16a8-409a-98a3-fe752245fe02">

    <img width="827" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/f1f96a06-3ab6-44b4-bb44-eac3c8f1b16a">


3. Once project is listed, a detailed PDD(project design document) needs to be submitted. This is the most important document highlighting the technical details of project. It includes calculations around baseline, project and leakage scenarios for accurate calculation of avoided emissions. After submitting the PDD, project developer will assign desired VVB for review of this PDD who will then submit a Validation Report in response.

    <img width="1539" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/d32380e4-a40e-41af-b77f-a1b366e689b0">
    
    <img width="827" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/fecfff47-331f-41fd-b569-0018ddc0ebc4">


4. After VVB has approved the PDD and submitted a Validation Report, project developer will execute the project on ground and submit regular monitoring reports(MR)

    <img width="1573" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/0a4ab0c4-3cb9-4458-a1aa-1b4903a928d8">
    
    <img width="835" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/943cc5a9-c990-4475-bad1-716e2cde8396">

    <img width="1598" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/53b77da1-d12d-48d8-aa78-230681b8c9f2">


5. After VVB has approved the PDD and submitted a Validation Report. The credit minting request will be sent to the registry admin. Registry will review the Verification report and choose to mint the amount of credits suggested by the VVB or adjust the amount. Registry admin can also reject the request. Once approved by the registry, minted status will be shown and credits will be issued in the hedera account of the project developer



#### VVB Flow 

VVB is the external independent third party responsible for reviewing Project Design Documents and Monitoring reports submitted by proponents. They can comment and reject/request changes as well.

1. Select the VVB role and submit the Validator and Verification Body application

   <img width="672" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/1df2d7c5-b464-4d94-b996-6a51f46b2e96">
   
   <img width="1215" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/01c8903d-08b6-4a0f-93d9-98be6fdadad7">
   

2. Once VVB is created and project developer has assign VVB for PDD review, VVB can review and submit the Validation Report in response if PDD is approved

    <img width="1530" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/d2a3d039-4f94-4e90-8a0f-3068f65d7eca">

    <img width="836" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/3054107c-5511-42e3-a9e4-cf8ead0b5dc3">

    <img width="1551" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/7a961093-7a80-4010-9f32-c4fc8ee87bd6">


3. After PDD has been approved and  validation report has been sent by the VVB, project developer will submit monitoring reports and assign to the VVB for review. VVB can review and submit the Verification report in response of MR if approved. Verification Report will be sent to the project developer as well as the registry admin for review

    <img width="1598" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/03994271-eafd-4174-b2b1-bf2cf5d30f58">

    <img width="831" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/3490d8c2-0410-4f46-abb5-bcd3ff0967c1">

    <img width="1566" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/6a222184-23cf-4454-ad3c-23a9e3c34f31">



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

    

## Note
You can reach out to the policy [author/contributor](https://github.com/saharshkhicha18) for reviewing or reporting issues relevant to this specific policy.
