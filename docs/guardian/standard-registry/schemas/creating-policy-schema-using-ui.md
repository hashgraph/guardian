# 💻 Creating Policy Schema using UI

Policy Schema can also be created by clicking on the New button.

![](<../../../.gitbook/assets/image (21) (1).png>)

Once the New button is clicked, we get a dialog box that asks for the following information:\
1\. Schema Name

2\. Policy Dropdown: To select any of the imported Policy

3\. Entity Dropdown: To select any of the Entity: VC / MRV

4\. Description of Schema.

5\. Add Field: To add any fields required for the Schema.

Instead of creating a new Schema from scratch, there is also an option to import it via File or via IPFS.

To import the Schema, click on the Import button.

![](<../../../.gitbook/assets/image (7) (2).png>)

Once the Import button is clicked, we get two options: Import from file and Import from IPFS

![](<../../../.gitbook/assets/image (29) (2).png>)

Import from file: You can select the required Schema .schema file from your local machine. Sample iREC Schema (iREC Schema.zip) is provided in the link: [https://github.com/hashgraph/guardian/tree/main/Demo%20Artifacts](https://github.com/hashgraph/guardian/tree/main/Demo%20Artifacts)

{% hint style="info" %}
Files with **.schema** extension are only accepted. These files are in zip format, i.e. they are zip archives of the text file.
{% endhint %}

![](<../../../.gitbook/assets/image (17) (1) (1).png>)

Import from IPFS: You can also import Schema from IPFS by entering the correct Schema timestamp. Sample iREC Schema timestamp is below:\\

```
1644847084.945541771 (iREC 3 Policy)
```

![](<../../../.gitbook/assets/image (14) (1) (1).png>)

Once the Schema is imported, we need to select the Policy from the Policy dropdown to connect the Schema and the Policy.

![](<../../../.gitbook/assets/image (2) (2) (1).png>)

![](<../../../.gitbook/assets/image (11) (2) (1).png>)

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

![](<../../../.gitbook/assets/image (22) (1).png>)

After clicking on Publish, you will be prompted to enter the version. After entering the Version and pressing the submit button, the status will change to Published.

![](<../../../.gitbook/assets/image (18) (1).png>)

{% hint style="info" %}
**Note**: All Schemas connected to a Policy gets published automatically when Policy gets published.
{% endhint %}
