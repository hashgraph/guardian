# GCR Policy Template Methodologies

Global Climate Registry is a carbon registry which leverages Hedera Guardian as a core piece of technology to create customised policies/methodologies and onboard different players in the development of a carbon offset project such as project developers, auditors, credit buyers etc. GCR has create a template policy with a fixed steps flow so that different methodologies can be onboarded by change of schemas.

GCR has created a [Middleware API](https://documenter.getpostman.com/view/23057894/2sA3Bj8ZD8) in order to perform policy operations in Guardian technology and further functionalities using hedera SDK. Apart from registry, GCR has also built social infrastructure to bring the carbon community together on a platform.

## GCR policy template

GCR platform is a one stop solution for carbon offset project creation. It has a step by step process to create a project and onboard different players/users involved in the project's development. Please view our policies subdirectory to get details on specific methodologies.

Every policy requires three user roles and one optional user role: 
- Standard Registry (Global Climate Regitry)
- Project Developer/Project Proponent
- Validation and Verification Body (VVB)/auditor
- Credit Buyer (Optional)

Policy Schemas:
- Project Developer Application
- VVB Application
- Project Listing Application
- Project Design Document
- Validation Report 
- Monitoring Report
- Verification Report
- Registry Final Mint


Policy workflow performed through GCR Guardian Middleware API ([API documentation](https://documenter.getpostman.com/view/23057894/2sA3Bj8ZD8)): 

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


