## Verra VM0007 REDD+ Methodology

**Policy Description**: 

This policy supports the tokenization of carbon offsets, specifically Verified Carbon Units (VCUs) in accordance with Verra’s Verified Carbon Standard (VCS), and specifically, the VM0007 REDD+ Methodology Framework (REDD+ MF). Verra develops and manages standards that are globally applicable and advance action across a wide range of sectors and activities. The VCS Program is the world’s most widely used voluntary GHG program. 

The workflow is designed to reflect the general roles and processes of the VCS program. The VM0007 REDD+ is a dynamic modular methodology, and the specific requirements vary depending on the specific project activities and context. The schema was designed to capture the monitoring parameters required for the Avoiding Planned Deforestation (ADP) project type. Projects that involve other project types, and specific contexts, such as projects that involve harvesting commercial timber, may have additional parameter and MRV requirements. 


**Workflow Description**:

The workflow begins with the Project Proponent submitting the project description (PD) to Verra. The project description will include ex-ante estimates of the monitoring parameters, as well as other project details to demonstrate alignment with the VCS program requirements. Verra then adds the PD and project docs to the Project Pipeline and Project Registry. Next the Validation and Verification Body (VVB) will assess and validate the PD and provide a Validation Report. Then the Project Proponent will conduct monitoring and develop a Monitoring Report, replacing the ex-ante estimates with ex-post MRV data and submit it to the VVB. The VVB then verifies the Monitoring Report and delivers a Verification Report, Verification Representation, and Verification Statement. Finally, Verra reviews the issuance request and VCUs and are issued to the Project Proponent.

In future iterations, the workflow will begin with the Project Proponent completing a questionnaire to determine the appropriate methodology, modules, and MRV requirements. Then branch functionality can enable the automatic creation of context-specific schemas.

Roles in the below Workflow Diagram are represented as follows : Project Proponent (Blue), Verra (Orange), VVB (Green)


![image](https://user-images.githubusercontent.com/79293833/186554269-b68a5631-b4bd-4e40-9daf-e0afc443ff39.png)

**Note** :
For Demo purpose, we have uploaded two versions of Verra Policies into IPFS and created Timestamps, which are mentioned in the below table.


**Verra REDD Versions and their IPFS timestamps:**

| Version | IPFS Timestamp | Policy File Link | Version Differences |
|---|---|---|---:|
| Verra 1.1.0  | 1674823276.261149647 | [Link](https://github.com/hashgraph/guardian/blob/main/Demo%20Artifacts/Verra/Verra%20Redd/VM0007/Policies/Verra%20REDD.policy) | Verra Methodology |
| Verra 2.2.2 | 1674823441.956296415 | [Link](https://github.com/hashgraph/guardian/blob/main/Demo%20Artifacts/Verra/Verra%20Redd/VM0007/Policies/Verra%20REDD%20Policy%202.policy) | Verra 1.1.0 + revoke actions |
| Verra REDD Policy 3 groups | 1674823642.126585003 | [Link](https://github.com/hashgraph/guardian/blob/main/Demo%20Artifacts/Verra/Verra%20Redd/VM0007/Policies/Verra%20REDD%20Policy%203%20groups%20(1663846582.307635866).policy) | Demonstrates the usage of private groups, which accept members by invitation, and multi-signature approvals. The VVB role has been changed, in this new version it is an 'organisation' groupping multiple individual identities/users. When a project proponent selects a VVB it is no longer represented by a single identity/user, but by an organisation where multiple individuals can approve the project. |

In addition to the above Policy Versions, we have also added Schema Design Template file for demo purpose. Please check : [Sample Design Template](https://github.com/hashgraph/guardian/blob/main/Demo%20Artifacts/Verra/Verra%20Redd/VM0007/REDD%20APD%20Schema%20Design%20Template.xlsx)

For step by step user guide to execute Verra Policy, please refer to https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/verra-redd+-demo-guide.

