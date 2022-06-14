# Verra Redd+ Demo Guide

This folder contains a sample file that is referenced in the Demo Usage Guide&#x20;

1. Sample of Verra REDD Policy (`Verra REDD Policy 2.zip`)&#x20;
2. Sample Schema design template for Verra REDD Policy (`REDD APD Schema Design Template.xlsx`)&#x20;

1.The Guardian reference implementation comes with three predefined users:&#x20;

* **Verra (Root Authority)**
* **Project Proponent**
* **VVB**

2\. After running the installation commands, open a tab on your browser and navigate to [http://localhost:3000/](http://localhost:3000/). Typically, the way we start the reference implementation demonstration is by logging in as Verra. Click the Demo Admin Panel drop-down located in the upper right-hand corner of the login screen and select the Verra user.&#x20;

![](../.gitbook/assets/Verra\_1.png)

3\. You'll now be prompted to configure your Verra account. Enter the name and then press the Generate button to generate a Hedera Operator ID and an Operator Key and enter the name of your Root Authority. Press Connect when finished. This will now create Hedera Consensus Service Topics, fill the account with test hBar, create a DID document, create a Verifiable Credential, etc.

![](../.gitbook/assets/Verra\_2.1.png)

4\. This could be one of the most interesting parts of the reference implementation. Now we will be creating the Policy. We have two ways to "create policies." The first way is to import an existing policy. This is the easiest way to get started. When you import a policy, all schemas and tokens that are required in the policy are automatically populated. To do this, you can use the sample policy that we have already uploaded to IPFS. Click on the import button and enter the following Hedera message ID:&#x20;

```
1650372697.590064000(Verra REDD+ Policy)  
```

Once Policy is imported successfully, click on "Publish" button to publish the policy.

5\. Click on Verra's profile icon and select "Log Out." We will now go back into the Admin Panel. This time we will select VVB.&#x20;

6\. Now, we can click on the Policies tab. This is where the specific actions required by the Policy Workflow will be found. We can click Open button to the right of the Verra Policy, the Verra created.&#x20;

![](../.gitbook/assets/Verra\_3.png)

7\. This is where the custom user will be able to assign the role that was created by Verra during the workflow creation process. In our case, we created the custom role of VVB so the user will need to select the VVB role from the drop down.

![](../.gitbook/assets/Verra\_4.png)

After selecting the VVB role, we will see the form that is based on the imported Policy. This form is one of the Policy Workflow State Objects. Once you fill out the required information, press the OK button.

![](../.gitbook/assets/Verra\_5.png)

8\. The next step of our flow is to log out and sign back in as Verra. Navigate to the Policies tab and click the Open button on the far right. Here you will find the approval actions based on our Policy Workflow required by Verra. You will be able to view the Verifiable Credential prior to approval by selecting the View Document link. Once you are ready to approve the document, you can click on the Approve button.

![](../.gitbook/assets/Verra\_6.png) ![](../.gitbook/assets/Verra\_7.png)

9\. Click on Verra's profile icon and select "Log Out." We will now go back into the Admin Panel. This time we will select Project Proponent.&#x20;

10\. This is where the custom user will be able to assign the role that was created by the Verra during the workflow creation process. In our case, we created the custom role of Project Proponent so the user will need to select the Project Proponent role from the drop down.&#x20;

![](../.gitbook/assets/Verra\_8.png)

After selecting the Project Proponent role, we will see the New Project button. When we click on the button, we get a form, where complete project details need to be added. We have uploaded a [Sample test data](https://github.com/hashgraph/guardian/blob/main/Demo%20Artifacts/REDD%20APD%20Schema%20Design%20Template.xlsx) file in our repo.

![](../.gitbook/assets/Verra\_9.png)

11\. The next step of our flow is to log out and sign back in as the Verra. Navigate to the Policies tab and click the Open button on the far right. Here you will find the approval actions based on our Policy Workflow required by Verra. You will be able to view the Verifiable Credential prior to approval by selecting the View Document link. Once you are ready to approve the project details, you can click on the Add button.

![](../.gitbook/assets/Verra\_10.png)

12\. Now, we login as Project Proponent and select VVB from the dropdown of Assign column for Validating the project details.

![](../.gitbook/assets/Verra\_11.png)

13\. The next step of our flow is to log out and sign back in as the VVB. Navigate to the Policies tab and click the Open button on the far right. You will be able to see Projects tab, where you can view the Verifiable Credential prior to approval by selecting the View Document link. Once you are ready to approve the project details, you can click on the Validate button.

![](../.gitbook/assets/Verra\_12.png)

14\. Once the Project is validated, we log out as VVB and login as Project Proponent. Monitoring Report details should be added by clicking on Add Report

![](../.gitbook/assets/Verra\_13.png)

![](../.gitbook/assets/Verra\_14.png)

15\. Now, you log out and login to VVB. You will be able to view the Verifiable Credential by selecting View Document button. Once, you are ready to verify the monitoring report details, you can click on Verify button.

![](../.gitbook/assets/Verra\_15.png)

16\. Once, Monitoring report is verified, you log out as VVB and login as Verra. Navigate to the Policies tab and click the Open button on the far right. You will be able to see Monitoring Reports tab, where you have an option to click on Mint button.

![](../.gitbook/assets/Verra\_16.png)

17\. Once, Minting process is completed, navigate to the Token History tab, where you have an option of viewing TrustChain. You can view TrustChain by clicking on View TrustChain button.

![](../.gitbook/assets/Verra\_17.png)

The Trust Chain view displays essential elements that can be publicly discovered. Elements include token information, Policy information, and all the essential information regarding the Verifiable Credentials that make up the Verifiable Presentation. You will notice "Cards" on the bottom of the screen. Those cards are Verifiable Credentials displayed in chronological order. &#x20;

![](../.gitbook/assets/Verra\_18.png)
