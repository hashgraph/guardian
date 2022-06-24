# Demo Usage Guide

### Usage Demo Guide Artifacts

This folder contains sample files that are referenced in the Demo Usage Guide

1. Sample Schema for iRec Policy (`iREC Schema.zip`)
2. Sample of iREC Policy (`IRec Policy 3.zip`)
3. Sample Policy Workflow configuration file (`irec-policy-config.txt`)

1.The Guardian reference implementation comes with two predefined users:

* **Standard Registry**: A standard registry, or a Standard Registry in our scenario, is an organization that establishes science-based standards for measuring, reporting, and verifying (MRV) ecological benefit claims and issues value in the form of credit for claims that meet the standard set. A standard registry also authorizes validation and verification bodies (VVBs) to collect and process claims based on the established standard. The creation of scientific-based standards for MRV is a rigorous discipline that requires independence from commercial influence in the pursuit of accurate accounting of benefit or emissions claims. A standard registry organization can also maintain a central registry of credits they have issued that can be sold directly via the registry itself or established as reference value on networks, exchanges, or marketplaces.
* **Auditor**: This is a 3rd part who will need to view/audit the entire chain of events; from the establishment of the science-based standards through creation of the credit.

There is also a _Custom Role_ which is called _User_. This role can be used to create any role which is necessary in a specific policy. For the reference implement below, we created a custom role called _Installer_ (later explained when we create a policy down below).

![](../.gitbook/assets/DUG\_1.png)

