# Schema Demo

There are two types of Schemas:

1. System Schemas
2. Policy Schemas

To display System / Policy Schemas in the GUI, we have added a toggle in the Schemas tab.

![](<../.gitbook/assets/image (3) (2).png>)

### System Schemas

Whenever an account is created, System Schemas are generated automatically.

![](<../.gitbook/assets/image (13) (1).png>)

{% hint style="info" %}
Note: By default System Schemas cannot be edited / deleted.
{% endhint %}

To create a new System Schemas, click on the **New** button at the top right corner.

![](<../.gitbook/assets/image (16) (1).png>)

After clicking on the New button, you will be asked to enter Schema details such as Schema Name, Policy Dropdown, Entity : VC/MRV/NONE, Schema Description and any other required fields.

![](<../.gitbook/assets/image (2) (3).png>)

In addition to the basic Schema details we also have an option to add Field and Condition to each field.

![](<../.gitbook/assets/image (3) (3).png>)

We can also customize the Field keys and Field Title by clicking on Advanced Tab.

![](<../.gitbook/assets/image (27).png>)

There are different types of Field Types:

* Number
* Integer
* String
* Boolean
* Date
* Time
* DateTime
* Duration
* URL
* Email
* Image
* Account
*   Units of Measure

    * Prefix
    * Postfix

    Each of the above field types can be marked as either Marked or optional by checking the Required Field checkbox.

{% hint style="info" %}
**Note:**

1. Account field type need to be referred in ‘tokenConfirmationBlock’ and ‘tokenActionBlock’. They can be present both in the parent and child documents.
2. If there are multiple fields of the ‘Account’ with the same name, then the value from the most immediate scope, i.e. from the current (‘child’) document is used.
{% endhint %}

Once the above details are added, click on the Create button.

![](<../.gitbook/assets/image (10) (2).png>)

Once the System Schema is created, we have options for activating, deleting, editing and viewing JSON documents.

![](<../.gitbook/assets/image (9) (2).png>)

### 2. Policy Schemas

This is the second option in the Schemas tab. This option displays all the Policy Schemas related to all the created / imported Policies in the Policies tab.

The below screenshot shows the Policy Schemas of an imported Policy (iRec).

![](<../.gitbook/assets/image (19).png>)

We also have a filter, where by default, all the Schemas of Policies are shown. We can also select a particular Policy to show the Schemas of the selected Policy.

![](<../.gitbook/assets/image (8) (1).png>)

Policy Schema can also be created by clicking on the New button.

![](<../.gitbook/assets/image (21).png>)

Once the New button is clicked, we get a dialog box that asks for the following information:\
1\. Schema Name

2\. Policy Dropdown: To select any of the imported Policy

3\. Entity Dropdown: To select any of the Entity: VC / MRV

4\. Description of Schema.

5\. Add Field: To add any fields required for the Schema.

Instead of creating a new Schema from scratch, there is also an option to import it via File or via IPFS.

To import the Schema, click on the Import button.

![](<../.gitbook/assets/image (7) (1).png>)

Once the Import button is clicked, we get two options: Import from file and Import from IPFS

![](<../.gitbook/assets/image (1) (2).png>)

Import from file: You can select the required Schema .schema file from your local machine. Sample iREC Schema (iREC Schema.zip) is provided in the link: [https://github.com/hashgraph/guardian/tree/main/Demo%20Artifacts](https://github.com/hashgraph/guardian/tree/main/Demo%20Artifacts)

{% hint style="info" %}
Files with **.schema** extension are only accepted. These files are in zip format, i.e. they are zip archives of the text file.
{% endhint %}

![](<../.gitbook/assets/image (17) (1).png>)

Import from IPFS: You can also import Schema from IPFS by entering the correct Schema timestamp. Sample iREC Schema timestamp is below:\\

```
1644847084.945541771 (iREC 3 Policy)
```

![](<../.gitbook/assets/image (14) (1) (1) (1).png>)

Once the Schema is imported, we need to select the Policy from the Policy dropdown to connect the Schema and the Policy.

![](<../.gitbook/assets/image (2) (2).png>)

![](<../.gitbook/assets/image (11).png>)

After selecting the required Policy, click on the Import button.

When the Schema is imported, it will be in draft status.

{% hint style="info" %}
**Note**: Initially when the Schema is created/imported, it will be in draft status.
{% endhint %}

Once the Schema is imported, we will have the following options:\
1\. Export the Schema and save it as .zip file in the local machine

2\. Editing the Schema

3\. Deleting the Schema

4\. Displaying JSON document

To Publish the Schema, click on Publish button.

![](<../.gitbook/assets/image (22).png>)

After clicking on Publish, you will be prompted to enter the version. After entering the Version and pressing the submit button, the status will change to Published.

![](<../.gitbook/assets/image (18).png>)

{% hint style="info" %}
**Note**: All Schemas connected to a Policy gets published automatically when Policy gets published.
{% endhint %}
