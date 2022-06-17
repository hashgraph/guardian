# iREC Demo UI Guide

This folder contains a sample file that is referenced in the Demo Guide

1. New iREC Policy ([iRec Policy 3.zip)](https://github.com/hashgraph/guardian/tree/main/Demo%20Artifacts)

1.The Guardian reference implementation comes with two predefined users:

1. Issuer (Standard Registry)
2. Participant

2\. After running the installation commands, open a tab on your browser and navigate to [http://localhost:3000/](http://localhost:3000/). Typically, the way we start the reference implementation demonstration is by logging in as an Issuer. Click the Demo Admin Panel drop-down located in the upper right-hand corner of the login screen and select the Issuer user.

3\. You will now be prompted to configure your Issuer account. Press the Generate button to generate a Hedera Operator ID and an Operator Key and enter the name of your Standard Registry. Press Connect when finished. This will now create Hedera Consensus Service Topics, fill the account with test hBar, create a DID document, create a Verifiable Credential, etc.

![](../.gitbook/assets/iREC\_0.png)

4\. This could be one of the most interesting parts of the reference implementation. Now we will be creating the Policy. We have two ways to "create policies." The first way is to import an existing policy. This is the easiest way to get started. When you import a policy, all schemas and tokens that are required in the policy are automatically populated. To do this, you can use the sample policy that we have already uploaded to IPFS by entering the Hedera Message IDs.

```
1655293847.166673000 (new iREC Policy)
```

![](../.gitbook/assets/iREC\_1.png)

Once Policy is imported successfully, click on "Publish" button to publish the policy.

5\. Click on Issuer’s profile icon and select "Log Out." We will now go back into the Admin Panel. This time we will select Registrant.

6\. Now, we can click on the Policies tab. This is where the specific actions required by the Policy Workflow will be found. We can click the Open button to the right of the iREC Policy, the Issuer created. This is where the custom user will be able to assign the role that was created by Issuer during the workflow creation process. In our case, we created the custom role of Registrant so the user will need to select the Registrant role from the drop down.

![](../.gitbook/assets/iREC\_3.png)

After selecting the Registrant role, we will see the form that is based on the imported Policy. This form is a Registrant Application.

![](../.gitbook/assets/iREC\_4.png)

Once Submitted, Registrant waits for the approval of the application by Issuer.

7\. Registrant associates the Token by going to Profile tab and clicking on Associated icon.

![](../.gitbook/assets/iREC\_5.png)

8\. The next step of our flow is to log out and sign back in as an Issuer. Navigate to the Policies tab and click the Open button on the far right. Here you will find the approval actions based on our Policy Workflow required by Issuer. You will be able to view the Verifiable Credential prior to approval by selecting the View Document link. Once you are ready to approve the document, you can click on the Approve button.

![](../.gitbook/assets/iREC\_6.png)

![](../.gitbook/assets/iREC\_7.png)

9\. After the approval process, the Issuer grants KYC to the Registrant by going to Tokens tab and clicking on Grant KYC button.

![](../.gitbook/assets/iREC\_8.png)

10\. Once the Registrant application is approved by Issuer, we log back in as Registrant and register for a new Device for sending MRV Data by clicking on Create New Device

![](../.gitbook/assets/iREC\_9.png)

Registrant fills out all the Device Registrant details and clicks on OK. Once completed, the Registrant waits for the approval from the Issuer.

![](../.gitbook/assets/iREC\_10.png)

11\. Now we log out and log back in as Issuer. Navigate to Devices tab in the Policy. Device details can be viewed by clicking on View Document. Once you are ready to approve the document, you can click on the Approve button.

![](../.gitbook/assets/iREC\_11.png)

12\. Once approved, we now log back in as Registrant and navigate to Devices tab and will create Issue request by clicking on Create Issue Request.

![](../.gitbook/assets/iREC\_12.png)

For now, we will be adding it manually, but in future, we will be automating the process by fetching the data from the device.

![](../.gitbook/assets/iREC\_13.png)

After submitting the data, the Registrant is waiting for approval from the Issuer.

![](../.gitbook/assets/iREC\_14.png)

13\. Now, we logout from Registrant and log back to Issuer, we navigate to Issue Requests tab in Policies and once we are ready to approve the document, you can click on Approve button.

![](../.gitbook/assets/iREC\_15.png)

14\. Once the token issuance is complete, we log out and log back to Registrant, we will navigate it to Token History tab to check the Token IDs being issued.

![](../.gitbook/assets/iREC\_16.png)

15\. We can also check Token Balance in the Tokens tab under Profile.

![](../.gitbook/assets/iREC\_17.png)

16\. We can also check Token History by logging back as Issuer.

![](../.gitbook/assets/iREC\_18.png)

We have the option of viewing TrustChain. You can view TrustChain by clicking on View TrustChain button.

The Trust Chain view displays essential elements that can be publicly discovered. Elements include token information, Policy information, and all the essential information regarding the Verifiable Credentials that make up the Verifiable Presentation. You will notice "Cards" on the bottom of the screen. Those cards are Verifiable Credentials displayed in chronological order.

![](../.gitbook/assets/iREC\_19.png)
