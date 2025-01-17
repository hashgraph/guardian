## Table of Contents
<!-- TOC -->
- Policy Description
- Workflow Description
- Policy Guide
- Token (VCU)
<!-- End of TOC -->

## Policy Description
Verra's VM0048 methodology, formally known as "Reducing Emissions from Deforestation and Forest Degradation (REDD)", represents a significant advancement in the approach to forest conservation projects within the Verified Carbon Standard (VCS) Program. Launched on 27 November 2023, it encompasses activities aimed at preventing illegal logging and providing alternative livelihood sources to support local communities and biodiversity preservation. This initiative aligns with the global effort to mitigate climate change by addressing the 12 to 20 percent of global greenhouse gas (GHG) emissions attributed to deforestation.

VM0048 aims to ensure the integrity of greenhouse gas accounting across projects within a jurisdiction, leveraging the latest science, data, and technologies. This methodology requires the use of modules for specific activity types, including a module for Avoiding Unplanned Deforestation (VMD0055), with modules for forest degradation and planned deforestation under development. Its approval marks a critical step towards standardized, accurate emission reductions calculations for projects combating deforestation.

One of the transformative aspects of VM0048 is its focus on improving the integrity of carbon credit valuation within the Voluntary Carbon Market. The previous system allowed project developers and their technical consultants to choose methodologies and set project baselines, which led to the issuance of credits that might not reflect the true value of the emission reductions. This practice resulted in over-valuation and over-crediting in some cases. VM0048 addresses these challenges by centralizing the sourcing of deforestation data for baseline setting, requiring the use of data from vetted Data Service Providers (DSPs). This ensures a uniform data basis for all project developers within the same jurisdiction, provided by Verra, thereby enhancing the process's integrity from the outset.

The methodology introduces a jurisdictional approach to carbon accounting, which is essential for large-scale, enduring forest protection. By aligning both private and public finance and leveraging government authority to regulate land use, this approach targets the root causes of deforestation more effectively. Moreover, the establishment of a single deforestation dataset for a given jurisdiction and the allocation of baseline data based on deforestation risk assessments aim to ensure that emission reductions are calculated more accurately and transparently.

The introduction of VM0048 and its module for Avoiding Unplanned Deforestation (VMD0055) strengthens the VCS Program for issuing carbon credits to projects aimed at reducing emissions from deforestation. It represents a step forward in establishing high-integrity, scalable methodologies for forest conservation, potentially leading to a significant impact on the value and authenticity of REDD+ carbon credits globally.

## Workflow Description

