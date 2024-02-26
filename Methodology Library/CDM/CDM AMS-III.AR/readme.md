## Table of content
<!-- TOC -->

- Introduction
- Why the AMS-III.AR Methodology?
- Demo Video
- Policy Workflow
- Policy Guide
  - Important Documents & Schemas
  - Token (Carbon Credit)
  - Step By Step
<!-- /TOC -->

## Introduction

AMS-III.AR is a specific methodology under the Clean Development Mechanism (CDM) that aims to promote sustainable development by facilitating the substitution of fossil fuel-based lighting systems with energy-efficient LED/CFL lighting systems. This methodology focuses on reducing greenhouse gas emissions associated with lighting and improving energy efficiency in developing countries. The objective of AMS-III.AR is to encourage the adoption of LED (Light Emitting Diode) and CFL (Compact Fluorescent Lamp) lighting technologies as alternatives to traditional fossil fuel-based lighting systems such as incandescent bulbs or kerosene lamps. LED and CFL lighting systems are more energy-efficient, have longer lifespans, and produce significantly lower greenhouse gas emissions compared to their fossil fuel-based counterparts.

## Why AMS-III.AR Methodology?

Let's explore the drawbacks of fuel-based lighting and the compelling advantages offered by LED/CFL bulbs. It is widely acknowledged that fuel-based lighting falls short in terms of efficiency, delivering limited and low-quality illumination, while also subjecting users to significant health and fire hazards—especially in low and middle-income countries, where over 95% of fatal fire-related burns occur. Furthermore, the use of fuel-based lighting contributes to Greenhouse Gas (GHG) emissions, leading to increased indoor air pollution, health risks, decreased productivity, and compromised safety. Astonishingly, the total fuel consumption for lighting, equivalent to a staggering 1.3 million barrels of oil per day, results in approximately 190 million tons of carbon dioxide emissions annually.

On the other hand, LED/CFL bulbs emerge as superior options, and here's why. First and foremost, they are highly energy-efficient, utilizing up to 80% less energy compared to conventional bulbs. This not only translates into substantial energy savings but also aids in reducing carbon emissions, making LED/CFL bulbs an eco-friendly choice. In addition to their energy efficiency, these bulbs boast an impressively long lifespan—up to 25 times longer than traditional bulbs. This remarkable durability means fewer replacements, reduced waste generation, and lower maintenance costs. With LED/CFL bulbs, you can enjoy long-lasting illumination while minimizing your impact on the environment.

Moreover, LED bulbs are designed with sustainability in mind. Unlike conventional bulbs, they do not contain harmful substances like mercury, making them safer for both human health and the planet. Additionally, LED bulbs produce minimal heat, further enhancing their safety and sustainability. While CFL bulbs do contain small amounts of mercury, it's important to note that switching to compact fluorescent light bulbs still offers energy savings, reducing our reliance on fossil fuels burned for electricity generation. Furthermore, the increased efficiency and extended lifespan of LED/CFL bulbs contribute to resource conservation during the production process.

In conclusion, LED/CFL bulbs outshine fuel-based lighting on multiple fronts. They not only provide superior lighting quality but also bring significant energy savings, reduced carbon emissions, prolonged lifespan, and a more sustainable lighting solution. By adopting LED/CFL technology, we can make a positive impact on our environment. 

## Demo Video

