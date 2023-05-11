# 💻 Creating Schema using UI

To create a new Schemas, click on the **New** button at the top right corner.

![](<../../../.gitbook/assets/image (16) (1).png>)

After clicking on the New button, you will be asked to enter Schema details such as Schema Name, Policy Dropdown, Entity : VC/MRV/NONE, Schema Description and any other required fields.

![](<../../../.gitbook/assets/image (2) (3) (1) (1).png>)

In addition to the basic Schema details we also have an option to add Field and Condition to each field.

![](<../../../.gitbook/assets/image (3) (3) (1) (1).png>)

We can also customize the Field keys and Field Title by clicking on Advanced Tab.

![](<../../../.gitbook/assets/image (27) (1).png>)

Instead of creating a new Schema from scratch, there is also an option to import it via File or via IPFS.

To import the Schema, click on the Import button.

<figure><img src="../../../.gitbook/assets/image (1) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
Files with **.schema** extension are only accepted. These files are in zip format, i.e. they are zip archives of the text file.
{% endhint %}

Import from IPFS: You can also import Schema from IPFS by entering the correct Schema timestamp. Sample iREC Schema timestamp is below:

```
1674821342.619996003 (iREC 3 Policy)
```

<figure><img src="../../../.gitbook/assets/image (31) (2).png" alt=""><figcaption></figcaption></figure>

Once the Schema is imported, we need to select the Policy from the Policy dropdown to connect the Schema and the Policy.

<figure><img src="../../../.gitbook/assets/image (2).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (3).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Note:**&#x20;

The major difference between creating / importing System Schema and Policy Schema is that we only get policy selection dropdown when policy schema is imported.
{% endhint %}

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

<figure><img src="../../../.gitbook/assets/image (2) (2).png" alt=""><figcaption></figcaption></figure>

After clicking on Publish, you will be prompted to enter the version. After entering the Version and pressing the submit button, the status will change to Published.

{% hint style="info" %}
**Note**: All Schemas connected to a Policy gets published automatically when Policy gets published.
{% endhint %}

There are different types of Schema Types:

* None
* Verifiable Credential
* Encrypted Verifiable Credential

To know more details regarding encrypted Verifiable Credential please look at [Selective Disclosure Demo](../selective-disclosure-demo.md)

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
* Units of Measure
  * Prefix
  * Postfix
* Enum
* Help Text
* GeoJSON
* URI

Each of the above field types can be marked as either Marked or optional by checking the Required Field checkbox.

{% hint style="info" %}
**Note: Important points to be noted when "Account" type is selected:**

1. Account field type need to be referred in ‘tokenConfirmationBlock’ and ‘tokenActionBlock’. They can be present both in the parent and child documents.
2. If there are multiple fields of the ‘Account’ with the same name, then the value from the most immediate scope, i.e. from the current (‘child’) document is used.
{% endhint %}

{% hint style="info" %}
**Note: Important points to be noted when "Enum" type is selected:**

1. Enum values can be added by editing or by importing it from link or from file.
2. If we are importing files by URL. The response should be ({"enum": \["Option1", "Option2", "Option3"]}) or has same format such as importing file (Options separated by new line symbol).

Example of URL which has correct format: [https://ipfs.io/ipfs/bafkreihgbx6fsqup4psfbzjcf57zjdbfwisbjbsqzvwlg4hgx5s5xyqwzm](https://ipfs.io/ipfs/bafkreihgbx6fsqup4psfbzjcf57zjdbfwisbjbsqzvwlg4hgx5s5xyqwzm)

3\. If we put more than five options, it will be automatically loaded to IPFS.
{% endhint %}

{% hint style="info" %}
**Note: Important points to be noted when "GeoJSON" type is selected:**

1. Click on map and place the marker’s, polygons, lines.
2. Polygons and lines can be placed by double clicking on map.
3. Right Click on the map will remove temporary points for polygons and lines
4. View type can also be changed by pasting the GeoJSON.
{% endhint %}

{% hint style="info" %}
**Note: Important points to be noted when "String" type is selected:**

1. Pattern input field is added in the advanced mode configuration.&#x20;

Detailed information for patterns is available on [https://json-schema.org/understanding-json-schema/reference/regular\_expressions.html](https://json-schema.org/understanding-json-schema/reference/regular\_expressions.html).
{% endhint %}

<figure><img src="../../../.gitbook/assets/image (2) (8).png" alt=""><figcaption></figcaption></figure>

Once the above details are added, click on the Create button.

![](<../../../.gitbook/assets/image (10) (2) (1).png>)

Once the System Schema is created, we have options for activating, deleting, editing and viewing JSON documents.

![](<../../../.gitbook/assets/image (9) (3) (1).png>)