![Workflow Diagram](https://github.com/user-attachments/assets/4e1ac2bb-e171-40ba-9761-f8f8014453c0)


1. **Project Proponent Submission**: The project proponent begins by submitting the Project Description to Verra. This document includes ex-ante estimates of monitoring parameters and detailed project information demonstrating compliance with VCS program requirements.

2. **Module Selection and Data Analysis**: After the initial submission, the Project Proponent selects appropriate modules (e.g., VMD0055 for avoiding unplanned deforestation) and collects data for baseline establishment and analysis as guided by VM0048 and the chosen modules.

3. **Validation Process**:
    - **Verra's Initial Review**: Verra reviews the submitted Project Design and adds the project to the Project Pipeline.
    - **Validation by VVB**: A Validation and Verification Body (VVB) assesses the PD, focusing on the alignment with VCS requirements, and provides a Validation Report.

4. **Monitoring and Reporting**:
    - **Ex-post Monitoring and Reporting**: The Project Proponent conducts monitoring activities as per the project plan and develops a Monitoring Report. This replaces the ex-ante estimates with ex-post Monitoring, Reporting, and Verification (MRV) data.
    - **Submission to VVB**: The Monitoring Report is submitted to the VVB for verification. 

5. **Verification and Issuance**:
    - **VVB's Verification**: The VVB verifies the Monitoring Report and issues a Verification Report, Verification Representation, and Verification Statement.
    - **Issuance Request Review and VCUs Issuance**: Verra reviews the issuance request. Upon approval, Verified Carbon Units (VCUs) are issued to the Project Proponent's account in the registry.

6. **Project Implementation and Continuous Monitoring**:
    - Implement the project activities as planned, applying the VM0048 framework and the relevant modules (e.g., VMD0055) for specific activity types like avoiding unplanned deforestation.
    - Continuously monitor the project's impact according to the established methodology and guidelines, updating the project documentation and reporting to Verra as required.

7. **Ongoing Validation and Verification**:
    - Engage with a VVB for periodic validation and verification as per Verra’s requirements and the project's monitoring plan to ensure ongoing compliance and to validate the emission reductions achieved over time.

## Policy Guide
This policy can be imported via Github (.policy file) or IPFS timestamp.

| Version | IPFS Timestamp | Policy File Link | Version Differences |
|---|---|---|---:|
| VM0048 2.0.0  | 1734561802.996119000 | [Link](https://github.com/hashgraph/guardian/tree/main/Methodology%20Library/Verra/VM0048) | Verra Methodology |

### Available Roles
- Project Proponent - The project proponent is responsible for executing the emission reduction project. The project proponent must adhere to the requirements outlined by Verra’s VCS program and provide evidence of the emission reductions achieved. Upon successful verification, the project proponent receives Verified Carbon Units (VCU) as an incentive sfor their emission reductions.
  
- Verification and Validation Body (VVB) - The VVB plays a critical role in independently verifying and validating the project data submitted by the project proponent. They thoroughly assess the project's emission reduction potential, methodologies, and adherence to the policy guidelines. Based on their evaluation, the VVB either approves or rejects the project for registration.
    
- Standard Registry (Verra) – With Verra as the registry they take on responsibilities that encompass project intake, pipeline management, and final review of project descriptions and monitoring reports. This process ensures that emission reduction projects meet the highest standards before tokens are issued.

### Important Documents & Schemas

- **VM0048** - [Link to Methodology on Verra](https://verra.org/methodologies/vm0048-reducing-emissions-from-deforestation-and-forest-degradation-v1-0/) - VM0048 is a methodology under Verra's Verified Carbon Standard that provides a framework for projects aiming to reduce emissions from deforestation and forest degradation. 
- **VM0055 v1.1** - [Link to Module on Verra](https://verra.org/methodologies/vmd0055-estimation-of-emission-reductions-from-avoiding-unplanned-deforestation-v1-1/) - VMD0055 is a module that complements the VM0048 methodology, focusing specifically on avoiding unplanned deforestation.
- **VT0001** - [Link to Additionality Tool on Verra](https://verra.org/methodologies/vt0001-tool-for-the-demonstration-and-assessment-of-additionality-in-vcs-agriculture-forestry-and-other-land-use-afolu-project-activities-v3-0/) - This tool helps project developers demonstrate the additionality of their projects, a critical component in the carbon crediting process. Additionality refers to the requirement that carbon credits should only be issued for emissions reductions or removals that would not have occurred in the absence of the project. VT0001 guides users through the process of proving that their project's impacts are additional, ensuring that projects contribute genuine, measurable environmental benefits beyond a business-as-usual scenario.
- [VCS Tool for AFOLU Non-Permanence Risk Analysis and Buffer Determination](https://verra.org/wp-content/uploads/2023/10/AFOLU-Non-Permanence-Risk-Tool-v4.2-last-updated-May-3-2024.pdf) - Used to assess the risks of non-permanence (i.e., the reversal of carbon sequestration) in Agriculture, Forestry, and Other Land Use projects and to determine the appropriate buffer credits that need to be set aside in a pooled buffer account, which serves as insurance against potential carbon stock losses, ensuring the environmental integrity of the project.
  - As of January 1, 2024, stakeholders must use the new version of the AFOLU NPRT and the Risk Assessment Calculator for all project requests. The Project Proponent should append the Risk Report to the Guardian platform as images as part of the Project Description.
- **CDM Tool for Estimation of direct nitrous oxide emission from nitrogen fertilization** - [Inactive](https://cdm.unfccc.int/methodologies/ARmethodologies/tools/ar-am-tool-07-v1.pdf/history_view)
- **Project Design** - Project Participant information, standard project information, methodology information like baseline emissions, project emissions, etc.

- **Monitoring Report** – The monitoring report is to be filled out based on the monitoring plan mentioned within the methodology.

## Token (Verified Carbon Units)
Verified Carbon Unit (VCU) credits, each equivalent to one tonne of CO2.
