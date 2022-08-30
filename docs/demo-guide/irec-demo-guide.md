# iREC Demo UI Guide

This folder contains a sample file that is referenced in the Demo Guide

1. New iREC Policy (`IRec Policy 4.policy`[)](https://github.com/hashgraph/guardian/tree/main/Demo%20Artifacts)

1.The Guardian reference implementation comes with two predefined users:

1. Standard Registry
2. Participant

2\. After running the installation commands, open a tab on your browser and navigate to [http://localhost:3000/](http://localhost:3000/). Typically, the way we start the reference implementation demonstration is by logging in as Standard Registry. Click the Demo Admin Panel drop-down located in the upper right-hand corner of the login screen and select Standard Registry user.

3\. You will now be prompted to configure your Standard Registry account. Press the Generate button to generate a Hedera Operator ID and an Operator Key and enter the details of your Standard Registry. Press Connect when finished. This will now create Hedera Consensus Service Topics, fill the account with test hBar, create a DID document, create a Verifiable Credential, etc.

![](../.gitbook/assets/iREC\_4.2.png)

4\. This could be one of the most interesting parts of the reference implementation. Now we will be creating the Policy. We have two ways to "create policies." The first way is to import an existing policy. This is the easiest way to get started. When you import a policy, all schemas and tokens that are required in the policy are automatically populated. To do this, you can use the sample policy that we have already uploaded to IPFS by entering the Hedera Message IDs.

```
iREC 1 : 1661166202.802071003
iREC 2 : 1661167347.064745885
iREC 3 : 1661372984.332898003
iREC 4 : 1661373147.975461003
```

![](../.gitbook/assets/iREC3\_new\_1.png)

Once clicked on OK, we have an option to Preview the Policy before importing it.&#x20;

<figure><img src="../.gitbook/assets/image (8) (2).png" alt=""><figcaption></figcaption></figure>

Once Policy is imported successfully, click on "Publish" button to publish the policy.

<figure><img src="../.gitbook/assets/image (14) (2).png" alt=""><figcaption></figcaption></figure>

5\. Click on Standard Registry's profile icon and select "Log Out." We will now go back into the Admin Panel. This time we will select Registrant.

6\. Now, we can click on the Policies tab. This is where the specific actions required by the Policy Workflow will be found. We can click the Open button to the right of the iREC Policy, the Standard Registry created. This is where the custom user will be able to assign the role that was created by Standard Registry during the workflow creation process. In our case, we created the custom role of Registrant so the user will need to select the Registrant role from the drop down.

![](../.gitbook/assets/iREC3\_new\_3.png)

<figure><img src="../.gitbook/assets/image (7) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../.gitbook/assets/image (6) (2).png" alt=""><figcaption></figcaption></figure>

After selecting the Registrant role, we will see the form that is based on the imported Policy. This form is a Registrant Application.

<figure><img src="../.gitbook/assets/image (30).png" alt=""><figcaption></figcaption></figure>

Once Submitted, Registrant waits for the approval of the application by Standard Registry.

7\. Registrant associates the Token by going to Profile tab and clicking on Associated icon.

<figure><img src="../.gitbook/assets/image (26).png" alt=""><figcaption></figcaption></figure>

8\. The next step of our flow is to log out and sign back in as Standard Registry. Navigate to the Policies tab and click the Open button on the far right. Here you will find the approval actions based on our Policy Workflow required by Standard Registry. You will be able to view the Verifiable Credential prior to approval by selecting the View Document link. Once you are ready to approve the document, you can click on the Approve button.

<figure><img src="../.gitbook/assets/image (4).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../.gitbook/assets/image (9) (2).png" alt=""><figcaption></figcaption></figure>

9\. After the approval process, Standard Registry grants KYC to the Registrant by going to Tokens tab and clicking on Grant KYC button.

<figure><img src="../.gitbook/assets/image (31) (1).png" alt=""><figcaption></figcaption></figure>

10\. Once the Registrant application is approved by Standard Registry, we log back in as Registrant and register for a new Device for sending MRV Data by clicking on Create New Device

<figure><img src="../.gitbook/assets/image (25).png" alt=""><figcaption></figcaption></figure>

Registrant fills out all the Device Registrant details and clicks on OK. Once completed, the Registrant waits for the approval from the Standard Registry.

<figure><img src="../.gitbook/assets/image (13) (1).png" alt=""><figcaption></figcaption></figure>

11\. Now we log out and log back in as Standard Registry. Navigate to Devices tab in the Policy. Device details can be viewed by clicking on View Document. Once you are ready to approve the document, you can click on the Approve button.

<figure><img src="../.gitbook/assets/image (2) (1).png" alt=""><figcaption></figcaption></figure>

12\. Once approved, we now log back in as Registrant and navigate to Devices tab and will create Issue request by clicking on Create Issue Request.

<figure><img src="../.gitbook/assets/image (10).png" alt=""><figcaption></figcaption></figure>

For now, we will be adding it manually, but in future, we will be automating the process by fetching the data from the device.

<figure><img src="../.gitbook/assets/image (24).png" alt=""><figcaption></figcaption></figure>

After submitting the data, the Registrant is waiting for approval from Standard Registry.

<figure><img src="../.gitbook/assets/image (15).png" alt=""><figcaption></figcaption></figure>

13\. Now, we logout from Registrant and log back as Standard Registry, we navigate to Issue Requests tab in Policies and once we are ready to approve the document, you can click on Approve button.

<figure><img src="../.gitbook/assets/image (1) (1).png" alt=""><figcaption></figcaption></figure>

14\. Once the token issuance is complete, we log out and log back to Registrant, we will navigate it to Token History tab to check the Token IDs being issued.

<figure><img src="../.gitbook/assets/image (29) (1).png" alt=""><figcaption></figcaption></figure>

15\. We can also check Token Balance in the Tokens tab under Profile.

<figure><img src="../.gitbook/assets/image (5) (1).png" alt=""><figcaption></figcaption></figure>

16\. We can also check Token History by logging back as Standard Registry.

<figure><img src="../.gitbook/assets/image (23).png" alt=""><figcaption></figcaption></figure>

We have the option of viewing TrustChain. You can view TrustChain by clicking on View TrustChain button.

The Trust Chain view displays essential elements that can be publicly discovered. Elements include token information, Policy information, and all the essential information regarding the Verifiable Credentials that make up the Verifiable Presentation. You will notice "Cards" on the bottom of the screen. Those cards are Verifiable Credentials displayed in chronological order.

<figure><img src="../.gitbook/assets/image (28).png" alt=""><figcaption></figcaption></figure>
