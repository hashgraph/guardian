# 🔎 MRV Document Operations

For a demo example of following steps, here is the policy timestamp: **1675164736.675731674**

## **Task Summary**

There are two roles: ‘**User**_**’**_ and _**‘**_**Approver**_**’**_. _User_ can create projects and send project definition documents to the selected _Approvers_. After the approval, _User_ can add MRV reports to the project. On the basis of this documents the policy will be minting tokens into the account configured in the project.

## **Preparation**

1. Create 2 roles ‘**User**_**’**_ and ‘**Approver**_**’**_ and the corresponding containers

(See [example 1](creating-and-using-roles.md) for the more detailed description of how to work with roles)

![Creating 2 roles](<../../../../.gitbook/assets/0 (4).png>)

2. Create all needed document schemas:

2.1 Schema for ‘**User**_**’**_ containing the fields: **First name**, **Last name**

2.2 Schema for ‘**Approver**_**’**_ containing the fields: **First name**, **Last name**

2.3 Schema for ’**Project**’ containing the fields: **Project name**, **Account ID**

In order to mint tokens into another account (not into the account of the minting user) setup the required field

![Setting up new account](<../../../../.gitbook/assets/1 (1) (2) (1).png>)

2.4 Schema for ’**Report**’ containing the following fields: **Start Date, End Date, Amount**

(Please see [example 2](data-input-via-forms-using-roles-to-partition-user-activities..md) _for the more detailed description of how to work with Documents_)

3. Add blocks for registering ‘**User**_**’**_ and ‘**Approver**_**’**_ into the containers created in the step 1

**Note:** it is important that DID of the user is used for ID of the documents as this value will be used further in the document for filtration

![Adding DID as ID Type](<../../../../.gitbook/assets/2 (3) (2).png>)

4. Add simplified grids for displaying Projects, Reports and Tokens

![Adding grids](<../../../../.gitbook/assets/3 (1) (1) (2).png>)

5. Create the token

![image5.png](<../../../../.gitbook/assets/4 (1) (1) (2) (1) (1).png>)

## **Document Operations**

### 1. Project Definition

#### 1.1 Create a project

![Creating project](<../../../../.gitbook/assets/5 (1) (3).png>)

### 1.2 Save the project

![Saving Project](<../../../../.gitbook/assets/6 (2) (2).png>)

### 1.3 Link to the token

1.3.1 Since another (not current user) account is used for minted tokens ’**tokenActionBlock**’ cannot be used, instead we will use ‘**tokenConfirmationBlock**_**’**_

![Adding tokenConfirmationBlock](<../../../../.gitbook/assets/7 (2) (1).png>)

1.3.2 To configure the target account for mixed tokens select ‘_Custom_’ value for ‘_Type_’ and the filed in the document from which to take the value for the Account ID (this field must have type: ‘**Account**’)

![Selecting Account Type and Id](<../../../../.gitbook/assets/8 (3).png>)

1.3.3 By default ’**tokenConfirmationBlock**’ does not have a link to the next block, thus it needs to be manually added

![Manually adding tokenConfirmationBlock to next Block](<../../../../.gitbook/assets/9 (1) (2).png>)

1.4 Add an approver as after the creation the project is not assigned to anyone

1.4.1 Add ’**interfaceActionBlock**’ wrapped into a container.

![Adding interfaceActionBlock](<../../../../.gitbook/assets/10 (1) (2).png>)

1.4.2 Select **Dropdown** _value_ _for_ **Type**

![Selecting Dropdown value](<../../../../.gitbook/assets/11 (4).png>)

1.4.3 Use system field **assignedTo** to filter documents based on users they are assigned to.

Record value from **assignedTo** _into_ **Field** (This field will be changing our block)

![Using system Field assignedTo](<../../../../.gitbook/assets/12 (3) (1).png>)

1.4.4 Configure values from which fields from the document would be labels, and which ones would be values

![Configuring labels and values](<../../../../.gitbook/assets/13 (3) (1).png>)

1.4.5 Use ‘**documentsSourceAddon**’ for data for **Dropdown**_**.**_

![adding documentSourceAddon](<../../../../.gitbook/assets/14 (1) (1).png>)

1.4.6 Save the changed document

![Saving the documents](<../../../../.gitbook/assets/15 (1) (1).png>)

1.4.7 As ‘**documentsSourceAddon**’ does not have default events, we need manually add them.

![Adding events](<../../../../.gitbook/assets/16 (4).png>)

1.4.8 Return to grid settings and add **Dropdown** into the target column.

![Adding Dropdown to target column](<../../../../.gitbook/assets/17 (1) (2).png>)

1.5 Project Approval. Setting up the grid for project approvals.

1.5.1 To select only the projects assigned to the current Approver set the ‘**Assigned to User**’ flag

![Setting up Assigned to User flag](<../../../../.gitbook/assets/18 (1) (1).png>)

