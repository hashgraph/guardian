---
description: Policy developed by Envision Blockchain
---

# 🎍 Verra VM0017 REDD+ Methodology

* [Policy Description](verra-vm0017-redd+-methodology.md#policy-description)
* [Workflow Description](verra-vm0017-redd+-methodology.md#workflow-description)
* [Policy Guide](verra-vm0017-redd+-methodology.md#policy-guide)

**For more Verra Redd+ VM0017 policy information, please visit the Envision Blockchain-contributed open-source Guardian policy page** [**here**](https://github.com/hashgraph/guardian/tree/main/Methodology%20Library/Verra/Verra%20Redd/VM0017)

## **Policy Description**:

The Verra VM0017 methodology is used to measure the emissions reductions that result from sustainable land management in agriculture. VM0017 can be used to monitor the emissions reductions that result from various project activities that increase the amount of carbon stored in agricultural areas. These activities can include the use of cover crops, improved farming techniques, and agroforestry. This methodology can be used in different agricultural regions, but it only applies in situations where the soil organic carbon levels would stay the same or decrease without the project. Currently, there are 26 VM0017 projects listed on Verra’s registry and a total of 10,457,449 (tCO2e) estimated annual emission reductions."

The workflow is designed to reflect the general roles and processes of the VCS program. The VM0017 REDD is a dynamic modular methodology, and the specific requirements vary depending on the specific project activities and context. The schema was designed to capture the monitoring parameters required for the Avoiding Planned Deforestation (ADP) project type. Projects that involve other project types, and specific contexts, such as projects that involve harvesting commercial timber, may have additional parameter and MRV requirements.

## **Workflow Description**:

The workflow begins with the Project Proponent submitting the project description (PD) to Verra. The project description will include ex-ante estimates of the monitoring parameters, as well as other project details to demonstrate alignment with the VCS program requirements. Verra then adds the PD and project docs to the Project Pipeline and Project Registry. Next the Validation and Verification Body (VVB) will assess and validate the PD and provide a Validation Report. Then the Project Proponent will conduct monitoring and develop a Monitoring Report, replacing the ex-ante estimates with ex-post MRV data and submit it to the VVB. The VVB then verifies the Monitoring Report and delivers a Verification Report, Verification Representation, and Verification Statement. Finally, Verra reviews the issuance request and VCUs and are issued to the Project Proponent.

In future iterations, the workflow will begin with the Project Proponent completing a questionnaire to determine the appropriate methodology, modules, and MRV requirements. Then branch functionality can enable the automatic creation of context-specific schemas.

Roles in the below Workflow Diagram are represented as follows : Project Proponent (Blue), Verra (Orange), VVB (Green)

<figure><img src="../../../.gitbook/assets/image (89).png" alt=""><figcaption></figcaption></figure>

## Policy Guide

Typically, the way we start the demonstration is by logging in as a Standard Registry.

Create a Standard Registry user if you haven't done so already.

You'll now be prompted to configure your Standard Registry account. Go through the user profile setup screen. At the last step of the user profile screen, Standard Registry users will need to fill out the Standard Registry attribute form (see screenshot below). Press Connect when finished. This will now initialize the Guardian instance on the correct Hedera Consensus Service Topics, create a DID document, create a Verifiable Credential, etc.

<figure><img src="../../../.gitbook/assets/image (111).png" alt=""><figcaption></figcaption></figure>

Now we will be creating the Policy. Click on the "Policies" tab and select "Policies." We have two ways to create policies.

For this demo guide, we will use the "Import from Open Source" way. Click on that button and find the policy for this guide and click on the import button.

Once the policy is imported successfully, you get two options: Publish and Dry Run mode. We select the Dry Run option and select Go.

<figure><img src="../../../.gitbook/assets/image (105).png" alt=""><figcaption></figcaption></figure>

Create additional users by clicking the “Create User” button.

<figure><img src="../../../.gitbook/assets/image (107).png" alt=""><figcaption></figcaption></figure>

Once the users have been created go to each one and assign the appropriate role (i.e. Project Proponent and VVB).

<figure><img src="../../../.gitbook/assets/image (11) (3) (1).png" alt=""><figcaption></figcaption></figure>

Go to the Standard Registry profile and approve the VVB in the “Approve VVB” tab.

<figure><img src="../../../.gitbook/assets/image (71) (1).png" alt=""><figcaption></figcaption></figure>

Click on the Project Proponent profile and select “New Project”.

<figure><img src="../../../.gitbook/assets/image (41) (2).png" alt=""><figcaption></figcaption></figure>

Now, we can input all the project details and data associated with the project in the “New Project” form. In the schema Excel file, if the final CRU calculations do not result in a positive integer, selecting "Ok" after completing the form will trigger errors.

<figure><img src="../../../.gitbook/assets/image (69) (1).png" alt=""><figcaption></figcaption></figure>

To proceed with the flow, the next step is to access the Standard Registry profile and include the project in the project pipeline. This can be achieved by navigating to the "Project Pipeline" tab and selecting the "Add" option.

<figure><img src="../../../.gitbook/assets/image (112).png" alt=""><figcaption></figcaption></figure>

Next, proceed to the Project Proponent profile and locate the "Projects" section. Then, click on the downward arrow and assign the VVB to the project.

<figure><img src="../../../.gitbook/assets/image (85) (1).png" alt=""><figcaption></figcaption></figure>

After successfully assigning the VVB to the project, the next step is to access the VVB profile and click on the "validate" option located in the Projects tab.

<figure><img src="../../../.gitbook/assets/image (70) (1).png" alt=""><figcaption></figcaption></figure>

Navigate back to the Project Proponent profile to complete the monitoring report. In the Projects tab select “Add Report”.

<figure><img src="../../../.gitbook/assets/image (82).png" alt=""><figcaption></figcaption></figure>

Upon selecting "Add Report", a file will open containing the project details and schemas previously filled out. Here, you can update the information based on the relevant monitoring plan provided by the methodology. After updating the information and including a project area map, you may click on "Ok" to proceed.

Once you have completed the monitoring report, please access the VVB profile and go to the monitoring reports tab. Here, you will find a "Verify" button - select that to proceed.

<figure><img src="../../../.gitbook/assets/image (76).png" alt=""><figcaption></figcaption></figure>

This is the final step in the workflow. Access the Standard Registry profile and navigate to the "Monitoring Reports" tab. Here, you will find a "Mint" button - select that to mint the tokens for this monitoring period.

<figure><img src="../../../.gitbook/assets/image (91).png" alt=""><figcaption></figcaption></figure>

By accessing the "Token History" tab, you can view the number of tokens that have been minted. Additionally, clicking on the "View TrustChain" button will allow you to view the TrustChain.

<figure><img src="../../../.gitbook/assets/image (86).png" alt=""><figcaption></figcaption></figure>

The Trust Chain view presents critical elements that are publicly available for discovery, such as token information, policy information, and all the necessary details concerning the Verifiable Credentials comprising the Verifiable Presentation. On the bottom of the screen, you will find "Cards" showcasing the Verifiable Credentials in chronological order.

<figure><img src="../../../.gitbook/assets/image (36) (2).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (99).png" alt=""><figcaption></figcaption></figure>
