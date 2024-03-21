## Table of contents
<!-- TOC -->

- Table of contents
- Introduction
- Need and Use for the ACM0007 Policy
- Tools Referenced
- Policy Workflow
- Policy Guide
- Available Roles
- Important Documents & Schemas
- Token(Carbon Emissions Reduction)
- Step By Step

<!-- /TOC -->

## Introduction

The ACM0007 methodology titled "Conversion from single cycle to combined cycle power generation" provides guidance on quantifying emission reductions for projects that involve upgrading power plants from single cycle to more efficient combined cycle operation.

Combined cycle power generation makes use of waste heat from a gas turbine to produce steam and power a steam turbine, improving the overall efficiency of electricity generation. Converting existing single cycle turbines to combined cycle enables more electricity generation with the same fuel input, thereby reducing emissions intensity.

ACM0007 was designed to ensure accuracy in determining baseline emissions from continued single cycle operation and calculating project emissions from the combined cycle plant. It also accounts for any leakage emissions associated with the project activity.

By encouraging the switch to more efficient combined cycle technology, ACM0007 aims to reduce greenhouse gas emissions and support sustainable development through improved utilization of resources.

## Need and Use for the ACM0007 Policy

Many developing countries have a high share of grid electricity generated from legacy single cycle gas turbines or diesel plants with low efficiencies and high emissions intensity.

Converting these power units to combined cycle can significantly reduce the grid emission factor by improving generation efficiency. This supports grid decarbonization efforts without compromising energy access and reliability.

The ACM0007 methodology provides a standardized approach to quantify the emission reductions achieved from upgrading power plants to combined cycle technology. This encourages project adoption by ensuring credibility and unlocking carbon finance opportunities.

Entities operating single cycle power plants can use ACM0007 to develop carbon offset projects by upgrading to combined cycle. The quantified emission reductions can potentially be registered under carbon crediting programs after independent validation. Revenue from carbon credits enhances the financial viability of efficiency improvement projects.

ACM0007 thus enables a practical solution to reduce grid emissions intensity in many countries by incentivizing combined cycle conversion projects through carbon market opportunities.

## Tools Referenced

**[Methodological Tool 02](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CDM/Tools/Tool%2002/readme.md)** - Combined tool to identify the baseline scenario and demonstrate additionality

**[Methodological Tool 03](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CDM/Tools/Tool%2003/readme.md)** - Tool to calculate project or leakage CO2 emissions from fossil fuel combustion

**[Methodological Tool 07](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CDM/Tools/Tool%2007/readme.md)** - Tool to calculate the emission factor for an electricity system

**[Methodological Tool 10](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CDM/Tools/Tool%2010/readme.md)** - Tool to determine the remaining lifetime of equipment

## Policy Workflow

