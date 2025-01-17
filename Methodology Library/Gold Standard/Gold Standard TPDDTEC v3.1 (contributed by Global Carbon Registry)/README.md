# GCR Policy Template Methodologies

Global Climate Registry is a carbon registry which leverages Hedera Guardian as a core piece of technology to create customised policies/methodologies and onboard different players in the development of a carbon offset project such as project developers, auditors, credit buyers etc. GCR has create a template policy with a fixed steps flow so that different methodologies can be onboarded by change of schemas.

GCR has created a [Middleware API](https://documenter.getpostman.com/view/23057894/2sA3Bj8ZD8) in order to perform policy operations in Guardian technology and further functionalities using hedera SDK. Apart from registry, GCR has also built social infrastructure to bring the carbon community together on a platform.

## GCR policy template

GCR platform is a one stop solution for carbon offset project creation. It has a step by step process to create a project and onboard different players/users involved in the project's development. Please view our policies subdirectory to get details on specific methodologies.

### Every policy requires three user roles and one optional user role: 
- Standard Registry (Global Climate Regitry)
- Project Developer/Project Proponent
- Validation and Verification Body (VVB)/auditor
- Credit Buyer (Optional)

### Policy Schemas:
- Project Developer Application
- VVB Application
- Project Listing Application
- Project Design Document
- Validation Report 
- Monitoring Report
- Verification Report
- Registry Final Mint


### Policy workflow performed through GCR Guardian Middleware API ([API documentation](https://documenter.getpostman.com/view/23057894/2sA3Bj8ZD8)): 

- Project Developer application (PDA) submission by the project developer user role 
- VVB application (VVBA) submission by the VVB user role
- Project listing application (PLA) with general information of the project to be submitted by the project developer
- Project design document (PDD) with details, documentation and design of the project that will be executed by the project developer
- Project developer to assign appropriate VVB for review of the PDD
- Validation report submission by the assigned VVB after reviewing the project design document
- After the validation report has been submitted, Project developer will execute the project on ground as per the design and submit Monitoring Report (MR)
- Project developer will assign appropriate VVB for review of the MR
- VVB will review the MR and submit a Verification report to the project developer as well as the standard registry
- Standard Registry to review the Verification Report and issue appropriate amount of carbon credits to the project developer hedera account

GCR is continously improving the GCR Guardian Middleware API and will continue to provide up-to-date changes and latest versions. 

## A demo of GCR platform to generate Guardian credits 

- Different users will first sign up to the GCR platform and then apply for specific user roles (Project developer/VVB). 
- Once reviewed and approved by the GCR registry then Project developer can go ahead and create a project profile on the plaform by submitting PLA. They can also add all the documents, images, videos etc. about the project on the project profile
- Project Developer can also create an organisation on the platform to represent their entity.
- Once the project is approved and published on the platform, the project developer can submit the Project Design Document and the workflow of the policy as mentioned above will be triggered

Below is a demo video of how a project creation, development and credits minting process takes place on the guardian platform. 

[![GCR Workflow Demo](https://i3.ytimg.com/vi/GarMI-1Y-7s/maxresdefault.jpg)](https://www.youtube.com/watch?v=GarMI-1Y-7s&t=528s&ab_channel=StellaZhou)

---
Since this demo video we have gone through several rounds of improvements and added functionalities. We will be providing a latest demo of the platform soon.

## Policy Versioning

GCR's policies will continue to evolve and new policies are being developed by us, We will do our best effort to update them within this repository.

## GCR Project Workflow Architecture

<img width="1232" alt="Global Climate Registry Project Workflow" src="https://github.com/saharshkhicha18/guardian/assets/71884962/255ad96f-4005-42d5-93e4-f37ff30c87d4">


## GCR Platform Features and Step by Step Project Creation, Execution and carbon credits minting

- General Sign Up/Login to the platform

<img width="1674" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/1fcaff30-a8e4-4249-9a4b-e57e9a2b97d4">

- Browse Project or Organisations, Create Posts, Buy Carbon Credits from a particular project ( Once the payment is successful, hedera credits for the project will be transferred to the buyer account)

  Browse Projects
  <img width="1897" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/c6e8a102-8ec5-4897-bc55-9fae730d11f7">

  Browse/Join organisations
  <img width="1897" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/031523ac-d86a-438d-9296-e49d941931de">

  Buy Carbon credits from a project
  <img width="1897" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/61fbbaea-3dbb-4969-b544-b0fcf5cef9ed">

  Creating Posts/engaging with the community
  <img width="1897" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/fff8a251-d4de-40ea-8378-d24e2db833d9">


- Project Creation/Execution
  
  1. In order for creation of project, first you will apply for the Project Developer or Validator role. Once approved by the registry admin then project developers can create a project by filling out the project listing application

    <img width="1897" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/01409b7f-25da-4bd3-a160-7810c5ea614b">

  2. Once the project has been approved and published by the registry, PLA will reciprocate on the guardian through out middleware API. Then the Project Developer and Validator can go through the aforementioned flow

     <img width="1897" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/143cb7fa-d064-4a5f-bf11-c952a7da037d">

  3. Registry can review at the final step and decide to mint appropriate amount of carbon credits

     <img width="1055" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/fb42f62d-1d2c-4aa9-9c84-664682bcadd1">

- Credit Retirement/Certificate

    Carbon Credit owners can purchase/retire tokens through middleware Api where the corresponding carbon credits will be deleted on hedera blockchain

    <img width="1268" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/8b69099a-9b2c-4c6d-bd40-c83693a6e3fa">

    <img width="1562" alt="image" src="https://github.com/saharshkhicha18/guardian/assets/71884962/c83342e7-0b79-4730-8757-9101d3202763">