2\. After running the installation commands, open a tab on your browser and navigate to [http://localhost:3000/](http://localhost:3000). Typically the way we start the reference implementation demonstration is by logging in as the Standard Registry. Click the **Demo Admin Panel** drop-down located in the upper right-hand corner of the login screen and select the **Standard Registry** user.

![](../.gitbook/assets/DUG\_2.png)

{% hint style="info" %}
**Note**: Please wait for the Initialization Process to be completed.
{% endhint %}

3\. You'll now be prompted to configure your Standard Registry account. Enter all the mandatory fields and then Press the **Generate** button to generate a Hedera Operator ID and an Operator Key. Press **Connect** when finished. This will now create Hedera Consensus Service Topics, fill the account with test hBar, create a DID document, create a Verifiable Credential, etc.

![](../.gitbook/assets/iREC\_4.2.png)

**NOTE**

There is a new feature as of version 1.0.2 which allows for the _Importing of Policies_ from the Standard Registry Policy Tab. When you import a policy you will be able to skip steps 4, 5, 6, and 7. The steps 4 through 7 will be applicable if you want to create a policy from scratch. As of release 1.0.5 we have implemented the functionality to import a policy that has been uploaded to IPFS. This is done via a Hedera message ID. You will need to find the Hedera message ID for the demo policy in step 6 below.

4\. Next, we move over to the **Schemas** tab. Schemas are the structure of which Verifiable Credentials will be filled out. Remember the iRec Policy we mentioned at the beginning of the section? We will be creating the first step of that Policy; which is to create the following schemas: iRec registration applicant details, Inverter, and MRV Schemas. The current version of the solution allows you to either build schemas from scratch or import schemas. Please note, that when you build schemas from scratch and publish them, they will be uploaded into IPFS and then the message containing the IPFS CID is sent into the corresponding Hedera topic. In this guide, we have already uploaded sample schemas for you to use. To import the sample schemas, please click on the **Import** button and paste the following Hedera message IDs one by one:

![](../.gitbook/assets/iREC\_new\_1.png)

* `1644847084.945541771` (iRec Schema)
* `1644847093.979895804` (Inverter)
* `1644847107.415192828` (MRV)

Those Hedera message IDs correspond respectively to the iRec Application Details, Inverter and MRV Schemas.

Again this step is not needed if you import the entire policy (see step 6 and the discussion above).

5\. The next step of the flow is to create a token. Click the **Tokens** tab and click on **Create Token.** Here, we can fill out the necessary token information and token parameters such as Fungible/Non-Fungible (for this demo flow we will select Non-Fungible), Freeze, KYC, etc. For purposes of this demo, let us keep everything selected. When you click "OK", this action triggers Hedera Token Service to create the token on Hedera's Testnet. Clicking on the "Token ID" will bring you to the Dragon Glass Hedera Testnet explorer to track all token activity.

![](../.gitbook/assets/iREC\_new\_2.png)

6\. This could be one of the most interesting parts of the reference implementation. Now we will be creating the Policy. We have two ways to "create policies." The first way is to import an existing policy. This is the easiest way to get started. When you import a policy, as noted above, all schemas and tokens that are required in the policy are automatically populated. To do this, you can use the sample policy that we have already uploaded to IPFS. Click on the **import** button and enter the following Hedera message ID:

* `1650282926.728623821` (iRec Policy)

![](../.gitbook/assets/iREC\_new\_3.png)

Once you have done that, you can move onto step 8. If you'd like to build a policy from scratch, please continue reading below.

Click **Create Policy** and fill the required information in the dialog box. Please note that you will need to create new **Tag** and **Version** numbers for each policy. identical Tags and Versions will cause an error. Once the Policy is complete, we have just _**created our first Policy Workflow and Policy Action Execution instance!**_

![](../.gitbook/assets/iREC\_new\_4.png)

7\. On the right-hand side of the Policies tab, click the **Edit** button. This will open the Guardian's Policy workflow editor. As described in the Hedera Improvement Proposal 28 (HIP-28), a Policy Workflow contains:

* Policy Workflow Workgroups
* Policy Workflow Actions
* Policy Workflow State Objects
* Policy Workflow State Transactions

The quickest way to go through this demo while learning how to configure a Policy Workflow is to import the configPolicy.ts file. To do so, copy everything inside the `irec-policy-config.txt` file found within this folder. Go back into the Policy editor and click on the "code" icon on the upper right-hand side. Paste the mock configuration.

**NOTE**

If you build and run the Guardian manually (without using Docker containers), you need to replace the entry `http://message-broker:3003/mrv` with `http://localhost:3003/mrv` in the pasted text.

![](../.gitbook/assets/iREC\_new\_5.png)

Click on the "block" icon that is just to the right of the "code" icon. You'll notice that the Policy configuration editor now visually shows the Policy Workflow with all of the necessary Workgroups, Actions, State Objects, and Transactions. Click through on several blocks, and you'll notice that you can edit some elements on the right-hand side. Depending on what you are clicking on, different properties will display on the right-bottom box. You can edit properties from permissions, dependencies, tags, UI elements, etc.

In step 1 we discussed creating a custom role called installer. There is a default Policy Property box in the upper right corner of the UI. Here we will be able to add the name of our custom role. Click on add role and you can add the customer role of _Installer_

![](../.gitbook/assets/iREC\_new\_6.png)

To demonstrate how you can edit other workflow actions, you will need to click on the **mint\_token** block and select the token we created.

![](<../.gitbook/assets/iREC\_new\_7 (1).png>)

We will now press the **Save** button and the **Publish** button.

![](../.gitbook/assets/iREC\_new\_8.png)

8\. Click on the Standard Registry's profile icon and select "Log Out." We will now go back into the **Admin Panel**. This time we will select **Installer**

![](../.gitbook/assets/DUG\_12.png)

9\. When signing into the User profile (soon to be the Installer Role), follow similar configuration steps as the Standard Registry. Click the **Generate** button, then select **Submit**. After generating the Hedera Operating ID and Key, the Installer profile will be configured, test HBAR will be credited to the account, and a DID will be created.

![](../.gitbook/assets/iREC\_new\_9.png)

![](../.gitbook/assets/iREC\_new\_10.png)

10\. Next, navigate to the **Token** tab and click the **link** icon to associate the user to the token we created as the Standard Registry.

![](../.gitbook/assets/iREC\_new\_11.png)

11\. Now, we can click on the **Policies** tab. This is where the specific actions required by the Policy Workflow will be found. We can click the **Open** button to the right of the iRec Policy the Standard Registry created.

![](../.gitbook/assets/iREC\_new\_12.png)

This is where the custom user will be able to assign the role that was created by the Standard Registry during the workflow creation process. In our case, we created the custom role of _Installer_ so the user will need to select the _Installer_ role from the drop down.

![](../.gitbook/assets/iREC\_new\_13.png)

After selecting the Installer role, we will see the form that is based on the imported schema in step 4. This form is one of the Policy Workflow State Objects. Once you fill out the required information, press the **OK** button. Note: There is a known issue that no dialogue box comes up to let you know the form is completed. That's ok for now, we are working to provide a UI update. Everything works, so just move onto the next step :)

![](../.gitbook/assets/iREC\_new\_14.png)

12\. The next step of our flow is to log out and sign back in as the Standard Registry. Navigate to the **Policies** tab and click the **Open** button on the far right. Here you will find the approval actions based on our Policy Workflow required by the Standard Registry. You will be able to view the Verifiable Credential prior to approval by selecting the **View Document** link. Once you are ready to approve the document, you can click on the **Approve** button.

![](../.gitbook/assets/DUG\_18.png)

13\. Navigate to the **Tokens** tab and click on the blue people icon on the far right. This view shows the Standard Registry all of the users who have been associated with the tokens the Standard Registry created. We will now click the **Grant KYC** button.

![](../.gitbook/assets/iREC\_new\_16.png)

14\. We can now log out of the Standard Registry account and back in as the Installer. Navigate to the **Policies** tab and click the **Open** button on the far right. The next Policy Workflow Action required by the Installer is to register their sensors. Click the **New Sensors** button, fill out the required information in the dialog box, and select **OK**.

![](../.gitbook/assets/iREC\_new\_17.png)

15\. You'll notice that you just created a sensor (refreshing the page may be needed), and that sensor has been assigned a Decentralized Identifier and a Verifiable Credential. Click the **Configuration** button. This will begin the download of the Sensor configuration file. Save that in a handy place because we will need it.

![](../.gitbook/assets/iREC\_new\_18.png)

16\. Open another tab on your browser and enter [http://localhost:3000/mrv-sender/](http://localhost:3000/mrv-sender/). We now see our IoT simulator. You can either drag and drop the sensor configuration file to the big `+` sign in the upper left, or you click the button to browse your computer. For simplicity's sake, click the button next to **Random Value** for the IoT simulator to generate random Measurement, Reporting, and Validation (MRV) data. Click **OK**.

![](../.gitbook/assets/DUG\_22.png)

Press the **green triangle** to begin generating the data. Navigate back to the Guardian Policies tab, and you can click into the **MRV** tab. Here, you will see the data that the IoT sensor generated, such as date, period, amount, etc.

![](../.gitbook/assets/DUG\_23.png)

17\. The last step is to log out of the Installer account and log into the Auditor account.

![](../.gitbook/assets/DUG\_24.png)

There are two tabs in this view: **Audit** and **Trust Chain**. Clicking into the Audit tab offers high-level public information from our reference implementation such as the Verifiable Presentation ID, the Hash of the Verifiable Presentation, the DID of the sensor, the date information the Verifiable Presentation was created, the type of activity, and the ability to view the Verifiable Presentation.

![](../.gitbook/assets/iREC\_new\_19.png)

18\. Lastly, let's navigate to The Trust Chain tab. The Trust Chain tab will ask for one of two pieces of information, either the Verifiable Presentation ID (which can be found either in the Audit tab or the memo field of the transaction field on a Hedera explorer-like Dragon Glass) or the Transaction Hash. Entering either of those important identifiers will open all necessary information for you to discover.

![](../.gitbook/assets/iREC\_new\_19.1.png)

The **Trust Chain** view displays important elements that can be publicly discovered. Elements include token information, Policy information, and all of the important information regarding the Verifiable Credentials that make up the Verifiable Presentation. You'll notice "Cards" on the bottom of the screen. Those cards are Verifiable Credentials displayed in chronological order. For example, you will see when the Standard Registry was created, when the policy was created, when the Installer submitted documentation, etc. Feel free to explore!

![](../.gitbook/assets/iREC\_new\_20.png)