![image](https://github.com/hashgraph/guardian/assets/79293833/16bd0ec2-1597-47c4-8d71-24d4e1f952b6)


## Policy Guide

This policy is published to Hedera network and can either be imported via Github (.policy file) or IPSF timestamp.

Timestamp: 1706881469.628524368

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

![image](https://github.com/hashgraph/guardian/assets/79293833/67a7bb92-8c92-4dc9-a6e3-c4906ca87e06)

![image](https://github.com/hashgraph/guardian/assets/79293833/9237ad6a-7ede-4d26-8dde-4942f6b73a6b)

![image](https://github.com/hashgraph/guardian/assets/79293833/d7980013-6750-48dd-a3cb-315bbd1841f7)

2. To start using the policy you first have to change the status of the policy from “Draft” to “Dry Run” or “Publish”, then select the “Register” button.

![image](https://github.com/hashgraph/guardian/assets/79293833/56ccfd3d-dbb8-400f-a57a-4c2e78f25238)

![image](https://github.com/hashgraph/guardian/assets/79293833/c71c132a-6117-4be3-b369-5245c8ad2901)

3. Create a new user by clicking the “Create User” button and assign their role as Project Participant.

![image](https://github.com/hashgraph/guardian/assets/79293833/67784697-d58d-477d-b8ad-bd23721dd50a)

4. The Project Participant can now provide their name or the name they would like to see reflect when registering for this project (i.e. their organization’s name).

![image](https://github.com/hashgraph/guardian/assets/79293833/43a74a52-9d61-4087-8080-271889fdb0b2)

5. Сreate a new user again and assign their role as VVB.

![image](https://github.com/hashgraph/guardian/assets/79293833/15f845b6-182b-4124-8658-e9a2cc82e727)

6. The VVB can now provide their name or the name they would like users to see when reviewing projects (i.e. their organization’s name).

![image](https://github.com/hashgraph/guardian/assets/79293833/ecd86c0c-9c53-40d3-b165-8cd63c1cf64e)

7. Log in as the SR and select the “Approve PP” or the “Approve VVB” tab to view the documents submitted by the Project Participant and by the VVB. The SR can approve their requests by clicking on the “Approve" button.

![image](https://github.com/hashgraph/guardian/assets/79293833/cb35c440-afaf-4bd0-b758-e648aff8e69b)

![image](https://github.com/hashgraph/guardian/assets/79293833/6748abe6-0894-4669-9e74-40459f1330e3)

8. Log in as the Project Participant and create a new project by clicking on the "New Project" button. This form is used to collect information about the project, organization, and all the data needed to run the emission reduction calculations. Once all the required fields have been filled the “Create” button will turn dark blue. By selecting the “Create” button all the data will be sent to the SR for review/approval.

![image](https://github.com/hashgraph/guardian/assets/79293833/11d701a6-ce32-4307-8c68-68711f900d85)

![image](https://github.com/hashgraph/guardian/assets/79293833/523dc9d0-3f3c-4a1c-8886-7a463c37db38)

9. Log back in as the SR and after reviewing the document by selecting the “View Document” button, the SR can validate the project submitted by the Project Participant by clicking the “Validate” button. If the data does not satisfy the rules set by the SR, then the “Reject” button can be used.

![image](https://github.com/hashgraph/guardian/assets/79293833/eb914a89-e6c0-4c7d-b551-3e1c3b616bbb)

![image](https://github.com/hashgraph/guardian/assets/79293833/2b093e37-f9e0-4d79-acbb-c9512208572b)

10. Log in as the Project Participant and create a monitoring report by clicking on the “Add Report” button then fill out the monitoring report form.

![image](https://github.com/hashgraph/guardian/assets/79293833/61052368-e1ba-4ab2-8ac4-f61386c3dd78)

![image](https://github.com/hashgraph/guardian/assets/79293833/79343ad0-ba49-49a6-959d-a387d0b3d14e)

![image](https://github.com/hashgraph/guardian/assets/79293833/4f96f49d-f169-447e-87c3-ae776113ba71)

11. After creating the monitoring report, the project participant assigns the VVB to verify it by navigating to the “Monitoring Reports” tab and selecting the dropdown under “Assign”.

![image](https://github.com/hashgraph/guardian/assets/79293833/bd7bea21-462b-4eb6-8c46-834d7f3f7630)

12. Log in as the VVB and click the “Monitoring Reports” tab to review the document submitted by the Project Participant. After reviewing the monitoring report by selecting “View Document”, the VVB can select “Verify”.

![image](https://github.com/hashgraph/guardian/assets/79293833/b5862f05-a98b-4ee3-b3eb-46cb21f993aa)

![image](https://github.com/hashgraph/guardian/assets/79293833/b087b5d5-b99d-4ff8-af37-8076322e14a8)

13. Log in as the SR to review the monitoring report by selecting the “View Document” button in the “Monitoring Reports” tab. The SR can approve the monitoring report by selecting “Approve”. This will also trigger the minting process. You can see the minting status under “Status” change from “Minting” to “Minted”.

![image](https://github.com/hashgraph/guardian/assets/79293833/672d0769-fec6-42ed-8738-40a984274981)

![image](https://github.com/hashgraph/guardian/assets/79293833/073fa716-6ab0-4acf-a2b5-df2cbbebdf7c)

14. Once the minting process is completed, you can view the token amount by selecting the “Token History” tab.

![image](https://github.com/hashgraph/guardian/assets/79293833/2bb1ca1b-ae24-42ca-9467-7e44bb1a455b)

15. The TrustChain can also be viewed by clicking on the “View TrustChain” button. Please note that the token amount may show “-1/47191” when the tokens are still minting like the example provided below.

![image](https://github.com/hashgraph/guardian/assets/79293833/41c1237b-b131-4f51-a067-2ccdf86eaf34)

![image](https://github.com/hashgraph/guardian/assets/79293833/7f33b5ca-ce6d-4c1d-b67a-6ea7203ae169)

























