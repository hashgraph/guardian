## Table of Contents
<!-- TOC -->

- Introduction
- Need and Use for the PWRM0002 policy
- Demo Video
- Policy Workflow
- Policy Guide
- Available Roles
- Important Documents & Schemas
- Token (Waste Recycling Credit)
- Step-by-Step
  
<!-- /TOC -->

## Introduction

The Plastic Waste Recycling Methodology (PWRM0002) serves as a structured framework providing guidelines and procedures for estimating and quantifying additional plastic waste recycled through chemical and/or mechanical recycling activities. PWRM0002 focuses on promoting recycling initiatives that divert plastic waste from landfills and incinerators, thereby reducing environmental pollution and conserving valuable resources. 

## Need and Use for the PWRM0002 Policy

Plastic waste presents an escalating environmental crisis, with over 300 million tons produced annually globally, much of which ends up in landfills, oceans, and natural habitats. Its persistence poses a severe threat to biodiversity, as evidenced by over 800 affected species facing entanglement, ingestion, and habitat destruction. Moreover, microplastics, resulting from the breakdown of larger plastic items, contaminate water sources and food chains, raising significant human health concerns. In response to these challenges, methodologies like PWRM0002 play a pivotal role by promoting recycling initiatives and fostering sustainable waste management practices. PWRM0002 incentivizes increased recycling of plastic waste through clear guidelines and procedures, diverting plastic from landfills and incinerators and reducing pollution while conserving resources. Additionally, by establishing transparent reporting and verification processes, PWRM0002 ensures accountability among stakeholders, contributing to the mitigation of plastic waste's adverse environmental impacts and the creation of resilient communities empowered to address local challenges.

## Demo Video

Coming Soon

## Policy Workflow

![image](https://github.com/hashgraph/guardian/assets/79293833/2b787510-fc8f-4656-b9be-547a630f5809)

## Policy Guide

This policy is published to Hedera network and can either be imported via Github (.policy file) or IPFS timestamp. 

## Available Roles

- Project Proponent - The project proponent is responsible for executing the waste reduction project. The project proponent must adhere to the requirements outlined by Verra’s Plastic Waste Reduction Standard and provide evidence of the waste collection achieved. Upon successful verification, the project proponent receives Waste Recycling Credits (WRC) as an incentive for their waste reductions. 

- Verification and Validation Body (VVB) - The VVB plays a critical role in independently verifying and validating the project data submitted by the project proponent. They thoroughly assess the project's waste reduction potential, methodologies, and adherence to the policy guidelines. Based on their evaluation, the VVB either approves or rejects the project for registration. 

- Registry (Verra) – With Verra as the registry they take on responsibilities that encompass project intake, pipeline management, and final review of project descriptions and monitoring reports. This process ensures that waste reduction projects meet the highest standards before tokens are issued. 

## Important Documents & Schemas

1.	Project Description - Project Participant information, standard project information, methodology information like baseline waste recycling, project waste recycling, etc. 

2. Additionality Determination - – Schema included within the project information form to determine if the project is additional.  

## Token (Waste Recycling Credit)

Waste Recycling Credit (WRC), each equivalent to (1) tonne of plastic that has been recycled. 

### Step By Step 

1. Import the policy using IPFS or Policy File.

![image](https://github.com/hashgraph/guardian/assets/79293833/a3170994-a3c8-4dfb-a10f-974403650937)

![image](https://github.com/hashgraph/guardian/assets/79293833/81a81d6a-7ec3-4593-ab1b-7fac744d7dc3)

![image](https://github.com/hashgraph/guardian/assets/79293833/e461b8c6-2de3-4fb4-8e84-f78cd428874e)

2. Set the policy to Dry Run or Publish it using the dropdown. Then select “Register”.

![image](https://github.com/hashgraph/guardian/assets/79293833/73d7763a-59c6-47cc-a5c4-c91cfe17fca1)

![image](https://github.com/hashgraph/guardian/assets/79293833/38b4fb70-571d-4ced-b716-f3605ccdb4bf)

3. Create a new user and assign their role as the Project Proponent.

![image](https://github.com/hashgraph/guardian/assets/79293833/091baf2c-161b-44de-97ec-728da91821a9)

4. Create a new project by clicking on the "New Project" button and enter all the required details.

![image](https://github.com/hashgraph/guardian/assets/79293833/f015afa2-5282-4405-af94-eac73899e8fe)

5. Once the project details are submitted, Verra can add it to the project pipeline.

![image](https://github.com/hashgraph/guardian/assets/79293833/d64b8cb4-b29f-4fd2-9534-498d4c930acf)

6. The Standard Registry can now add the project to the project pipeline by selecting “Add”.

![image](https://github.com/hashgraph/guardian/assets/79293833/ad1b4f4d-20d5-4cba-b9bc-afb8b203da46)

7. Now, we create a new user and assign its role as the VVB

![image](https://github.com/hashgraph/guardian/assets/79293833/47475bbd-88e1-408b-be84-457c8f9d3e73)

8. The VVB now has to provide their name.

![image](https://github.com/hashgraph/guardian/assets/79293833/94abc453-21d7-4d3d-8062-1fc25e87e380)

9. Once the VVB’s name is set, the VVB waits for SR to approve it.

![image](https://github.com/hashgraph/guardian/assets/79293833/8975fd6c-43b6-431f-b614-57bbf70b4c18)

10. Now we log in as SR and approve the VVB.

![image](https://github.com/hashgraph/guardian/assets/79293833/c3f7f4d8-08e0-4098-a53f-753d8bc4c1b3)

11. Log in as the Project Proponent and assign the VVB to the project using the dropdown.

![image](https://github.com/hashgraph/guardian/assets/79293833/cbfccdb5-ad4d-4199-9980-1558972cc193)

12. Once the VVB is assigned, the VVB will now have access to the project for validation/verification.

![image](https://github.com/hashgraph/guardian/assets/79293833/dd7ce508-7ef5-4e26-a38b-0f008f436b41)

13. Once validated, we log in as Project Proponent and add a monitoring report.

![image](https://github.com/hashgraph/guardian/assets/79293833/5782a0e9-c0d6-4fff-9c54-ad78b9ef673f)

![image](https://github.com/hashgraph/guardian/assets/79293833/6bf3d42b-7a80-4209-87f1-f14d54bc802b)


14. Once the report is submitted, we now log in as the VVB and validate the monitoring report by clicking on the “Verify” button.

![image](https://github.com/hashgraph/guardian/assets/79293833/039cd75a-86e6-4441-9d25-8963f57b3002)

15. Once the monitoring report is validated, we log in as the SR and click on “Mint” to mint the tokens.

![image](https://github.com/hashgraph/guardian/assets/79293833/e143df83-3d3d-4b49-b4a8-5c73dc50426a)

16. Once minting is completed, we can view tokens in the “VPs” tab

![image](https://github.com/hashgraph/guardian/assets/79293833/42024c80-4d0f-44dc-86dd-bccbfd789bea)

17. The TrustChain can also be viewed by clicking on the “View TrustChain” button:

![image](https://github.com/hashgraph/guardian/assets/79293833/0313dde1-af3f-4389-b942-2bd3a7daa8b0)

![image](https://github.com/hashgraph/guardian/assets/79293833/9917befe-0345-4895-b032-d19d6ea35949)




















