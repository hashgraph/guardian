## Table of contents
<!-- TOC -->

- Table of contents
- Introduction
- Need and Use for the ACM0014 Policy
- Tools Referenced
- Policy Workflow
- Policy Guide
- Available Roles
- Important Documents & Schemas
- Token(Carbon Emissions Reduction)
- Step By Step Testing

<!-- /TOC -->

## Introduction
The ACM0014 methodology, titled “Treatment of Wastewater”, provides a framework for quantifying emission reductions from wastewater treatment projects. It applies to activities involving the treatment of wastewater through anaerobic digestion, which captures and flares or utilizes the generated biogas for electricity or heat generation1.

Anaerobic digestion is a process where microorganisms break down organic matter in the absence of oxygen, leading to the production of biogas. This biogas can be used as a renewable energy source, thus reducing reliance on fossil fuels and associated greenhouse gas emissions. The conversion of waste into energy not only mitigates emissions but also contributes to resource efficiency.

ACM0014 ensures the accuracy of baseline emissions calculations from conventional wastewater treatment and the project emissions from the anaerobic treatment system. It also considers leakage emissions that may result from the project activities.

By promoting the adoption of anaerobic digestion technology, ACM0014 aims to lower greenhouse gas emissions and foster sustainable development by enhancing the management and treatment of wastewater resources.

## Need and Use for the ACM0014 Policy

In many regions, especially in developing countries, wastewater management is a significant environmental challenge. Traditional wastewater treatment methods are often energy-intensive and have a high carbon footprint.

The ACM0014 methodology provides a structured approach to quantify emission reductions from projects that treat wastewater through anaerobic digestion. This process not only treats wastewater but also generates biogas, a renewable energy source, which can be used for electricity or heat production, reducing reliance on fossil fuels.

Implementing projects under ACM0014 can help entities operating wastewater treatment facilities to develop carbon offset projects. The emission reductions achieved can be quantified and potentially registered under carbon crediting programs following independent validation. This can provide an additional revenue stream, improving the financial viability of sustainable wastewater treatment projects.

ACM0014 promotes the transition to low-carbon wastewater treatment technologies, contributing to the reduction of greenhouse gas emissions and supporting sustainable development goals. It offers a viable solution for improving wastewater management while incentivizing the adoption of cleaner technologies through carbon market mechanisms.

## Tools Referenced

**[Methodological Tool 01](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CDM/Tools/Tool%2001/readme.md)** - Tool for the demonstration and assessment of additionality. 

**[Methodological Tool 03](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CDM/Tools/Tool%2003/readme.md)** - Tool to calculate project or leakage CO2 emissions from fossil fuel combustion

**[Methodological Tool 05](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CDM/Tools/Tool%2005/readme.md)** – Baseline, project and/or leakage emissions from electricity consumption and monitoring of electricity generation. 

**[Methodological Tool 07](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CDM/Tools/Tool%2007/readme.md)** - Tool to calculate the emission factor for an electricity system

**[Methodological Tool 32](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CDM/Tools/Tool%2032/readme.md)** - Positive lists of technologies. 

## Demo Video

[Youtube](https://www.youtube.com/watch?v=xG3Cawe5sUI)

## Policy Workflow

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/workflow/ACM0014_Workflow.png)


## Policy Guide

This policy is published to Hedera network and can either be imported via Github (.policy file).

### Available Roles 
 
- Project participant - The project participant is responsible for executing the emission reduction project. The project participant must adhere to the requirements outlined by the CDM and provide evidence of the emission reductions achieved. Upon successful verification, the project participant receives certified emission reduction (CER) tokens as an incentive for their emission reductions.
- Verification and Validation Body (VVB) - The VVB plays a critical role in independently verifying and validating the project data submitted by the project participant. They thoroughly assess the project's emission reduction potential, methodologies, and adherence to the policy guidelines. Based on their evaluation, the VVB either approves or rejects the project for registration.
- Registry (UNFCCC) - The United Nations Framework Convention on Climate Change (UNFCCC) serves as the registry for the CDM. They oversee the multiple workflow steps involved in the project's approval, including the verification and validation process by the VVB and the endorsement by the DNA. The UNFCCC's approval is necessary for the project's successful registration and issuance of CER tokens

### Important Documents & Schemas 

Project Description: Information on project participant, location, technology, configuration, crediting period etc.

Emission Reductions Calculation: Calculate and specify baseline emissions, project emissions and leakage as per methodology equations.

Monitoring Plan: Description of monitoring approach, parameters, frequency, QA/QC procedures etc. in line with methodology.

Monitoring Report: Periodic monitoring report with data for monitored parameters and calculated emission reductions.

### Token(Carbon Emissions Reduction) 

Certified Emission Reduction (CER) credits, each equivalent to one tonne of CO2.


### Step By Step 

1. Log in as the Standard Registry and import the policy either by file or through IPFS timestamp by selecting the third button at the top right.

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_1.png)

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_2.png)

2. To start using the policy you first have to change the status of the policy from “Draft” to “Dry Run” or “Publish”, then select the “Register” button.

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_3.png)

3. Create a new user by clicking the “Create User” button and assign their role as Project Participant.

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_4.png)

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_5.png)

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_6.png)

4. The Project Participant can now provide their name or the name they would like to see reflect when registering for this project (i.e. their organization’s name).

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_7.png)

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_8.png)

5. Сreate a new user again and assign their role as VVB.

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_9.png)

7. Log in as the SR and select the “Approve PP” or the “Approve VVB” tab to view the documents submitted by the Project Participant and by the VVB. The SR can approve their requests by clicking on the “Approve" button.

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_10.png)

8. Log in as the Project Participant and create a new project by clicking on the "New Project" button. This form is used to collect information about the project, organization, and all the data needed to run the emission reduction calculations. Once all the required fields have been filled the “Create” button will turn dark blue. By selecting the “Create” button all the data will be sent to the SR for review/approval.

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_11.png)

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_12.png)

9. Log back in as the SR and after reviewing the document by selecting the “View Document” button, the SR can validate the project submitted by the Project Participant by clicking the “Validate” button. If the data does not satisfy the rules set by the SR, then the “Reject” button can be used.

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_15.png)

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_14.png)

10. Log in as the Project Participant and create a monitoring report by clicking on the “Add Report” button then fill out the monitoring report form.

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_16.png)

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_17.png)

11. After creating the monitoring report, the project participant assigns the VVB to verify it by navigating to the “Monitoring Reports” tab and selecting the dropdown under “Assign”.

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_18.png)

12. Log in as the VVB and click the “Monitoring Reports” tab to review the document submitted by the Project Participant. After reviewing the monitoring report by selecting “View Document”, the VVB can select “Verify”.

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_20.png)

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_19.png)

13. Log in as the SR to review the monitoring report by selecting the “View Document” button in the “Monitoring Reports” tab. The SR can approve the monitoring report by selecting “Approve”. This will also trigger the minting process. You can see the minting status under “Status” change from “Minting” to “Minted”.

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_22.png)

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_21.png)

14. Once the minting process is completed, you can view the token amount by selecting the “Token History” tab.

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_23.png)

15. The TrustChain can also be viewed by clicking on the “View TrustChain” button. Please note that the token amount may show “-1/47191” when the tokens are still minting like the example provided below.

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_24.png)

![image](https://github.com/riush03/CDM-ACM0014/blob/main/assets/steps/step_25.png)