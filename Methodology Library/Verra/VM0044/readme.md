## Table of contents
<!-- TOC -->
- Introduction
- Need and Use for the VM0044 Policy
- Demo Video
- Policy Workflow
- Policy Guide
- Important Documents & Schemas
- Token (Verified Carbon Unit)
- Step by Step
<!-- /TOC -->

## Introduction

In the realm of sustainable practices, VM0044 emerges as a methodology designed to reduce biomass waste through biochar production. As the world grapples with pressing environmental concerns, particularly the need to address carbon dioxide removal and reduce greenhouse gas (GHG) emissions, VM0044 represents an innovative approach under the Verra Verified Carbon Standard (VCS). It focuses on the transformation of waste biomass into biochar, a strategy that has potential in mitigating climate change.

The urgency to combat the rising levels of atmospheric carbon dioxide and GHG emissions necessitates methodologies like VM0044. This methodology is centered around waste biomass management, introducing a methodology for quantifying emissions and assessing the GHG benefits of converting biomass into biochar. The responsible management of waste biomass is crucial as its improper handling can lead to substantial emissions, contributing to the greenhouse effect. VM0044 promotes the utilization of biochar in various applications, preventing emissions and simultaneously harnessing the potential of biochar as a valuable resource.

VM0044's framework is strengthened by a suite of methodological tools aimed at ensuring precise emission calculations. These tools, including "Tool to calculate project or leakage CO2 emissions from fossil fuel combustion," "Tool to calculate baseline, project and/or leakage emissions from electricity consumption,” and “Tool to calculate project and leakage emissions from transportation of freight” provide the necessary schemas and parameters for accurate assessments. These tools play a role in calculating baseline emissions, project emissions, leakage, and emission reductions, making VM0044 a comprehensive approach to sustainable waste biomass management.

Moreover, VM0044 recognizes the environmental risks associated with traditional waste biomass handling practices. In scenarios where waste biomass is left to decay or combusted without energy recovery, substantial GHG emissions can occur, with far-reaching implications for the environment. By adopting the VM0044 methodology, with their specific conditions and monitoring parameters, the release of GHGs into the atmosphere can be mitigated. This methodology not only ensures GHG reduction but also demonstrates a commitment to sustainable development by merging environmental stewardship with innovative waste biomass management practices. 

## Need and Use for the VM0044 Policy

Excess waste biomass has become a significant global concern due to inefficient waste management practices and the rising demand for energy and resources. When waste biomass is not properly managed, it decomposes and releases substantial greenhouse gases (GHGs), primarily carbon dioxide, into the atmosphere. This exacerbates the greenhouse effect, contributing to global climate change and environmental degradation. The improper disposal of waste biomass can also lead to contamination and harm local ecosystems. Addressing waste biomass management has become a pressing need, and Verra's VM0044 methodology provides a practical solution that underscores the importance of sustainable waste biomass management and carbon sequestration.

VM0044's approach goes beyond waste biomass management to offer a comprehensive strategy for mitigating GHG emissions. By converting waste biomass into biochar, this methodology prevents unnecessary carbon emissions and repurposes waste as a valuable resource for various applications. This dual benefit not only tackles the issue of excess waste but also contributes to reducing GHG emissions, marking a significant step towards sustainability and addressing climate change on a global scale.
Furthermore, this methodology is now available in a digital format on the Guardian, enhancing the convenience and efficiency of data input, emissions calculations, and emission reduction processes. The Guardian's platform ensures the transparency and auditability of each step in the process.

Within this digital methodology, users will use a collection of Clean Development Mechanism (CDM) methodological tools that aid in the calculation and management of emissions, including tools for calculating emissions from fossil fuel combustion, electricity consumption, and emissions from transportation of freight. The presence of these digital tools within The Guardian not only streamlines the management of waste biomass and reduces greenhouse gas emissions but also guarantees that the data is readily comprehensible and reusable, eliminating the need for extensive alterations for each project.

## Demo Video

