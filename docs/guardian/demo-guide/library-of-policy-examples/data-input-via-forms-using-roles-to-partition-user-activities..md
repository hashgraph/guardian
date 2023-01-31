# Data input via Forms, using Roles to partition user activities.

## **Objective**

Construct a policy in which one group of users can individually fill in and submit documents for approval and view their own documents’ status, and another group of users can view and take approve/reject actions on any of these user documents.

## **Approach**

Assign ‘User’ and ‘Approver’ roles to users to partition them into groups where one can fill in forms and send resulting documents to approvals, and the other group to ‘approve/reject’ these documents.

Create schema and necessary policy elements to enable ‘form-filling in and submission’ and ‘approval’ workflows.

## **Preparation**

Create 3 containers which will be responsible for choosing a role, submission and approval documents correspondingly.

Assign these containers appropriate Permissions: ‘no\_role’, ‘User’, or ‘Approver’, and add the first containers into the role selection block.

See detailed information about the Roles in Example 1.

![image1.png](<../../../.gitbook/assets/0 (1).png>)

**Main section**

**Creating the document**

1. Create a schema for Policy data input
   1. Go to ‘Schemas’ tab and create a new schema

![image2.png](<../../../.gitbook/assets/1 (1).png>)

*
  1. To make sure there is some demo/test data content in this schema create 3 fields:
* Organization name of type ‘String’
* Start Date of type ‘Date’
* End Date of type ‘Date’
* Amount of type ‘Number to represent the amount of CO2 emissions for the time period (between the ‘Start Date’ and ‘End Date’)

![image3.png](<../../../.gitbook/assets/2 (2).png>)

1. To perform data input into the Policy the ‘requestVcDocumentBlock’ will be used
   1. Since the scope of this example includes input of multiple documents the Policy requires logic similar to what is known as ‘loop’ or ‘iteration’. For this ‘interfaceStepBlock’ is required with ‘Cyclic’ option enabled. This will allow to return to the initial state after the document was saved.

![image4.png](<../../../.gitbook/assets/3 (1).png>)

*
  1. Add ‘requestVcDocumentBlock’ into the ‘_cyclic\_container_’

![image5.png](<../../../.gitbook/assets/4 (1).png>)

*
  1. Select the previously created Schema

![image6.png](<../../../.gitbook/assets/5 (1).png>)

*
  1. Select ‘New UUID’ to configure automatic generation of unique IDs for each document

![image7.png](<../../../.gitbook/assets/6 (1).png>)

*
  1. By default ‘requestVcDocumentBlock’ is displayed as a Form covering the entire page. To prevent this chose ‘DIALOG’ value for the field ‘Type’.

![image8.png](<../../../.gitbook/assets/7 (1).png>)

1. Save documents in the database.
   1. Add ‘sendToGuardianBlock’ into the container ‘_cyclic\_container’_ immediately after ‘_create\_new\_document’_

![image9.png](<../../../.gitbook/assets/8 (1).png>)

*
  1. Select data type and where where to store the document

![image10.png](<../../../.gitbook/assets/9 (1).png>)

*
  1. Create appropriate attributes to capture/store document status

Add ‘Status’ attributed and set the initial ‘New’ value for new documents

![image11.png](<../../../.gitbook/assets/10 (1).png>)

**Displaying the documents**

1. To display documents ‘_interfaceDocumentsSourceBlock’ is used_
   1. Add ’_interfaceDocumentsSourceBlock’_ into the ‘_user\_roles’_ container

![image12.png](../../../.gitbook/assets/11.png)

*
  1. Specify the needed columns, their titles and where the values will be taken from for display

![image13.png](../../../.gitbook/assets/12.png)

*
  1. To retrieve the data from the database ’_documentsSourceAddon’ block is used_
     1. Add ‘_documentsSourceAddon’ to the_ ‘_user\_grid’_

![image14.png](../../../.gitbook/assets/13.png)

*
  *
    1. Select where to retrieve the documents from

![image15.png](../../../.gitbook/assets/14.png)

*
  *
    1. Select the schema upon which the selected documents should be based on

![image16.png](../../../.gitbook/assets/15.png)

*
  *
    1. Select _‘Owned by User’_ checkbox which would filter in only the documents that are created by this user (this will disable the ability to view other documents)

![image17.png](../../../.gitbook/assets/16.png)

**Approving the documents**

1. To display documents ‘_interfaceDocumentsSourceBlock’ is used_
   1. As in the previous section add ‘_interfaceDocumentsSourceBlock’_ and configure displayed columns
   2. Add additional column which would contain the ‘_Approve_’ button

![image18.png](../../../.gitbook/assets/17.png)

*
  1. Since the Approve button should be displayed only for new documents use two ‘_documentSourceAddon_’ block

![image19.png](../../../.gitbook/assets/18.png)

Configure both ‘_documentSourceAddon_’ blocks similarly to how it was in the previous sections, except here do not select the ‘_Owned by User_’ checkbox to allow the Approvers to see all documents (created by all users)

*
  1. Separate the documents by status by means of creating the corresponding filters

![image20.png](../../../.gitbook/assets/19.png)

![image21.png](../../../.gitbook/assets/20.png)

1. To enable actions (in this example ‘Approve’ and ‘Reject’) the ‘buttonBlock’ block is used.
   1. Best practice is to wrap the ‘_buttonBlock_’ block in a container

Switch off the ‘Default Active’ option to avoid specifying the button as an independent element and hide it



*
  1. Create 2 buttons for ‘Approve’ and ‘Reject’ correspondingly.
*
  1. ‘buttonBlock’ is responsible only for the actions, in order to save the refreshed status of the documents create 2 ‘_sendToGuardianBlock_’ blocks with the corresponding values for the ‘Status’.
*
  1. By default blocks are always directly connected to the next block (just below it). To decouple the blocks select ‘_Events_’ tab and switch off the default events for both blocks.
*
  1. Connect events from the ‘_buttonBlock_’ with the corresponding ‘_sendToGuardianBlock’_ by selecting the _Events_ tab and create 2 new events.

1. Return to the grid settings and add the created buttons into the previously prepared column
   1. Set ‘_Type’_ to ‘BLOCK’
   2. Set ‘_Bind Block_’ to the block which we can place into the column
   3. In order to display the buttons for only new documents set the corresponding value for the ‘_Bind Group'_



**Result**