[Youtube](https://youtu.be/czbsLZU_Gl4)

## Policy Workflow

The workflow for the AMS-III.AR policy involves four key roles to ensure transparency and accountability. 
These roles are as follows:

- Project Proponent - The project proponent is responsible for executing the emission reduction project. They develop and implement strategies to substitute fossil fuel-based lighting systems with LED/CFL lighting systems. The project proponent must adhere to the requirements outlined by the CDM and provide evidence of the emission reductions achieved. Upon successful verification, the project proponent receives certified emission reduction (CER) tokens as an incentive for their emission
reductions.

- Verification and Validation Body (VVB) - The VVB plays a critical role in independently verifying and validating the project data submitted by the project proponent. They thoroughly assess the project's emission reduction potential, methodologies, and adherence to the policy guidelines. Based on their evaluation, the VVB either approves or rejects the project for registration.
  
- Designated National Authority (DNA) - The DNA is a governmental body representing the country where the emission reduction project is being implemented. They review and approve the project's eligibility in accordance with national policies and regulations. The DNA's endorsement is essential for the project to proceed with the AMS-III.AR policy.
  
- Registry (UNFCCC) - The United Nations Framework Convention on Climate Change (UNFCCC) serves as the registry for the CDM. They oversee the multiple workflow steps involved in the project's approval, including the verification and validation process by the VVB and the endorsement by the DNA. The UNFCCC's approval is necessary for the project's successful registration and issuance of CER tokens


<img width="1128" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/5adac491-8135-416c-b490-13d315ad3200">

## Policy Guide

This policy is published to the Hedera network and can either be imported via Github(.policy file) or IPFS timestamp.

Timestamp: 
Policy: 1698756576.572245003
Tool 33: 1690820529.197570717

### Available Roles 
 
  - Project Proponent - Project developer who proposes and executes cookstove project and receives credits(VER)
  - VVB(Validation & Verification Body) - Independent third party who audits project's critical documentation and monitoring reports
  - Gold Standard(GS) - GS is the trusted registry overseeing the entire project cycle and issuing the credits(VER)
  
### Important Documents & Schemas 
  
**Project Description** - Project Proponent information, standard project information, methodology information, etc.

**Baseline Emissions** – Baseline emission calculation that automatically occurs without the need for a form.

**Default Values (Tool 33)** - Tool 33 is included as a module within the policy. This module is used to calculate default values for common parameters like emission factors for diesel generator systems.

**Minimum Requirements for the Design Specifications of Project Lamps** – This schema is included in the policy as a form within the project information form, fields are included to collect the following information about the project:

- Lamp wattage (in Watts) and luminous flux output (in lumens)
- Rated lamp life (in hours)
- Where applicable, the type and rated capacity of the renewable energy equipment used for battery-charging (in Watts)
- Type (e.g. NiMH, Lead-Acid, Li-ion, Lithium-iron-phosphate, etc.), nominal voltage, and rated capacity of the batteries (in Ampere hours)
- Type of charge controller (e.g. active or passive)
- Autonomous time and DBT
- Solar Run Times(s) (SRT) for products with solar energy charging systems
- Where applicable, the amount of time to fully charge the product using mechanical means or a centralized charging system (e.g. the national grid)
- Physical protection against environmental factors (e.g. rain, heat, insect ingress)

**Project Emissions** – Schema included within the project information form; this is filled out by the project proponent to calculate project emissions per project lamp.

**Emissions Reduction** – Schema included within the project information form; this is filled out by the project proponent to calculate annual emission reductions.

**Monitoring Report** – The monitoring report is to be filled out based on the monitoring plan mentioned within the methodology.

  
### Token(Carbon credit) 
Certified Emission Reduction (CER) credits, each equivalent to one tonne of CO2.


### Step By Step 

1. Log in as the Standard Registry and import the policy either by file or through IPFS timestamp by selecting the third button at the top right.

![image](https://github.com/hashgraph/guardian/assets/79293833/0c9e3498-3547-47ab-9389-4b0b0b20a5e4)

![image](https://github.com/hashgraph/guardian/assets/79293833/65d75df6-4ee3-4920-9d6f-0bcfecf149a3)

![image](https://github.com/hashgraph/guardian/assets/79293833/908e4e54-6f48-4ac6-b945-691901fbae2a)

2. To start using the policy you first have to change the status of the policy from “Draft” to “Dry Run” or “Publish”, then select the “Register” button.

![image](https://github.com/hashgraph/guardian/assets/79293833/9394b196-edd9-4c12-afd9-88eb47b0b193)

![image](https://github.com/hashgraph/guardian/assets/79293833/b432fb96-9ea0-42ac-8f19-e62dafccfa87)

3. Create a new user by clicking the “Create User” button and assign their role as Project Participant.

![image](https://github.com/hashgraph/guardian/assets/79293833/ad3075ed-b938-409d-9da5-07b28fafd7d5)

4. The Project Participant can now provide their name or the name they would like to see reflect when registering for this project (i.e. their organization’s name).

![image](https://github.com/hashgraph/guardian/assets/79293833/d253ec3e-9baf-4e45-8850-6c8227b35f43)

5. Сreate a new user again and assign their role as VVB.

![image](https://github.com/hashgraph/guardian/assets/79293833/1ce12028-b9aa-4b40-bb3f-55fa2018f76c)

6. The VVB can now provide their name or the name they would like users to see when reviewing projects (i.e. their organization’s name).

![image](https://github.com/hashgraph/guardian/assets/79293833/cc4b7f10-0775-4970-ab20-0ed73a5cee00)

7. Log in as the SR and select the “Project Participants” or the “VVBs” tab to view the documents submitted by the Project Participant and by the VVB. The SR can approve their requests by clicking on the “Approve" button.

![image](https://github.com/hashgraph/guardian/assets/79293833/9146e6b4-68e0-468b-b457-1ede58955627)

![image](https://github.com/hashgraph/guardian/assets/79293833/1ca8b5f7-45fd-4556-9714-1b770e013d71)

8. Log in as the Project Participant and create a new project by clicking on the "New Project" button. This form is used to collect information about the project, organization, and all the data needed to run the emission reduction calculations. Once all the required fields have been filled the “Create” button will turn dark blue. By selecting the “Create” button all the data will be sent to the SR for review/approval.

![image](https://github.com/hashgraph/guardian/assets/79293833/8f9076ca-7b7c-4e18-ae2a-ec2ed9994837)

![image](https://github.com/hashgraph/guardian/assets/79293833/83ef7da4-90c1-42f6-bffa-367047901165)

![image](https://github.com/hashgraph/guardian/assets/79293833/608203e1-c0b3-4071-845e-5de7c2a868f4)

9. Log back in as the SR and after reviewing the document by selecting the “View Document” button, the SR can validate the project submitted by the Project Participant by clicking the “Validate” button. If the data does not satisfy the rules set by the SR, then the “Reject” button can be used.

![image](https://github.com/hashgraph/guardian/assets/79293833/883daede-90c9-494c-a86a-775238c147ae)

![image](https://github.com/hashgraph/guardian/assets/79293833/4f00bbda-7dc7-4302-90c6-68cc34a0b77f)

10. Log in as the Project Participant and create a monitoring report by clicking on the “Add Report” button then fill out the monitoring report form.

![image](https://github.com/hashgraph/guardian/assets/79293833/59db30c0-ba7b-49b0-b37c-f8fc6b6357a4)

![image](https://github.com/hashgraph/guardian/assets/79293833/057aa636-4db7-4ffb-930b-9705f3be6735)

11. After creating the monitoring report, the project participant assigns the VVB to verify it by navigating to the “Monitoring Reports” tab and selecting the dropdown under “Assign”.

![image](https://github.com/hashgraph/guardian/assets/79293833/3e8f15ea-2fd7-44e0-b522-acc4d9b2e584)

12. Log in as the VVB and click the “Monitoring Reports” tab to review the document submitted by the Project Participant. After reviewing the monitoring report by selecting “View Document”, the VVB can select “Verify”.

![image](https://github.com/hashgraph/guardian/assets/79293833/f1aaedcb-4503-4203-b98d-2044c643dbfe)

![image](https://github.com/hashgraph/guardian/assets/79293833/823694f3-5b5b-4378-8f2b-a65f0383c83a)

13. Log in as the SR to review the monitoring report by selecting the “View Document” button in the “Monitoring Reports” tab. The SR can approve the monitoring report by selecting “Approve”. This will also trigger the minting process. You can see the minting status under “Status” change from “Minting” to “Minted”.

![image](https://github.com/hashgraph/guardian/assets/79293833/fcc3a22a-cc08-4f3c-bd7a-c6d1a31dfac7)

![image](https://github.com/hashgraph/guardian/assets/79293833/de6017e7-5ae7-4ccc-9e34-2fbd594a91fe)

14. Once the minting process is completed, you can view the token amount by selecting the “Token History” tab.

![image](https://github.com/hashgraph/guardian/assets/79293833/1de73e95-8e26-4b78-9229-bfc2625cf6e1)

15. The TrustChain can also be viewed by clicking on the “View TrustChain” button. Please note that the token amount may show “-1” when the tokens are still minting. Once the process is complete a notification will appear stating that the tokens have been minted and transferred.

![image](https://github.com/hashgraph/guardian/assets/79293833/84c43fb9-a993-4eab-82b9-84951f56b6fd)

![image](https://github.com/hashgraph/guardian/assets/79293833/fa815f0d-5a5d-4d8e-9baa-831a96786f01)

