[Youtube](https://youtu.be/LN5vDNgevlM)

## Policy Workflow

![image](https://github.com/hashgraph/guardian/assets/79293833/a32e499b-1278-4cbb-9421-87b2bc55db27)

## Policy Guide

This policy is published to Hedera network and can either be imported via Github (.policy file) or IPSF timestamp. 

Policy: 1698754217.516521003

### Available Roles 
 
- Project Proponent - The project proponent is responsible for executing the emission reduction project. The project proponent must adhere to the requirements outlined by Verra’s VCS program and provide evidence of the emission reductions achieved. Upon successful verification, the project proponent receives Verified Carbon Units (VCU) as an incentive for their emission reductions.
  
- Verification and Validation Body (VVB) - The VVB plays a critical role in independently verifying and validating the project data submitted by the project proponent. They thoroughly assess the project's emission reduction potential, methodologies, and adherence to the policy guidelines. Based on their evaluation, the VVB either approves or rejects the project for registration.
    
- Registry (Verra) – With Verra as the registry they take on responsibilities that encompass project intake, pipeline management, and final review of project descriptions and monitoring reports. This process ensures that emission reduction projects meet the highest standards before tokens are issued.
  
### Important Documents & Schemas 
  
**Methodological Tool 03** - Tool to calculate project or leakage CO2 emissions from fossil fuel combustion. 

**Methodological Tool 05** - Baseline, project and/or leakage emissions from electricity consumption and monitoring of electricity generation.

**Methodological Tool 12** - Project and leakage emissions from transportation of freight. 

**Project Description** - Project Proponent information, standard project information, methodology information like baseline emissions, project emissions, etc. 

**Emissions Reduction** – Schema included within the project information form; this is filled out by the project proponent to calculate annual emission reductions. Monitoring Report – The monitoring report is to be filled out based on the monitoring plan mentioned within the methodology.   

### Token(Carbon Emissions Reduction) 

Certified Emission Reduction (CER) credits, each equivalent to one tonne of CO2.


### Step By Step 

1. Create a new user and assign role as Project Proponent.

![image](https://github.com/hashgraph/guardian/assets/79293833/93474fe1-cd75-4474-b383-60d2de66bf3b)

2. Create a New project by clicking on "New Project" button and enter all the required details.

![image](https://github.com/hashgraph/guardian/assets/79293833/2a7a0fa2-b486-4755-8580-377f09c5084a)

3. Once project details are submitted, Verra waits for its approval
   
![image](https://github.com/hashgraph/guardian/assets/79293833/b38a0d3e-6743-42d9-b7be-3f132999027a)

![image](https://github.com/hashgraph/guardian/assets/79293833/9dfe4b7b-5f5d-40db-8665-290360b9d90e)

4. Once project details are submitted, Verra waits for its approval

![image](https://github.com/hashgraph/guardian/assets/79293833/e249f84b-6229-46ab-a0ec-599d2aa4904d)

5. Now, we create a new user and assign its role as VVB

![image](https://github.com/hashgraph/guardian/assets/79293833/d734902b-2eea-43a4-afd7-388ad6fb0e14)

6. We need to set VVB name

![image](https://github.com/hashgraph/guardian/assets/79293833/d5528b99-1698-43c5-a574-dff8ba5b7ac3)

7. Once VVB name is set, it waits for SR to approve it.

![image](https://github.com/hashgraph/guardian/assets/79293833/bc487619-e604-4e75-85ae-5bc382fccebf)

8. Now we login as SR and approve VVB.

![image](https://github.com/hashgraph/guardian/assets/79293833/8f75af52-4571-4f26-ba9c-8cd80a66fd84)

9. Once VVB is approved, SR goes to Project Pipeline tab and click on Add button

![image](https://github.com/hashgraph/guardian/assets/79293833/7d036b6f-9740-4e1e-8beb-15d2daebcc35)

10. Once Project is added, it waits for validation from Verra

![image](https://github.com/hashgraph/guardian/assets/79293833/4091e687-079b-4cb2-ac4e-e4fbbb53729c)

11. Now we login as Verra and assign project to VVB

![image](https://github.com/hashgraph/guardian/assets/79293833/6d583b98-61e4-43f8-83ad-fe5f192a0149)

12. Now we login as VVB and validate the project by viewing project document details. Once validated, VVB clicks on Validate button.

![image](https://github.com/hashgraph/guardian/assets/79293833/767d4914-3723-4ab0-ace9-55d2560839f4)

13. Once validated, we login as Project Proponent and Add Monitoring Report.

![image](https://github.com/hashgraph/guardian/assets/79293833/873e181d-6956-4178-86dd-95de88c6783d)

![image](https://github.com/hashgraph/guardian/assets/79293833/8d1fb8a6-464e-4d48-9c7a-bbc3d80a3c83)

14. Once report is submitted, we now login as VVB and validate the monitoring report by clicking on Verify button.

![image](https://github.com/hashgraph/guardian/assets/79293833/caa44f2a-dc56-4756-bcd6-5305fc26b995)

15. Once monitoring report is validated, we login as SR and click on Mint to mint the tokens.

![image](https://github.com/hashgraph/guardian/assets/79293833/a480438a-7e30-4025-b6b9-089633869873)

16. Once minting is completed, we can view tokens in Token History tab

![image](https://github.com/hashgraph/guardian/assets/79293833/45268864-1913-45af-baee-69050697bf15)

17. Trustchain can also be viewed by clicking on View TrustChain button:

![image](https://github.com/hashgraph/guardian/assets/79293833/fb4ad543-1111-41a9-9b43-f7ad550923bc)

![image](https://github.com/hashgraph/guardian/assets/79293833/bd0c787f-4b22-4002-89b5-1d2e948b5837)

