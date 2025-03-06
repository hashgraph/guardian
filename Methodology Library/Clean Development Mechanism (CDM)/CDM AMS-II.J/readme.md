## Table of content
<!-- TOC -->

- Introduction
- Need and Use for the AMS-II.J policy
- Objective and Scope
- Methodology Overview
- Tools Referenced
- Typical Projects
- Available Roles
- Key Documents & Schemas
- Token (Carbon Emisison Reduction)
- Workflow
- IPFS Timestamp
- Step-by-Step
  
<!-- /TOC -->

## Introduction

CDM (Clean Development Mechanism) Methodology AMS-II.J, titled "Demand-side activities for efficient lighting technologies," falls under Scope 2 of the CDM framework. This methodology is designed to encourage and support energy efficiency by promoting the use of energy-efficient light bulbs, particularly self-ballasted Compact Fluorescent Lamps (CFLs), in residential applications. 

The primary goal of AMS-II.J is to reduce electricity consumption by replacing less energy-efficient baseline lamps with new, energy-efficient project lamps. These project lamps must be self-ballasted CFLs with integrated ballasts as non-removable components. It's important to note that project lamps used in this methodology should be entirely new and not transferred from other activities or sources. 

To ensure that the project effectively contributes to energy efficiency, certain requirements must be met. The total light output of the project lamp must be equal to or greater than that of the baseline lamp being replaced. The determination of light output for both baseline and project lamps should adhere to relevant national or international standards, or alternatively, the minimum light output values provided in Table 2 of the methodology may be used. 

CDM Methodology AMS-II.J offers a structured approach to promoting energy efficiency in residential lighting, which can lead to reduced electricity consumption and environmental benefits. This methodology provides a framework for projects aimed at making the transition to energy-efficient lighting technologies, contributing to sustainable development and greenhouse gas emission reductions. 

## Need and Use for the AMS-II.J Policy

Residential lighting constitutes a significant portion of global electricity consumption, contributing to both emissions and high energy costs. Mitigating climate change, enhancing energy security, and achieving economic savings all hinge on the transition to energy-efficient lighting. This methodology serves the need to reduce residential energy waste and emissions. 

AMS-II.J provides a clear project development framework, emphasizing the replacement of less energy-efficient baseline lamps with integrated ballast self-ballasted Compact Fluorescent Lamps (CFLs). This promotes energy-efficient lighting, reduces emissions, and enhances sustainable development. It also enforces adherence to relevant standards for quality assurance and simplifies monitoring and verification processes. In essence, CDM Methodology AMS-II.J aligns the need for energy efficiency with a structured approach that fosters a more sustainable and environmentally responsible approach to residential lighting. 

## Objective and Scope

The objective of CDM Methodology AMS-II.J is to promote energy efficiency in residential lighting by incentivizing the replacement of less energy-efficient baseline lamps with self-ballasted Compact Fluorescent Lamps (CFLs) featuring integrated ballasts. This methodology seeks to reduce energy consumption, lower greenhouse gas emissions, and decrease residential electricity costs, ultimately contributing to global climate change mitigation and economic savings. The scope of this methodology encompasses residential applications, emphasizing the replacement of baseline lamps with new, energy-efficient project lamps, while adhering to specific light output requirements as defined by relevant national or international standards.   

## Methodology Overview

CDM Methodology AMS-II.J, titled "Demand-side activities for efficient lighting technologies," offers a systematic approach to address the imperative need for enhanced energy efficiency in residential lighting. This methodology focuses on the replacement of less energy-efficient baseline lamps with self-ballasted Compact Fluorescent Lamps (CFLs) that are equipped with integrated ballasts, serving as non-removable components. The central objective of this methodology is to curtail energy consumption, mitigate greenhouse gas emissions, and reduce residential electricity costs. In summary, CDM Methodology AMS-II.J is a targeted approach that enables the adoption of energy-efficient residential lighting technologies, ultimately contributing to sustainable development, reduced emissions, and economic savings, while adhering to stringent quality and standardization criteria.  

