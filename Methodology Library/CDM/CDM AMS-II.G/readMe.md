## Table of content
<!-- TOC -->

- Introduction
- Need and Use for the AMS-II.G Policy
- Demo Video
- Policy Workflow
- Policy Guide
  - Available Roles
- Important Documents & Schemas
- Token (Carbon Credit)
  - Step By Step
<!-- /TOC -->

## Introduction

Access to clean cooking is a pressing global challenge, with billions of people still relying on traditional biomass fuels for their cooking needs, leading to immense human and environmental costs. In this context, the Clean Development Mechanism (CDM) offers a promising pathway to address this issue by introducing energy-efficient thermal energy generation units that utilize non-renewable biomass. AMS-II.G aims to promote sustainable development and mitigate greenhouse gas (GHG) emissions through the implementation of clean cookstove projects. 

AMS-II.G focuses on driving energy efficiency improvements in thermal applications that utilize non-renewable biomass. This entails the introduction of high-efficiency biomass-fired devices, such as cookstoves, ovens, or dryers, either by replacing existing inefficient appliances or by retrofitting current units to enhance their performance. By doing so, the methodology facilitates significant savings in non-renewable biomass consumption, resulting in reduced GHG emissions. This approach aligns with CDM's mission to foster projects that contribute to sustainable development while combatting climate change. 

The methodology's applicability is broad, encompassing single pot or multi-pot portable or in-situ cookstoves, as long as they meet a minimum efficiency threshold of 25%. To ensure credibility and compliance, project developers must adhere to specified testing and certification requirements, presenting relevant documentation to the Designated Operational Entity (DOE). 

By providing an accessible and standardized framework for clean cooking initiatives, AMS-II.G allows project developers to pursue carbon finance opportunities and attract investments from governments, companies, and individuals seeking to support climate action and sustainable development. 

Currently, the AMS-II.G Guardian policy uses the Thermal Energy Output (TEO) testing method to estimate fuel consumption, which plays a crucial role in determining the energy efficiency of thermal applications and evaluating associated emissions. As the policy undergoes future iterations, additional testing methods such as the water boiling test (WBT), controlled cooking test (CCT), and kitchen performance test (KPT) will be integrated to further enhance the accuracy and effectiveness of fuel consumption estimation. Moreover, the policy includes modules like tool 30 and tool 33, which can be utilized for default values or to calculate fNRB (non-renewable biomass fraction), a parameter that is used in the emission reductions calculation.  

## Need and Use for the AMS-II.G Policy

A methodology like AMS-II.G is needed to address the universal challenge of guaranteeing access to clean cooking. In developing countries, more than 3 billion people, representing a substantial portion of the global population, still rely on traditional biomass fuels for their primary cooking needs using open fires or traditional stoves. This reliance on solid-fuel cooking, such as wood, crop residues, and dung, leads to immense human costs in terms of health, environmental degradation, and economic burdens. 

Traditional cooking methods using solid fuels result in significant health issues due to indoor air pollution, affecting especially women and children who spend significant time near the open fires or traditional stoves. Moreover, burning solid fuels releases greenhouse gases (GHGs) like carbon dioxide and short-lived climate pollutants (SLCPs) such as black carbon, contributing to global climate change. Solid-fuel cooking is responsible for generating around 1.5-3.0% of global CO2 emissions. 

To combat these challenges and transition towards cleaner cooking practices, initiatives like AMS-II.G are essential. This methodology focuses on introducing energy-efficient thermal energy generation units that utilize non-renewable biomass, such as high-efficiency biomass-fired cookstoves, ovens, or dryers. By promoting the replacement of inefficient devices or retrofitting existing units, AMS-II.G aims to achieve significant savings in non-renewable biomass consumption and, subsequently, substantial reductions in GHG emissions. 

AMS-II.G provides a standardized and measurable framework for clean cooking projects, allowing for reliable estimation and verification of emission reductions. The Guardian AMS-II.G Policy offers a unique technical opportunity for companies to streamline, enhance robustness, and establish trust and transparency within their clean cookstove projects. The guidelines and equations provided in the methodology are incorporated into schemas featuring built-in auto-calculation blocks, emission factors, and data from modules like tool 33. The results of the data provided undergo immutable and transparent verification by third parties. Ultimately, the emissions are tokenized, elevating tracking, transparency, accounting, and reporting, with the data structured to comply with AMS-II.G reporting requirements. 

## Demo Video

