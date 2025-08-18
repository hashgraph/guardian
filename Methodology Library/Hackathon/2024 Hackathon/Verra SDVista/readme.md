## Table of contents
<!-- TOC -->

- [Table of contents](#table-of-contents)
- [Introduction](#introduction)
- [Why SDVista Program?](#why-sdvista-program)
- [A note on modular approach and scalability](#a-note-on-modular-approach-and-scalability)
- [SDVista Modules Integration Process](#sdvista-modules-integration-process)
- [Module Descriptions](#module-descriptions)
- [Workflow](#workflow)
- [Resources](#resources)
- [Roles Description](#roles-description)
- [Important Documents \& Schemas](#important-documents--schemas)
- [Tokens (Claims, Labels, and Assets)](#tokens-claims-labels-and-assets)
- [Integration Guide (Video)](#integration-guide-video)
- [Next Steps](#next-steps)

<!-- /TOC -->

## Introduction

The [SD VISta Program](https://verra.org/programs/sd-verified-impact-standard/) is a comprehensive framework designed to demonstrate and verify the sustainable development benefits of various projects. It focuses on assessing and quantifying the contributions of projects towards the United Nations Sustainable Development Goals (SDGs), promoting transparency, credibility, and accountability in the process. SD VISta's framework is strengthened by a robust set of principles, criteria, and procedures that ensure the integrity and reliability of project assessments.

## Why SDVista Program?

One of the key advantages of the SD VISta Program is its alignment with the United Nations Sustainable Development Goals (SDGs). The SDGs provide a universal language and a shared vision for achieving a more sustainable, equitable, and prosperous world. By linking projects to specific SDG targets and indicators, SD VISta enables project proponents to demonstrate their direct contributions to these global goals. This alignment not only enhances the credibility and relevance of projects but also facilitates the aggregation and comparison of sustainable development impacts across different sectors and geographies. The program offers a flexible and adaptable approach to suit the diverse needs and contexts of projects worldwide, fostering accountability, transparency, and stakeholder engagement.

## A note on modular approach and scalability

This submission is not a policy, but rather a set of reusable [modules](https://docs.hedera.com/guardian/guardian/standard-registry/policies/modules/modules-using-ui) which can be plugged in to any of the existing Verra policies live on Guardian. Currently, all the policies on Guardian from a specific standard registry, follow the same workflow and it's very cumbersome & repetitive to develop new methodologies that way.

To make life of policy developers easier, it's important to leverage capabilities of [modules](https://docs.hedera.com/guardian/guardian/standard-registry/policies/modules/modules-using-ui) and design new policies in a way where modules are first class citizens.

## SDVista Modules Integration Process 
   - The SD VISta Program is designed as a modular system on Guardian, allowing seamless integration with other policies.
   - It offers 4 major outputs(detailed description in next section):
        - Verra SDG Lifecycle Module
        - Proponent SDG Lifecycle Module
        - VVB SDG Lifecycle Module
        - Customizable schemas for SDG Registration, SDG Monitoring Reports according to policy/project
   - To integrate the SD VISta modules into an existing policy workflow, following steps are required:
        1. Import the SDG Registration Schema and SDG Monitoring Report Schema into the policy.
        2. Define the tokens (CLAIM, ASSET or LABEL)
        3. Configure the policy to include the SD VISta modules for Project Proponents, VVBs, and the Verra Registry.
        4. Define the interactions and data flow between the SD VISta modules and the existing policy components.
        5. Customize the SD VISta modules, if necessary, to align with the specific requirements and context of the policy.

## Module Descriptions

**Verra SDG Lifecycle Module**

- Input Variables:
  - SDG Registration Schema: Defines the structure and fields for registering a project's SDGs.
  - SDG Token: Specifies the type of SDG token (Claim, Label, or Asset) to be minted for the project.
  - SDG MR Schema: Defines the structure and fields for reporting the project's SDG monitoring results.

- Input Events:
  - SDG Registration Approved & Reassigned by VVB to Verra: Triggered when the VVB approves the SDG registration and reassigns it to Verra for final review.
  - SDG Registration Rejected & Reassigned by VVB to Verra: Triggered when the VVB rejects the SDG registration and reassigns it to Verra for further action.
  - SDG MR Approved & Reassigned by VVB to Verra: Triggered when the VVB approves the SDG monitoring report and reassigns it to Verra for final review.
  - SDG MR Rejected & Reassigned by VVB to Verra: Triggered when the VVB rejects the SDG monitoring report and reassigns it to Verra for further action.

- Output Events:
  - SDGs registered and associated to project: Triggered when the SDGs are successfully registered and associated with the project.
  - SDG Tokens Minted: Triggered when the SDG tokens (Claims, Labels, or Assets) are minted for the project.

**Proponent SDG Lifecycle Module**

- Input Variables:
  - VVB Registration Schema: Defines the structure and fields for registering a VVB.
  - SDG Registration Schema: Defines the structure and fields for registering a project's SDGs.
  - SDG MR Schema: Defines the structure and fields for reporting the project's SDG monitoring results.
  - Project Proponent Role: Specifies the role of the Project Proponent in the SD VISta Program.

- Input Events:
  - SDG Registration Approved & Reassigned by VVB: Triggered when the VVB approves the SDG registration and reassigns it to the Project Proponent.
  - SDG Registration Rejected & Reassigned by VVB: Triggered when the VVB rejects the SDG registration and reassigns it to the Project Proponent for revision.
  - SDG MR Approved & Reassigned by VVB: Triggered when the VVB approves the SDG monitoring report and reassigns it to the Project Proponent.
  - SDG MR Rejected & Reassigned by VVB: Triggered when the VVB rejects the SDG monitoring report and reassigns it to the Project Proponent for revision.

- Output Events:
  - New Monitoring Report: Triggered when the Project Proponent submits a new SDG monitoring report.
  - New VVB Assignment: Triggered when the Project Proponent assigns a new VVB to the project.
  - Revoke SDG Registration: Triggered when the Project Proponent revokes the SDG registration.
  - Revoke SDG MR: Triggered when the Project Proponent revokes the SDG monitoring report.

**VVB SDG Lifecycle Module**

- Input Variables:
  - VVB Registration Schema: Defines the structure and fields for registering a VVB.
  - SDG Registration Schema: Defines the structure and fields for registering a project's SDGs.
  - SDG MR Schema: Defines the structure and fields for reporting the project's SDG monitoring results.
  - VVB Role: Specifies the role of the VVB in the SD VISta Program.

- Input Events:
  - New Monitoring Report: Triggered when a new SDG monitoring report is submitted by the Project Proponent.
  - New VVB Assignment: Triggered when a new VVB is assigned to the project.
  - Revoke SDG Registration: Triggered when the SDG registration is revoked by the Project Proponent.
  - Revoke SDG MR: Triggered when the SDG monitoring report is revoked by the Project Proponent.

- Output Events:
  - SDG Registration Approved & Reassigned by VVB: Triggered when the VVB approves the SDG registration and reassigns it to the Project Proponent.
  - SDG Registration Rejected & Reassigned by VVB: Triggered when the VVB rejects the SDG registration and reassigns it to the Project Proponent for revision.
  - SDG MR Approved & Reassigned by VVB: Triggered when the VVB approves the SDG monitoring report and reassigns it to the Project Proponent.
  - SDG MR Rejected & Reassigned by VVB: Triggered when the VVB rejects the SDG monitoring report and reassigns it to the Project Proponent for revision.
  - SDG Registration Approved & Reassigned by VVB to Verra: Triggered when the VVB approves the SDG registration and reassigns it to Verra for final review.
  - SDG Registration Rejected & Reassigned by VVB to Verra: Triggered when the VVB rejects the SDG registration and reassigns it to Verra for further action.
  - SDG MR Approved & Reassigned by VVB to Verra: Triggered when the VVB approves the SDG monitoring report and reassigns it to Verra for final review.
  - SDG MR Rejected & Reassigned by VVB to Verra: Triggered when the VVB rejects the SDG monitoring report and reassigns it to Verra for further action.

## Workflow

1. **Project Registration**
   - The Project Proponent creates a new project and submits the required information using the SDG Registration Schema separately.

2. **VVB Assignment**
   - The Project Proponent assigns a Validation and Verification Body (VVB) to independently assess the project's compliance with SD VISta requirements.
   - The VVB reviews the project documentation and conducts necessary validation activities.
   - On successful verfication, Verra Registry reviews the submitted SDG registration and approves the project for SDVista program claims.

3. **Monitoring and Reporting**
   - The Project Proponent implements the project and monitors its progress and impacts based on the registered monitoring plan.
   - The Project Proponent submits monitoring reports using the SDG Monitoring Report Schema at regular intervals.

4. **Verification**
   - The assigned VVB verifies the monitoring reports and assesses the project's achievement of claimed sustainable development benefits.
   - The VVB submits the verification report to the Verra Registry.

5. **Issuance of SD VISta Claims, Labels, or Assets**
   - Based on the successful verification, the Project Proponent can request the issuance of SD VISta Claims, Labels, or Assets.
   - The Verra Registry reviews the issuance request and approves the issuance of the respective tokens.

## Resources

First version of each module and schema is published to the Hedera network and can be imported via Github (.module/.schema file) or IPFS timestamp. 

- *Verra SDG Lifecycle Module* - 1712591656.056560003
- *Proponent SDG Lifecycle Module* - 1712591641.992293012
- *VVB SDG Lifecycle Module* - 1712591627.346617003

<img width="1420" alt="image" src="https://github.com/gautamp8/guardian/assets/9518151/e266f147-c2bf-43f4-866b-3a4cc21baf04">

## Roles Description
 
- Project Proponent - The project proponent is responsible for executing the sustainable development project. They must adhere to the requirements outlined by the SD VISta Program and provide evidence of the sustainable development benefits achieved. Upon successful verification, the project proponent can make SD VISta claims, request SD VISta labels, or receive SD VISta assets, depending on the project's specific objectives and outcomes.
  
- Verification and Validation Body (VVB) - The VVB plays a critical role in independently validating and verifying the project data submitted by the project proponent. They assess the project's compliance with SD VISta principles, criteria, and procedures, ensuring the accuracy and reliability of the claimed sustainable development benefits. Based on their evaluation, the VVB either approves or rejects the project registration and monitoring reports.
    
- Verra Registry – The Verra Registry acts as the central hub for SD VISta projects. It is responsible for project registration, document management, and the issuance of SD VISta claims, labels, or assets. The registry ensures the integrity and transparency of the SD VISta Program by maintaining a secure and auditable record of all project-related information.

## Important Documents & Schemas
  
**SDG Registration Schema** - The SDG Registration Schema is a comprehensive data structure that captures all the necessary information for registering a project's sustainable development goals (SDGs) under the SD VISta Program. It includes fields such as project proponent information, project details, targeted SDGs, their baseline scenarios, and monitoring plans. This schema ensures a standardized and consistent approach to documenting and assessing a project's intended contributions to the SDGs.

**SDG Monitoring Report Schema** – The SDG Monitoring Report Schema is a structured data format used to report on the progress and achievements of a project's sustainable development goals (SDGs) over a specific monitoring period. It includes fields for reporting on key performance indicators, data collection methods, stakeholder engagement, and progress towards the targeted SDG outcomes. This schema enables project proponents to provide transparent and verifiable evidence of their project's sustainable development impacts.

## Tokens (Claims, Labels, and Assets)

The SD VISta Program offers three types of tokens that projects can generate to showcase their sustainable development benefits:

1. **SD VISta Claims** - An SD VISta Claim is a formal statement about a project's unique sustainable development benefits that have been independently verified by a Validation and Verification Body (VVB). Claims provide credibility and recognition for a project's contributions to specific Sustainable Development Goals (SDGs) or other sustainable development outcomes. Project proponents can use these claims to communicate their project's positive impacts to stakeholders, investors, and the wider public.

2. **SD VISta Labels** - An SD VISta Label is a visual marker that can be affixed to other sustainability units or credits, such as Verified Carbon Units (VCUs) or Renewable Energy Certificates (RECs), to indicate that the project associated with those units has additional verified sustainable development benefits. Labels enhance the value and marketability of the associated units by providing buyers with assurance of the project's holistic sustainability impacts. Projects that have been successfully verified under both the SD VISta Program and a complementary standard are eligible to receive SD VISta Labels.

3. **SD VISta Assets** - An SD VISta Asset is a tradable unit representing a specific quantified sustainable development benefit, such as the amount of time saved through the adoption of improved cookstoves or the number of individuals provided with access to clean water. Assets are issued based on the quantification and verification of sustainable development benefits using SD VISta methodologies. These assets can be traded, retired, or used to demonstrate a project's measurable contributions to the SDGs. The sale of SD VISta Assets can provide additional revenue streams for project proponents, supporting the long-term sustainability and scalability of their initiatives.

These tokens provide flexibility for projects to showcase their sustainable development benefits in different ways, depending on their specific goals, target audiences, and market demands. By generating SD VISta Claims, Labels, or Assets, projects can enhance their credibility, attract investment, and contribute to the global effort to achieve the Sustainable Development Goals.

## Integration Guide (Video)

Here's a demonstration of how to go about integrating module in existing VM0044 policy - [Youtube](https://youtu.be/6TMg662ATAU)

## Next Steps

1. **Schema Customization** - Update the SDG Registration Schema and SDG Monitoring Report Schema to reflect the specific fields and requirements of different SD VISta methodologies, such as the Time Savings from Improved Cookstoves methodology. This customization will ensure that the schemas capture the relevant data points and indicators for each project type.

2. **Auto-Calculation of Fields** - Implement auto-calculation functionalities within the schemas to automatically derive certain fields based on the provided input data. This will streamline the data entry process, reduce errors, and ensure consistency in calculations across projects.

3. **Integration with External MRV Systems** - Explore integration opportunities with external systems, such as geospatial platforms, data repositories, or impact measurement tools. This integration will enable the seamless exchange of data, enhance the accuracy and reliability of monitoring and reporting, and provide additional insights for project assessment and decision-making.