1.5.2 Add document approval block

_(Please see_ [_example 2_](data-input-via-forms-using-roles-to-partition-user-activities..md) _for the more detailed description of this workflow)_

![Adding document approval block](<../../../../.gitbook/assets/19 (5).png>)

1.5.3 Add Approve button into the grid

![Adding Approve button to the grid](<../../../../.gitbook/assets/20 (1) (1) (1) (1).png>)

1.5.4 After the Approve, setup the KYC for the account connected to the project

Use ‘**tokenActionBlock**’ with the appropriate settings

<figure><img src="../../../../.gitbook/assets/Template_4_screenshot_22.png" alt=""><figcaption></figcaption></figure>

1.5.5 Configure the signing/verification of the document with the Approver signature by adding ‘**reassigningBlock**’. This block creates a copy of the source document and re-signs it with the key of the selected user.

<figure><img src="../../../../.gitbook/assets/Template_4_screenshot_23.png" alt=""><figcaption></figcaption></figure>

1.5.6 Add Status attribute for easy filtering

<figure><img src="../../../../.gitbook/assets/Template_4_screenshot_24.png" alt=""><figcaption></figcaption></figure>

### 2. Report.&#x20;

To enable report creation only for approved projects, add create button into the grid selectively for documents with ‘Approved’ status

2.1 Add a ‘**documentsSourceAddon**' block to differentiate the documents on the basis of their status

<figure><img src="../../../../.gitbook/assets/Template_4_screenshot_25.png" alt=""><figcaption></figcaption></figure>

2.2 Repeat the sequence for project creation to create the report

{% hint style="info" %}
**Note:** switch off ‘**Default Active**’ since create report button does not need to be an independent object
{% endhint %}

<figure><img src="../../../../.gitbook/assets/Template_4_screenshot_26.png" alt=""><figcaption></figcaption></figure>

2.3 Add the button for creating reports into the grid

<figure><img src="../../../../.gitbook/assets/Template_4_screenshot_27.png" alt=""><figcaption></figcaption></figure>

2.4 Use ‘**mintDocumentBlock**’ for creating (minting) tokens

<figure><img src="../../../../.gitbook/assets/Template_4_screenshot_28.png" alt=""><figcaption></figcaption></figure>

### 3. Results

#### 3.1 Reports

3.1.1 Add grid to display reports

<figure><img src="../../../../.gitbook/assets/Template_4_screenshot_29.png" alt=""><figcaption></figcaption></figure>

3.1.2 To filter reports on the basis of their project add dynamic filter ‘**filtersAddon**’

<figure><img src="../../../../.gitbook/assets/Template_4_screenshot_30.png" alt=""><figcaption><p>Adding FiltersAddon</p></figcaption></figure>

3.1.3 Documents created on the basis of other documents are automatically linked via the _**ref**_ field. Use it for filtration

<figure><img src="../../../../.gitbook/assets/Template_4_screenshot_31.png" alt=""><figcaption></figcaption></figure>

3.1.4 Add the data source for the filter which will display all approved projects of the current user

<figure><img src="../../../../.gitbook/assets/Template_4_screenshot_32.png" alt=""><figcaption></figcaption></figure>

3.1.5 Add display of all minted tokens

<figure><img src="../../../../.gitbook/assets/Template_4_screenshot_33.png" alt=""><figcaption></figcaption></figure>

### **Demo**

#### Choose a role

<figure><img src="../../../../.gitbook/assets/Template_4_demot_01.png" alt=""><figcaption></figcaption></figure>

#### Create Approver

<figure><img src="../../../../.gitbook/assets/Template_4_demot_02.png" alt=""><figcaption></figcaption></figure>

#### Create User

<figure><img src="../../../../.gitbook/assets/Template_4_demot_03.png" alt=""><figcaption></figcaption></figure>

#### Create Project

<figure><img src="../../../../.gitbook/assets/Template_4_demot_04.png" alt=""><figcaption></figcaption></figure>

#### Associate token

<figure><img src="../../../../.gitbook/assets/Template_4_demot_05.png" alt=""><figcaption></figcaption></figure>

#### Choose an approver

<figure><img src="../../../../.gitbook/assets/Template_4_demot_06.png" alt=""><figcaption></figcaption></figure>

#### Approve project

<figure><img src="../../../../.gitbook/assets/Template_4_demot_07.png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/Template_4_demot_08.png" alt=""><figcaption></figcaption></figure>

#### Create report

<figure><img src="../../../../.gitbook/assets/Template_4_demot_09.png" alt=""><figcaption></figcaption></figure>

<div>

<figure><img src="../../../../.gitbook/assets/Template_4_demot_10.png" alt=""><figcaption></figcaption></figure>

 

<figure><img src="../../../../.gitbook/assets/Template_4_demot_11.png" alt=""><figcaption></figcaption></figure>

</div>
