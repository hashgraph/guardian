## Table of contents
<!-- TOC -->

- [Table of contents](#table-of-contents)
- [Introduction](#introduction)
- [Need and Use for the ACM0007 Policy](#need-and-use-for-the-acm0007-policy)
- [Policy Workflow](#policy-workflow)
- [Policy Guide](#policy-guide)
- [Available Roles](#available-roles)
- [Important Documents \& Schemas](#important-documents--schemas)
- [Token(Carbon Emissions Reduction)](#tokencarbon-emissions-reduction)
- [Step By Step](#step-by-step)

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
  
- Project Description: Information on project participant, location, technology, configuration, crediting period etc.
- Emission Reductions Calculation: Calculate and specify baseline emissions, project emissions and leakage as per methodology equations.
- Monitoring Plan: Description of monitoring approach, parameters, frequency, QA/QC procedures etc. in line with methodology.
- Monitoring Report: Periodic monitoring report with data for monitored parameters and calculated emission reductions.

Tools referenced:
- Tool 02 - Combined tool to identify the baseline scenario and demonstrate additionality
- Tool 03 - Tool to calculate project or leakage CO2 emissions from fossil fuel combustion
- Tool 07 - Tool to calculate the emission factor for an electricity system
- Tool 10 - Tool to determine the remaining lifetime of equipment

### Token(Carbon Emissions Reduction) 

Certified Emission Reduction (CER) credits, each equivalent to one tonne of CO2.

### Step By Step 

1. Login as Standard Registry and import the policy either by file or through IPFS timestamp.
2. Create a new user and assign role as Project Proponent.

![image](https://github.com/hashgraph/guardian/assets/79293833/5469acb1-b261-4e93-bd40-e5b184cfa7a8)

3. Name new Project Participant.

![image](https://github.com/hashgraph/guardian/assets/79293833/95bebf8d-9f21-4681-858c-a0aaca51b8d7)

4. Сreate a new user and assign role as VVB.

![image](https://github.com/hashgraph/guardian/assets/79293833/4fcd133c-d440-47fc-becc-f4ce7d4a3989)

5. Name new VVB.

![image](https://github.com/hashgraph/guardian/assets/79293833/83643596-d283-4a00-9ea7-c9372c3e6418)

6. Login as SR and view the documents submitted by VVB and Project Participant and approve their requests by clicking on "Approve" button.

![image](https://github.com/hashgraph/guardian/assets/79293833/a78f4799-74d8-4d2f-af61-e39b9305f9ad)

![image](https://github.com/hashgraph/guardian/assets/79293833/363ba6a0-1cc2-4e8d-b552-33c36ec2e4f7)

7. Login back as Project Participant and create a New project by clicking on "New Project" button and enter all the required details.

![image](https://github.com/hashgraph/guardian/assets/79293833/8357798b-31c4-4297-a771-50b7b19359e7)

![image](https://github.com/hashgraph/guardian/assets/79293833/47072fe9-52c9-4fb5-87e7-15fd738e8f79)

8. Login back as SR and after reviewing the document, it validated the project submitted by Project Participant.

![image](https://github.com/hashgraph/guardian/assets/79293833/ae6913b5-ee20-4a0f-9ca1-d4ddb8cf440c)

9. Project Participant creates monitoring report by clicking on Add Report and fills out the monitoring report form.

![image](https://github.com/hashgraph/guardian/assets/79293833/d6622431-157d-4d86-b742-5ca81d5d4b83)

![image](https://github.com/hashgraph/guardian/assets/79293833/31296727-9f19-4d67-8d86-2f44c0834a7d)

10. After creating monitoring report, project participant assigns VVB to verify it.

![image](https://github.com/hashgraph/guardian/assets/79293833/613e1ec7-60ea-4353-af11-6c93b4f0ef67)

11. Log in as a VVB and, after reviewing the monitoring report, the VVB verifies it.

![image](https://github.com/hashgraph/guardian/assets/79293833/f7525812-c331-48c8-bdca-5da4fcae70d5)

12. Login as SR and once it is reviewed, SR approves the Monitoring report.

![image](https://github.com/hashgraph/guardian/assets/79293833/9da0dd7c-fc3f-4a8a-a770-22074b181aaa)

13. Once minting is completed, we can view tokens in VPs  tab.

![image](https://github.com/hashgraph/guardian/assets/79293833/8a3afc63-d83f-461b-8414-7bcf7c4be6eb)

14. TrustChain can also be viewed by clicking on View “TrustChain” button.

![image](https://github.com/hashgraph/guardian/assets/79293833/f93955eb-884e-4712-9331-66ba05dc2e3b)















