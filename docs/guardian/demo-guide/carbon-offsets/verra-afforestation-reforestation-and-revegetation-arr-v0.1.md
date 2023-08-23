---
description: Policy developed by Envision Blockchain
---

# 🌲 Verra Afforestation, Reforestation, and Revegetation (ARR) v0.1

* [Policy Description](verra-afforestation-reforestation-and-revegetation-arr-v0.1.md#policy-description)
* [Workflow Description](verra-afforestation-reforestation-and-revegetation-arr-v0.1.md#workflow-description)
* [Policy Guide](verra-afforestation-reforestation-and-revegetation-arr-v0.1.md#policy-guide)

**For more Verra Afforestation, Reforestation, and Revegetation (ARR) policy information, please visit the Envision Blockchain-contributed open-source Guardian policy page** [**here**](https://github.com/hashgraph/guardian/tree/main/Methodology%20Library/Verra/Verra%20Redd/VerraARR)

## **Policy Description**:

The Verra Afforestation, Reforestation, and Revegetation (ARR) methodology not only quantifies the carbon removal potential of afforestation, reforestation, and revegetation projects, but it also takes into account the emissions resulting from the burning of biomass and the use of nitrogen fertilizer. This comprehensive approach ensures that the net GHG emissions reduction resulting from the project is accurately quantified, verified, and credited. The methodology establishes guidelines for project design, implementation, and monitoring to assess the project's impact on local biodiversity and social and economic conditions, as well as address potential risks. The methodology promotes sustainable land use practices that contribute to mitigating climate change, support the conservation of biodiversity, and incentivize the adoption of more sustainable land use practices. The Verra Afforestation, Reforestation, and Revegetation (ARR) methodology is a newly developed set of guidelines and procedures by Verra for quantifying and verifying greenhouse gas emissions reductions resulting from afforestation, reforestation, and revegetation projects. The methodology is still under development and has not yet been released.

## **Workflow Description**:

The workflow begins with the Project Proponent submitting the project description (PD) to Verra. The project description will include ex-ante estimates of the monitoring parameters, as well as other project details to demonstrate alignment with the VCS program requirements. Verra then adds the PD and project docs to the Project Pipeline and Project Registry. Next the Validation and Verification Body (VVB) will assess and validate the PD and provide a Validation Report. Then the Project Proponent will conduct monitoring and develop a Monitoring Report, replacing the ex-ante estimates with ex-post MRV data and submit it to the VVB. The VVB then verifies the Monitoring Report and delivers a Verification Report, Verification Representation, and Verification Statement. Finally, Verra reviews the issuance request and VCUs and are issued to the Project Proponent.

In future iterations, the workflow will begin with the Project Proponent completing a questionnaire to determine the appropriate methodology, modules, and MRV requirements. Then branch functionality can enable the automatic creation of context-specific schemas.

Roles in the below Workflow Diagram are represented as follows : Project Proponent (Blue), Verra (Orange), VVB (Green)

<figure><img src="../../../.gitbook/assets/image (97).png" alt=""><figcaption></figcaption></figure>

## Policy Guide

Typically, the way we start the demonstration is by logging in as a Standard Registry.&#x20;

Create a Standard Registry user if you haven't done so already.

You'll now be prompted to configure your Standard Registry account. Go through the user profile setup screen. At the last step of the user profile screen, Standard Registry users will need to fill out the Standard Registry attribute form (see screenshot below). Press Connect when finished. This will now initialize the Guardian instance on the correct Hedera Consensus Service Topics, create a DID document, create a Verifiable Credential, etc.

<figure><img src="../../../.gitbook/assets/image (38) (2).png" alt=""><figcaption></figcaption></figure>

Now we will be creating the Policy. Click on the "Policies" tab and select "Policies." We have two ways to create policies.&#x20;

For this demo guide, we will use the "Import from Open Source" way. Click on that button and find the policy for this guide and click on the import button.

Once the policy is imported successfully, you get two options: Publish and Dry Run mode. We select the Dry Run option and select Go.

<figure><img src="../../../.gitbook/assets/image (24) (2).png" alt=""><figcaption></figcaption></figure>

Create additional users by clicking the “Create User” button. Once the users have been created go to each one and assign the appropriate role (i.e. Project Proponent and VVB).

<figure><img src="../../../.gitbook/assets/image (102).png" alt=""><figcaption></figcaption></figure>

Go to the Standard Registry profile and approve the VVB in the “Approve VVB” tab.

<figure><img src="../../../.gitbook/assets/image (96) (1).png" alt=""><figcaption></figcaption></figure>

Click on the Project Proponent profile and select “New Project”.

<figure><img src="../../../.gitbook/assets/image (28) (2).png" alt=""><figcaption></figcaption></figure>

Now, we can input all the project details and data associated with the project in the “New Project” form. In the schema Excel file, if the final CRU calculations do not result in a positive integer, selecting "Ok" after completing the form will trigger errors. In this demo guide, we have provided a link to an Excel file containing demo values that can be utilized to test the policy.

<figure><img src="../../../.gitbook/assets/image (80).png" alt=""><figcaption></figcaption></figure>

To proceed with the flow, the next step is to access the Standard Registry profile and include the project in the project pipeline. This can be achieved by navigating to the "Project Pipeline" tab and selecting the "Add" option.

<figure><img src="../../../.gitbook/assets/image (40) (2).png" alt=""><figcaption></figcaption></figure>

Next, proceed to the Project Proponent profile and locate the "Projects" section. Then, click on the downward arrow and assign the VVB to the project.

<figure><img src="../../../.gitbook/assets/image (78).png" alt=""><figcaption></figcaption></figure>

After successfully assigning the VVB to the project, the next step is to access the VVB profile and click on the "validate" option located in the Projects tab.

<figure><img src="../../../.gitbook/assets/image (81).png" alt=""><figcaption></figcaption></figure>

Navigate back to the Project Proponent profile to complete the monitoring report. In the Projects tab select “Add Report”.

<figure><img src="../../../.gitbook/assets/image (94).png" alt=""><figcaption></figcaption></figure>

Upon selecting "Add Report", a file will open containing the project details and schemas previously filled out. Here, you can update the information based on the relevant monitoring plan provided by the methodology. After updating the information and including a project area map, you may click on "Ok" to proceed. (For this demo, we utilized the same values from the provided Excel file.)

<figure><img src="../../../.gitbook/assets/image (88).png" alt=""><figcaption></figcaption></figure>

Once you have completed the monitoring report, please access the VVB profile and go to the monitoring reports tab. Here, you will find a "Verify" button - select that to proceed.

<figure><img src="../../../.gitbook/assets/image (39) (2).png" alt=""><figcaption></figcaption></figure>

This is the final step in the workflow. Access the Standard Registry profile and navigate to the "Monitoring Reports" tab. Here, you will find a "Mint" button - select that to mint the tokens for this monitoring period.

<figure><img src="../../../.gitbook/assets/image (59) (2).png" alt=""><figcaption></figcaption></figure>

By accessing the "Token History" tab, you can view the number of tokens that have been minted. Additionally, clicking on the "View TrustChain" button will allow you to view the TrustChain.

<figure><img src="../../../.gitbook/assets/image (98).png" alt=""><figcaption></figcaption></figure>

The Trust Chain view presents critical elements that are publicly available for discovery, such as token information, policy information, and all the necessary details concerning the Verifiable Credentials comprising the Verifiable Presentation. On the bottom of the screen, you will find "Cards" showcasing the Verifiable Credentials in chronological order.

<figure><img src="../../../.gitbook/assets/image (74) (1).png" alt=""><figcaption></figcaption></figure>
