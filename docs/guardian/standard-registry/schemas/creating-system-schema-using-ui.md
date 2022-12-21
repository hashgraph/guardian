# 💻 Creating System Schema using UI

To create a new System Schemas, click on the **New** button at the top right corner.

![](<../../../.gitbook/assets/image (16) (1).png>)

After clicking on the New button, you will be asked to enter Schema details such as Schema Name, Policy Dropdown, Entity : VC/MRV/NONE, Schema Description and any other required fields.

![](<../../../.gitbook/assets/image (2) (3).png>)

In addition to the basic Schema details we also have an option to add Field and Condition to each field.

![](<../../../.gitbook/assets/image (3) (3).png>)

We can also customize the Field keys and Field Title by clicking on Advanced Tab.

![](<../../../.gitbook/assets/image (27).png>)

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

Each of the above field types can be marked as either Marked or optional by checking the Required Field checkbox.

{% hint style="info" %}
**Note:**

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

Once the above details are added, click on the Create button.

![](<../../../.gitbook/assets/image (10) (2).png>)

Once the System Schema is created, we have options for activating, deleting, editing and viewing JSON documents.

![](<../../../.gitbook/assets/image (9) (3) (1).png>)