## Tools Referenced

**[Methodological Tool 07](https://github.com/hashgraph/guardian/tree/main/Methodology%20Library/CDM/Tools/Tool%2007#readme)** - Tool to calculate the emission factor for an electricity system. 

**Note:**
1. To get complete information about Tools, please refer to [Tools Section](https://github.com/hashgraph/guardian/tree/main/Methodology%20Library/CDM/Tools)
2. Tools are already published on the Hedera Testnet network. Hence, it's shouldn't be published again during publishing of the policy, which is referencing it.

## Typical Projects

Projects eligible under CDM Methodology AMS-II.J encompass a variety of initiatives aimed at improving energy efficiency in residential lighting. Typical projects within the scope of this methodology include residential lighting upgrades, energy-efficient lighting programs, government-led lighting projects, lighting retrofits, public housing initiatives, and technology standardization and certification efforts. 

## Available Roles

Project Participant - The project Participant is responsible for executing the emission reduction project. The project Participant must adhere to the requirements outlined by the CDM and provide evidence of the emission reductions achieved. Upon successful verification, the project participant receives certified emission reduction (CER) tokens as an incentive for their emission reductions. 

Verification and Validation Body (VVB) - The VVB plays a critical role in independently verifying and validating the project data submitted by the project participant. They thoroughly assess the project's emission reduction potential, methodologies, and adherence to the policy guidelines. Based on their evaluation, the VVB either approves or rejects the project for registration. 

Registry (UNFCCC) - The United Nations Framework Convention on Climate Change (UNFCCC) serves as the registry for the CDM. They oversee the multiple workflow steps involved in the project's approval, including the verification and validation process by the VVB and the endorsement by the DNA. The UNFCCC's approval is necessary for the project's successful registration and issuance of CER tokens. 

## Key Documents & Schemas

Project Description - Project Participant information, standard project information, methodology information like baseline emissions, project emissions, etc. 

Emissions Reduction – Schema included within the project information form; this is filled out by the project participant to calculate annual emission reductions. 

Monitoring Report – The monitoring report is to be filled out based on the monitoring plan mentioned within the methodology. 

## Token (Carbon Emission Reduction)

Certified Emission Reduction (CER) credits, each equivalent to one tonne of CO2. 

## Policy Workflow

![image](https://github.com/hashgraph/guardian/assets/79293833/7976dc90-46d4-4548-8478-975801ef32c9)

## IPFS Timestamp

This policy is published to Hedera network and can either be imported via Github (.policy file) or IPFS timestamp. 

Policy Timestamp: 1706881157.848214003

### Step By Step 

1.Log in as the Standard Registry and import the policy either by file or through IPFS timestamp by selecting the third button at the top right.

![image](https://github.com/hashgraph/guardian/assets/79293833/eb9acbeb-d2ea-4217-92d4-e5a66fce573c)

2. To start using the policy you first have to change the status of the policy from “Draft” to “Dry Run” or “Publish”, then select the “Register” button.

![image](https://github.com/hashgraph/guardian/assets/79293833/d0a0d07c-a2e3-47fa-92d4-4379439b59b1)

![image](https://github.com/hashgraph/guardian/assets/79293833/cc63f7da-80f8-4b8d-bd63-280e7937c958)

3. Create a new user by clicking the “Create User” button and assign their role as Project Participant.

![image](https://github.com/hashgraph/guardian/assets/79293833/334e1557-51e2-4453-8320-df650dfc583e)

4. The Project Participant can now provide their name or the name they would like to see reflect when registering for this project (i.e. their organization’s name).

![image](https://github.com/hashgraph/guardian/assets/79293833/9ae5230e-e951-41d4-906e-b7df02ccb5bd)

5. Сreate a new user again and assign their role as VVB.

![image](https://github.com/hashgraph/guardian/assets/79293833/ae76b354-3049-4e76-9568-ed8ede8d0a69)

6. The VVB can now provide their name or the name they would like users to see when reviewing projects (i.e. their organization’s name).

![image](https://github.com/hashgraph/guardian/assets/79293833/df27edc7-c9cf-44b4-8f99-593a17ae03da)

7. Log in as the SR and select the “Project Participant” or the “VVB” tab to view the documents submitted by the Project Participant and by the VVB. The SR can approve their requests by clicking on the “Approve" button.

![image](https://github.com/hashgraph/guardian/assets/79293833/e9203c99-cada-48f3-81a8-2e21a5e2b77f)

![image](https://github.com/hashgraph/guardian/assets/79293833/ea9b66e0-8d7c-4faf-8982-3ff1a6d8aafc)

8. Log in as the Project Participant and create a new project by clicking on the "New Project" button. This form is used to collect information about the project, organization, and all the data needed to run the emission reduction calculations. Once all the required fields have been filled the “Create” button will turn dark blue. By selecting the “Create” button all the data will be sent to the SR for review/approval.

![image](https://github.com/hashgraph/guardian/assets/79293833/a102cc71-7c6e-4be7-a977-4b20a605ed1d)

![image](https://github.com/hashgraph/guardian/assets/79293833/e833c742-04ab-4e59-b1bb-db11eea10e0a)

![image](https://github.com/hashgraph/guardian/assets/79293833/009fcafd-e02e-412d-b0ba-7832456c87b5)

9. Log back in as the SR and after reviewing the document by selecting the “View Document” button, the SR can validate the project submitted by the Project Participant by clicking the “Validate” button. If the data does not satisfy the rules set by the SR, then the “Reject” button can be used.

![image](https://github.com/hashgraph/guardian/assets/79293833/24c459d7-7e9d-4e47-a361-d7ce35f9fbe4)

![image](https://github.com/hashgraph/guardian/assets/79293833/ab12ed5a-0c6e-4b19-95b8-dd8337b372c2)

10. Log in as the Project Participant and create a monitoring report by clicking on the “Add Report” button then fill out the monitoring report form.

![image](https://github.com/hashgraph/guardian/assets/79293833/09d332c7-d7e9-4df1-b42b-3f7a97720d94)

![image](https://github.com/hashgraph/guardian/assets/79293833/7b6e080c-4916-43b1-88d8-358adb3eb7b9)

11. After creating the monitoring report, the project participant assigns the VVB to verify it by navigating to the “Monitoring Reports” tab and selecting the dropdown under “Assign”.

![image](https://github.com/hashgraph/guardian/assets/79293833/8f850b59-a2a5-4dd0-ada9-955d7a05bd47)

12. Log in as the VVB and click the “Monitoring Reports” tab to review the document submitted by the Project Participant. After reviewing the monitoring report by selecting “View Document”, the VVB can select “Verify”.

![image](https://github.com/hashgraph/guardian/assets/79293833/edc77c9e-947a-42ce-af63-4543530f9033)

![image](https://github.com/hashgraph/guardian/assets/79293833/3cb336e3-b3a5-4ab1-92ad-fad8140a5fbb)

13. Log in as the SR to review the monitoring report by selecting the “View Document” button in the “Monitoring Reports” tab. The SR can approve the monitoring report by selecting “Approve”. This will also trigger the minting process. You can see the minting status under “Status” change from “Minting” to “Minted”.

![image](https://github.com/hashgraph/guardian/assets/79293833/9fb5c1be-7481-4686-9c3f-4008d99976d9)

![image](https://github.com/hashgraph/guardian/assets/79293833/64280576-31c0-49d4-b724-cbd59b69298e)

14. Once the minting process is completed, you can view the token amount by selecting the “VPs” tab.

![image](https://github.com/hashgraph/guardian/assets/79293833/6e01bfb8-f676-43ef-8f52-100380ab160a)

15. The TrustChain can also be viewed by clicking on the “View TrustChain” button.

![image](https://github.com/hashgraph/guardian/assets/79293833/66aa7eb8-bd82-4a56-ac6b-f6ff541abf77)

![image](https://github.com/hashgraph/guardian/assets/79293833/cddbb439-ff7f-4a07-acfe-856daff1b061)
