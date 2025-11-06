---
description: >-
  In this Demo Guide we will describe the user journey for the Verra policy
  workflow,  including the users that are involved within the creation of the
  Verra policy.
---

# Verra Redd\_3 User Journey Demo UI Guide

**Here are the users that will be involved within this Verra policy demo UI:**

1. Standard Registry
2. VVB
3. VVB 2
4. Project Proponent

You will need to run the installation commands, open a tab on your browser and navigate to [http://localhost:3000/](http://localhost:3000/).

In this demo we will import the Verra REDD Policy.

### Verra REDD\_3 for the Standard Registry

Here in this demo from the standard registry we are creating an account, importing the REDD\_3 policy, approving the submission from other users and minting the policy.

**Step 1**

The first step is that you will need to either login in to your account that you have previously created or create a new account.

To create a new account you will need to click on “Create new” which will then lead you to the page to add the necessary information.

<figure><img src="../../../.gitbook/assets/image (205).png" alt=""><figcaption></figcaption></figure>

_**Note: You can also access the ‘Demo Admin Panel’ where you can just select the ‘Verra’ for demo purposes.**_

<figure><img src="../../../.gitbook/assets/image (214).png" alt=""><figcaption></figcaption></figure>

**Step 2**

Once you have added the correct details to configure your account, you will need to either use your own Hedera credentials or, if you do not have them, press the **“Generate”** button to generate a Hedera Operator ID and an Operator Key. This will create your Hedera Consensus Service Topic, show your hBar balance, DID document and a Verifiable Credential etc. Then click on **“Next”**.

<figure><img src="../../../.gitbook/assets/image (207).png" alt=""><figcaption></figcaption></figure>

You will need to follow the step below to Configure your account. Here you will need to configure your account. You will need to enter the details shown in the image below.

<figure><img src="../../../.gitbook/assets/image (201) (1).png" alt=""><figcaption></figcaption></figure>

**Step 3**

Once you have completed the previous steps you can see the navigation menu and select **“Policies”** . After you have selected “Policies” you will have the two options to either **“Create Policy”** or **“Import”** a policy.

\
In this case we want to **“import**” a policy which will also import all schemas and tokens, which will be automatically populated.

<figure><img src="../../../.gitbook/assets/image (212).png" alt=""><figcaption></figcaption></figure>

**Step 4**

Once you have decided that you want to import a specific Verra Policy, you will need to choose one of the following Hedera message IDs.

For this demo we will use the Verra REDD 3.

Once you have chosen one, you will add this to the ‘Hedera message Timestamp’ pop up which will then allow you to preview the policy. If you intend to import this policy as a new version of another that you have already been using, just select which policy you wish to refer to under the **“Version of”**. Once you have done your preview you can click on **“Import”**.

<figure><img src="../../../.gitbook/assets/image (213).png" alt=""><figcaption></figcaption></figure>

**Step 5**

Once the policy has been imported successfully, you can see the options to either **“Publish”** or **“Dry Run”** (test run of the policy) .

<figure><img src="../../../.gitbook/assets/image (198).png" alt=""><figcaption></figcaption></figure>

**Step 6**

We will then want to add the version of the REDD 3 policy, we will just add this policy as the 1st version and then click on **“Publish”**.

<figure><img src="../../../.gitbook/assets/image (215).png" alt=""><figcaption></figcaption></figure>

After we have clicked on **“publish”** we see the policy is now with the status **“Published”**.

<figure><img src="../../../.gitbook/assets/image (202).png" alt=""><figcaption></figcaption></figure>

**Step 7 ( only continue once the VVB name is submitted)**

Under the “Policies” menu, click on **“Go”** for the desired policy name row and “Instance” column in order to access the various operations that are possible within. Once the VVB name is submitted for approval you will need to review the document and either **“Approve”** or **“Reject”**.

In this case we will approve the submission

<figure><img src="../../../.gitbook/assets/image (203) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (62) (2).png" alt=""><figcaption></figcaption></figure>

**Step 8 ( only continue once the Project Proponent is waiting to be added)**

Once the Project Proponent has completed their details regarding the Project, you will need to view their document and add them to the project. To do this you will select the **“Policies”** on the navigation menu, select the REDD\_3 policy and then the **“Project Pipeline”**. You can then see the Project Proponent waiting to be added.

<figure><img src="../../../.gitbook/assets/image (57).png" alt=""><figcaption></figcaption></figure>

Once you have clicked on the **“Add”** button you will have to wait for Validation.

<figure><img src="../../../.gitbook/assets/image (178).png" alt=""><figcaption></figcaption></figure>

**Step 9 ( only continue once the VVB 2 has verified the report)**

Once the project has been verified by the VVB 2, you can now click on the “Mint” button where you will mint the policy.

<figure><img src="../../../.gitbook/assets/image (52).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (165).png" alt=""><figcaption></figcaption></figure>

**Step 10**

Once the minting has been completed you will see the project on the “Token History” with the ability to click on to view the TrustChain.

<figure><img src="../../../.gitbook/assets/image (194).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (177).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (74) (2).png" alt=""><figcaption></figcaption></figure>

### Verra REDD\_3 flow for the VVB

Here in this demo for the VVB, we will show the VVB creating an account, submitting an application to the Standard Registry and delegating a role to the VVB 2.

**Step 1**

The first step is that you will need to either login in to your account that you have previously created or create a new account. To create a new account you will need to click on “Create new” which will then lead you to the pages which you will need to add your details to configure your account.

_**Note: You can also access the ‘Demo Admin Panel’ where you can just select the ‘VVB’ for demo purposes.**_

<figure><img src="../../../.gitbook/assets/image (124).png" alt=""><figcaption></figcaption></figure>

**Step 2**

Next you will want to set up your VVB role and select the Standard Registry (the entity responsible for establishing policy requirements and specifications) from the dropdown. You will need to either use your own Hedera credentials or, if you do not have them, press the **“Generate”** button to generate a Hedera Operator ID and an Operator Key. This will create your Hedera Consensus Service Topic, show your hBar balance, DID document and a Verifiable Credential etc, after that you will want to click on **“Submit”**.

<figure><img src="../../../.gitbook/assets/image (158).png" alt=""><figcaption></figcaption></figure>

After you have clicked on **“Submit”** your account is now configured.\\

<figure><img src="../../../.gitbook/assets/image (144).png" alt=""><figcaption><p>Step 3</p></figcaption></figure>

**Step 3**

After that you will want to click on the **“Policies”** on the navigation tab, then click on the **“Go”** button on the Verra policy which was created by the Standard Registry, in this case the REDD\_3 policy.

<figure><img src="../../../.gitbook/assets/image (133).png" alt=""><figcaption></figcaption></figure>

**Step 4**

Once we have clicked on the **“Go”** button we have the option to create a group or accept an invite. For now we can click on **“create a new group”** and select **“VVBs**” from the dropdown and create a **‘Group Label’** which in this case will be **‘VVB group**’. Once that is done click on the **“Ok”** button.

<figure><img src="../../../.gitbook/assets/image (117).png" alt=""><figcaption></figcaption></figure>

**Step 5**

After that we will need to create a VVB by entering the ‘VVB name’, which we will call this **“Test”**. Once completed you will need to click on **“Ok”** which will then be submitted for approval of the Standard Registry.

<figure><img src="../../../.gitbook/assets/image (127).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (168).png" alt=""><figcaption></figcaption></figure>

**Step 6 ( To continue once the Standard Registry has approved your application )**

Once you have been approved by the Standard Registry you can see the REDD\_3 Policy and now with the role of ‘VVB (manager)

<figure><img src="../../../.gitbook/assets/image (128).png" alt=""><figcaption></figcaption></figure>

Once you have clicked on the **“Go”** button ( shown on the image above ) you will then select the **“Members”** tab. You will then want to select **“Get Invite”**.

<figure><img src="../../../.gitbook/assets/image (157).png" alt=""><figcaption></figcaption></figure>

Next you will want to select the role as **“VVB”** and click on “Generate Invite”, after that you will see the link which will allow you to copy the invitation and give to the other entity, which in this case will be the VVB 2.

<figure><img src="../../../.gitbook/assets/image (114).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (186).png" alt=""><figcaption></figcaption></figure>

### Verra REDD\_3 flow for the VVB 2

Here in this demo for the VVB 2, we will show the VVB 2 creating an account, accepting the invitation from the VVB and verifying the report for the standard registry.

**Step 1**

The first step is that you will need to either login in to your account that you have previously created or create a new account.

Here we will create a new account for the second VVB for demo purposes.

Once you have filled in your ‘username’ ‘password’ and confirmed your password you will then want to **“create”** your account.

<figure><img src="../../../.gitbook/assets/image (143).png" alt=""><figcaption></figcaption></figure>

**Step 2**

Once you have completed the steps on creating your account you will want to select the standard registry from the dropdown. You will need to either use your own Hedera credentials or, if you do not have them, press the **“Generate”** button to generate a Hedera Operator ID and an Operator Key. This will create your Hedera Consensus Service Topic, show your hBar balance, DID document and a Verifiable Credential etc, after that you will want to click on **“Submit”**.

<figure><img src="../../../.gitbook/assets/image (131).png" alt=""><figcaption></figcaption></figure>

After you have clicked on **“Submit”** your account is now configured.

<figure><img src="../../../.gitbook/assets/image (147).png" alt=""><figcaption></figcaption></figure>

**Step 3**

Here you will want to select **“Accept Invitation”** and paste the invite given by the other VVB and then click on **“Ok”**.

<figure><img src="../../../.gitbook/assets/image (163).png" alt=""><figcaption></figcaption></figure>

**Step 4**

You will then be able to access the REDD\_3 and the **“Projects”** tab and either **“Sign”** or **“Decline”**. For now we will click on **“Sign”**.

Here we are signing the policy that has been validated to the standard registry.

<figure><img src="../../../.gitbook/assets/image (134).png" alt=""><figcaption></figcaption></figure>

**Step 4 ( To continue once the Project Proponent has added their Monitoring Report)**

Once the Project Proponent has submitted their report we can see the report on the “Monitoring Reports” tabs, waiting for verification. We can either **“Sign”** or **“Decline”** the report.

Here we will select **“Sign”**.

<figure><img src="../../../.gitbook/assets/image (184).png" alt=""><figcaption></figcaption></figure>

After we have clicked on **“Sign”** we will now see the report status as Verified.

<figure><img src="../../../.gitbook/assets/image (126).png" alt=""><figcaption></figcaption></figure>

### Verra REDD\_3 for the Project Proponent

Here in this demo for the Project Proponent, we will show the Project Proponent creating a new project, adding a report and account details.

**Step 1**

The first step is that you will need to either login in to your account that you have previously created or create a new account.

_**Note: You can access the ‘Demo Admin Panel’ where you can just select the ‘Project Proponent’ for demo purposes.**_

<figure><img src="../../../.gitbook/assets/image (124) (1).png" alt=""><figcaption></figcaption></figure>

**Step 2**

You will want to set up your Project Proponent role and select the standard registry from the dropdown. You will need to either use your own Hedera credentials or, if you do not have them, press the **“Generate”** button to generate a Hedera Operator ID and an Operator Key. This will create your Hedera Consensus Service Topic, show your hBar balance, DID document and a Verifiable Credential etc, after that you will want to click on **“Submit”**.

<figure><img src="../../../.gitbook/assets/image (156).png" alt=""><figcaption></figcaption></figure>

After you have clicked on **“Submit”** your account is now configured.

<figure><img src="../../../.gitbook/assets/image (125).png" alt=""><figcaption></figcaption></figure>

**Step 3**

You will want to click on the **“Policies”** menu item tab, you can click on the **“Go”** button on the Verra policy which was created.

<figure><img src="../../../.gitbook/assets/image (121).png" alt=""><figcaption></figcaption></figure>

**Step 4**

Once we have clicked on the **“Go”** button we have the option to create a group or accept an invite. For now we can click on **“create a new group”** and select **“Project\_Proponent”** from the dropdown and create a **‘Group Label’** which in this case the example will be **‘PP’** ( this can be any value that you wish to Label ). Once that is done click on the **“Ok”** button.

<figure><img src="../../../.gitbook/assets/image (197).png" alt=""><figcaption></figcaption></figure>

**Step 5**

Once completed you will then want to select **“Projects”** and click on **“New Project”**.

<figure><img src="../../../.gitbook/assets/image (135).png" alt=""><figcaption></figcaption></figure>

For this new project we will want to fill in the correct required information and once completed you will want to click on **“Ok”**.

<figure><img src="../../../.gitbook/assets/image (129).png" alt=""><figcaption></figcaption></figure>

Once completed you can see the project that you have created and now you are waiting to be added by the Standard Registry.

<figure><img src="../../../.gitbook/assets/image (183).png" alt=""><figcaption></figcaption></figure>

Then you will need to wait to be validated as well.

<figure><img src="../../../.gitbook/assets/image (164).png" alt=""><figcaption></figcaption></figure>

**Step 6 (To continue once you have be validated)**

Once the Standard Registry has added you to the project you can now see that you have been validated.

<figure><img src="../../../.gitbook/assets/image (123).png" alt=""><figcaption></figcaption></figure>

**Step 7**

Once validated you will then want to click on **“Add Reports”** and fill in the required fills, once completed click on **“Ok”**.

<figure><img src="../../../.gitbook/assets/image (188).png" alt=""><figcaption></figcaption></figure>

You will then be able to see the report that you have just added by clicking on **“Monitoring Reports”** which then shows as it **‘Waiting for Verification’**. which then you will need to wait for verification to be approved.

<figure><img src="../../../.gitbook/assets/image (170).png" alt=""><figcaption></figcaption></figure>

For more information about different Verra REDD versions and their IPFS timestamps, you can click [here](https://github.com/hashgraph/guardian/tree/main/Methodology%20Library/Verra/Verra%20Redd) to see the Methodology Library for Verra Redd.
