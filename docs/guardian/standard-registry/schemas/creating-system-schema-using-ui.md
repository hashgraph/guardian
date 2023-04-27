# 💻 Creating System Schema using UI

To create a new System Schemas, click on the **New** button at the top right corner.

![](<../../../.gitbook/assets/image (16) (1).png>)

After clicking on the New button, you will be asked to enter Schema details such as Schema Name, Policy Dropdown, Entity : VC/MRV/NONE, Schema Description and any other required fields.

![](<../../../.gitbook/assets/image (2) (3) (1) (1).png>)

In addition to the basic Schema details we also have an option to add Field and Condition to each field.

![](<../../../.gitbook/assets/image (3) (3) (1) (1).png>)

We can also customize the Field keys and Field Title by clicking on Advanced Tab.

![](<../../../.gitbook/assets/image (27) (1).png>)

There are different types of Schema Types:

* None
* Verifiable Credential
* Encrypted Verifiable Credential

{% hint style="info" %}
**Note: Important points to be noted when "Encrypted Verifiable Credential" type is selected:**

1. Fields in schema can be marked as private (only when schema has Encrypted Verifiable Credential type) as shown below.
2. Encrypted Verifiable Credential will be published in IPFS with AES GCM encryption.
3. If VP contains Encrypted Verifiable Credential, fields marked as private will be automatically removed.
{% endhint %}

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
