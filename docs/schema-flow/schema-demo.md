# Schema Demo

There are two types of Schemas:

1. System Schemas
2. Policy Schemas

To display System / Policy Schemas in GUI, we have added a toggle in Schemas tab.

![](<../.gitbook/assets/image (3).png>)

### System Schemas

Whenever account is created, System Schemas are generated automatically.

![](<../.gitbook/assets/image (13).png>)

{% hint style="info" %}
Note: By default System Schemas cannot be edited / deleted.
{% endhint %}

To create new System Schemas, click on a **New** button at the top right corner.

![](<../.gitbook/assets/image (16).png>)

When clicked on New, you are asked to enter Schema details such as Schema Name, Entity : Standard\_Registry / User , Schema Description and any other fields required.

![](<../.gitbook/assets/image (4).png>)

Once above details are added, click on Create button.

![](<../.gitbook/assets/image (15).png>)

Once System Schema is created, we have options of activating, deleting, editing and viewing JSON document.

![](<../.gitbook/assets/image (9).png>)

### 2. Policy Schemas

This is second option in Schemas tab. This displays all the Schemas related to all the created / imported Policies in Policies tab.

In the below screenshot, shows Schemas of imported iREC Policy.

![](<../.gitbook/assets/image (19).png>)

We also have a filter, where by default, all the Schemas of Policies are shown. We can also select a particular Policy to show Schemas of selected Policy.

![](<../.gitbook/assets/image (8).png>)

Policy Schema can also be created by clicking on New button.

![](<../.gitbook/assets/image (21).png>)

Once New button is clicked, we get a dialog box which asks for following information:\
1\. Schema Name

2\. Policy Dropdown : To select any of the imported Policy

3\. Entity Dropdown : To select any of the Entity : VC / MRV

4\. Description of Schema.

5\. Add Field : To add any fields required for the Schema.

Instead of creating new Schema from scratch, there is also an option to import it via File or via IPFS.

To import Schema, click on Import button.

![](<../.gitbook/assets/image (7).png>)

Once Import button is clicked, we get an two options : Import from file, Import from IPFS

![](../.gitbook/assets/image.png)

Import from file : You can select the required Schema .zip file from your local machine. Sample iREC Schema (iREC Schema.zip) is provided in the link : [https://github.com/hashgraph/guardian/tree/main/Demo%20Artifacts](https://github.com/hashgraph/guardian/tree/main/Demo%20Artifacts)

![](<../.gitbook/assets/image (17).png>)

Import from IPFS : You can also import Schema from IPFS by entering correct Schema timestamp. Sample iREC Schema timestamp is below:\


```
1644847084.945541771 (iREC 3 Policy)
```

![](<../.gitbook/assets/image (14).png>)

Once Schema is imported, we need to select the Policy from the Policy dropdown to connect Schema and the Policy.&#x20;

![](<../.gitbook/assets/image (2).png>)

![](<../.gitbook/assets/image (11).png>)

Once selected required Policy, click on Import button.

When Schema is imported, it is in draft status

{% hint style="info" %}
Note: Initially when Schema is created / imported, it is in Draft status.
{% endhint %}

Once Schema is imported, we will have following options:\
1\. Export the Schema and save it as .zip file in local machine

2\. Editing the Schema

3\. Deleting the Schema

4\. Displaying JSON document

To Publish the Schema, click on Publish button.

![](<../.gitbook/assets/image (22).png>)

Once clicked on Publish, it is prompted to enter the version. After entering the Version and submit, the status changes to Published.

![](<../.gitbook/assets/image (18).png>)

{% hint style="info" %}
Note: All Schemas connected to a Policy gets published automatically, when Policy gets published.
{% endhint %}
