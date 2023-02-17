# 💻 Remote GHG Policy Demo Guide

### For Organizations to Create an Employer (Employer Admin User)

Typically, the way we start the demonstration is by logging in as a Standard Registry called "GHG Remote Work". Create a user named "GHG Remote Work."

You'll now be prompted to configure your GHG Remote Work account. Enter the details and then press the Generate button to generate a Hedera Operator ID and an Operator Key and enter the name of your Standard Registry. Press Connect when finished. This will now create Hedera Consensus Service Topics, fill the account with test hBar, create a DID document, create a Verifiable Credential, etc

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.22.01 PM.png" alt=""><figcaption></figcaption></figure>

Now we will be creating the Policy. We have three ways to "create policies." The first way is to actually create the policy from scratch. The second way is to import an existing policy; either the policy file itself or from IPFS. When you import a policy, all schemas and tokens that are required in the policy are automatically populated. To do this, you can find the policy file and the IPFS timestamp on the open-source Guardian policy page [here](https://github.com/hashgraph/guardian/tree/main/Demo%20Artifacts/iREC). For this demo guide, we will be using the 3rd way to create a policy, which is through the preloaded drop-down list.&#x20;

Once it is selected, we can also preview the policy before importing it. After the policy is imported, we can either run the policy in Dry run mode or we can publish it by clicking on publish button from the dropdown. For testing purposes, we will publish the policy.

Once the policy is published, we will log out and create a new user called, "Employer".&#x20;

In the Profile screen, select “GHG Remote Work” and then click the “Generate” button.

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.22.23 PM.png" alt=""><figcaption></figcaption></figure>

When the Operator ID and Operator Key generates, click the submit button.

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.22.43 PM.png" alt=""><figcaption></figcaption></figure>

When the Employer profile has been created, click on the Policies tab

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.23.09 PM.png" alt=""><figcaption></figcaption></figure>

In the Policies tab, click on the “Go” button to begin the Remote Work GHG Policy operations.

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.23.42 PM.png" alt=""><figcaption></figcaption></figure>

To create a new Organization Group, select the “organization group template” and provide a Group Label (i.e. organization\_group). Click Ok when you are finished.

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.24.00 PM.png" alt=""><figcaption></figcaption></figure>

Fill out the Employer Info. Note that a valid Hedera Treasury Account is required. Enter your Private Key to associate your Organization Account with the GHG token.

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.24.25 PM.png" alt=""><figcaption></figcaption></figure>

In the Employee sub-tab, click on the “Get Invite” button to generate the link that Employees will use to join the Organization Group.

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.24.41 PM.png" alt=""><figcaption></figcaption></figure>

Generate the invite for the Employee role.

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.25.01 PM.png" alt=""><figcaption></figcaption></figure>

Copy the invitation and then send the invitation to employees you wish to join the Organization Group.

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.25.12 PM.png" alt=""><figcaption></figcaption></figure>

As Employees join your Organization Group and fill out the Employee Survey, their results will show up in the Policy Screen under the sub-tab Employee Survey column. You can view their results by clicking on “View Document.”

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.25.27 PM.png" alt=""><figcaption></figcaption></figure>

You can review their Time Tracking submissions in the Policy Screen under the sub-tab Report column. View their results by clicking on “View Document.”

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.25.45 PM.png" alt=""><figcaption></figcaption></figure>

You can review the total aggregate CO2 emissions in the Policy Screen under the sub-table Total Report column. You can view their results by clicking on “View Document.”

{% hint style="info" %}
Note:

1. The timers in the GHG policy on MGS are set to intervals of hours, so you need to wait \~1.5 hours for minting tokens
2. You can make changes to this time period by changing time\_tracking\_timer and report\_timer blocks as shown below.

**For example** : \
**report\_timer:** 0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58 \* \* \* \*&#x20;

**time\_tracking\_timer:** 1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,57,59 \* \* \* \*
{% endhint %}

You can view the number of tokens minted in the Policy Screen under the sub-table Mint’s VP column. You can explore the Trust Chain by clicking on the “View Document.”

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.26.16 PM.png" alt=""><figcaption></figcaption></figure>

### For Employees to Create an Employee User and Join an Organization (Employee Users)

Log in and create a user with the name of your choice. For the demo, we are using the name Employee.&#x20;

On the Profile screen, select “GHG Remote Work” and then “Generate” the Operator ID and Operator Key information. When the Operator ID and Operator Key generates, click the submit button.

When the Employee profile has been created, click on the Policies tab.

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.26.36 PM.png" alt=""><figcaption></figcaption></figure>

In the Policies tab, click on the “Go” button to begin the Remote Work GHG Policy operations.

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.26.56 PM.png" alt=""><figcaption></figcaption></figure>

To join the Organization, select “Accept invitation” and copy and paste the invite link that the Employee sent.

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.27.10 PM.png" alt=""><figcaption></figcaption></figure>

Fill out the Employee Survey.

In the Time Tracking sub-tab, click on the Create New Time Tracking button.

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.27.29 PM.png" alt=""><figcaption></figcaption></figure>

Fill out the form to track working hours. Repeat this step for as many days as you are looking to track. In the screenshot below, we are showing an example of tracking time for two days (Sept. 28 and Sept. 29).

<figure><img src="../../../../.gitbook/assets/Screen Shot 2022-12-14 at 1.27.54 PM.png" alt=""><figcaption></figcaption></figure>