[Youtube](https://www.youtube.com/watch?v=jfl72_fL6iU)

## Policy Workflow

<img width="1128" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/5adac491-8135-416c-b490-13d315ad3200">

## Policy Guide

This policy is published to Hedera network and can either be imported via Github (.policy file) or IPSF timestamp. 

Policy: 1698751171.908275443
Tool 30: 1690820465.670044734
Tool 33: 1690820484.707441003 

### Available Roles 
 
- Project Proponent - The project proponent is responsible for executing the emission reduction project. They develop and implement strategies to substitute fossil fuel-based lighting systems with LED/CFL lighting systems. The project proponent must adhere to the requirements outlined by the CDM and provide evidence of the emission reductions achieved. Upon successful verification, the project proponent receives certified emission reduction (CER) tokens as an incentive for their emission reductions.
- Verification and Validation Body (VVB) - The VVB plays a critical role in independently verifying and validating the project data submitted by the project proponent. They thoroughly assess the project's emission reduction potential, methodologies, and adherence to the policy guidelines. Based on their evaluation, the VVB either approves or rejects the project for registration.
- Designated National Authority (DNA) - The DNA is a governmental body representing the country where the emission reduction project is being implemented. They review and approve the project's eligibility in accordance with national policies and regulations. The DNA's endorsement is essential for the project to proceed with the AMS-III.AR policy.
- Registry (UNFCCC) - The United Nations Framework Convention on Climate Change (UNFCCC) serves as the registry for the CDM. They oversee the multiple workflow steps involved in the project's approval, including the verification and validation process by the VVB and the endorsement by the DNA. The UNFCCC's approval is necessary for the project's successful registration and issuance of CER tokens  

### Important Documents & Schemas 
  
**Project Description** - Project Proponent information, standard project information, methodology information, etc.

**Emissions Reduction** – Schema included within the project information form; this is filled out by the project proponent to calculate annual emission reductions. 

**Default Values (Tool 33)** - Tool 33 is included as a module within the policy. This module is used to calculate default values for common parameters like fNRB (Fraction of non-renewable biomass). 

**Monitoring Report** – The monitoring report is to be filled out based on the monitoring plan mentioned within the methodology.   

  
### Token(Carbon credit) 

Certified Emission Reduction (CER) credits, each equivalent to one tonne of CO2.

### Step By Step 

1. The policy can be imported using IPFS timestamp 1698751171.908275443

<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/f7ce2959-83e2-42fc-a593-04be5b7571ca">
    
2. Select “Import”.   

  <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/99221679-64e3-4763-b65d-c50b467be06d">

3. Place status in “Dry Run” and select “Go”.   

    <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/40427f17-8f97-4ee5-9951-d3bd3db6f68f">

4. By selecting the edit button in the operations tab, you can access the policy configurator and view the workflow blocks.   

   <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/c38c8066-945c-4adf-b313-c9a54253eeb4">
   
5. You can access and view the module by selecting the module tab in the policy configurator.   

  <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/7cc23951-d5e9-476e-80de-550ae0fdfc57">
   
6. Going back to the policy workflow, add users by selecting the “create user” button. Then select the dropdown user menu and select “Virtual User 1”. 

  	<img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/8aa6d18d-b294-4df6-a4c7-5edfcad79fcb">
   
7. Virtual User 1 will be assigned to the Project_Proponent 

    <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/5c83da48-5ced-493e-850c-1e214ddd419c">
   
8.	Virtual User 2 will be assigned to the VVB  
   
   <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/9f97d681-c013-4f84-b233-ff15d2ae16f4">
   
9. Add the VVBs name   

   <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/4a63774e-0c06-456e-89c0-c7c581d2b5d3">
  
10. The final role that will be assigned to Virtual User 3 is the Designated National Authority  

   <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/0c6c8fe9-a04f-4535-bb18-344bd941c44b">

11. Click on the Users dropdown menu and select Virtual User 1 (Project Proponent) and select the “New Project” button. 

   <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/b3ce8842-42f0-423d-966f-4450650d5393">

12. Once the form is completed, go to Virtual User 3’s (Designated National Authority) profile. The Designated National Authority can now view the project information document by selecting “view document” and then they can select validate or reject.   

    <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/eaf2aece-bf9e-4795-ae53-cb08186bc6a3">

13. Go to the Administrator’s (Standard Registry) profile. The Standard Registry can now approve the VVB.  

    <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/f0d961ac-ecf2-442b-80aa-34921ffe56f2">

14. Stay on the Administrator’s (Standard Registry) profile. The Standard Registry now has access to the project information document by clicking “view document” once they have reviewed it they can select “Add” to add the project to the project pipeline. 

    <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/377b906f-0104-412c-8eaf-d0f1b1b71124">

15. Navigate back to Virtual User 1’s (Project Proponent) profile and assign the VVB.   

   <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/4b2de5a5-c613-4fcb-bb7f-a40300a65aac">

16. Go to the Virtual User 2’s (VVB) profile. The VVB has access to the project form by selecting “View Document”. Then the VVB can select Verify or Reject.
    
    <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/d18f8029-fa28-414d-9f55-3aa495b23de7">

17. Navigate back to the Administrator and select Add.
    
    <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/fdfc9bb2-cb2e-4155-b44a-81f9132cf13d">

18. Navigate back to Virtual User 1’s (Project Proponent) profile and select “Add Report”.
    
    <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/995a132f-f2d5-47c9-a4be-901e4d6a27c6">

19. Go to the Virtual User 2’s (VVB) profile. The VVB has access to the monitoring report form by selecting “View Document”. Then the VVB can select Verify or Reject.

    <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/6a77e80d-c50f-41cd-a556-1aaf3889a623">
    
20. Navigate back to the Administrator’s profile and select the “Mint” button.
    
    <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/acc65977-0b20-48ca-bcdd-849644d3ba83">

21. The status should now say “Minted”. 

   <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/f403c692-c4b8-4cad-a441-35ba49f54bbf">

22. By selecting the “Token History” tab you can see the number of tokens minted and then you can select “View TrustChain”   

    <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/86feaf02-269f-4d6e-aa19-cc5c2e88e24a">
     
23. The Verified Presentation should now be open. You can view information like the recipient's name, token amount, mint date, verified signature, etc.   

    <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/3af1d037-5a15-4942-83ce-081d3d23b121">

24. By scrolling to the bottom of the page you can view the TrustChain. 

    <img width="800" alt="image" src="https://github.com/hashgraph/guardian/assets/79293833/acce2f97-3f34-4716-85be-7b0633ec7af8">
