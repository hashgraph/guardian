# Creating Policy using UI

Once you login as a Standard Registry and finish the setup, click on Policies tab.

![](<../../../../.gitbook/assets/image (4) (1) (2) (1) (1).png>)

We have two options to create Policy :

1. Creating Policy from scratch
2. Importing Policy (zip file format)either from file or from IPFS.

### 1. Creating Policy from Scratch

1.1 To create Policy from scratch, we need to click on "Create Policy" button.

![](<../../../../.gitbook/assets/image (1) (14).png>)

1.2 Once you click on Create Policy , you get a dialog box to fill out basic Policy details.

![](<../../../../.gitbook/assets/image (155).png>)

1.3 Once the details are filled and clicked on OK. Initially, Policy is created in Draft status.

![](<../../../../.gitbook/assets/image (1) (1) (2) (2).png>)

1.4 You can even edit the Policy by clicking Edit button.

![](<../../../../.gitbook/assets/image (2) (1) (6).png>)

1.5 When clicked on Edit, the screen is navigated to Policies configuration tab, which gives an option to add/remove any block from the Policy.

![](<../../../../.gitbook/assets/image (78).png>)

1.6 Once the Policy is configured, you can go to Policies tab and click on Publish.

![](<../../../../.gitbook/assets/image (6) (1) (2).png>)

### 2. Importing Policy either from File or from IPFS

Instead of creating Policy from scratch, there is an option of importing the Policy zip file from Local system.

{% hint style="info" %}
**Note:** Files with **.policy** extension are only accepted. These files are in zip format, i.e. they are zip archives of the text file.
{% endhint %}

![](<../../../../.gitbook/assets/image (11) (1) (3) (1).png>)

2.1 Once the .zip file is selected, we get the Policy Import Review screen. Once everything looks good, click on Import Button.

![](<../../../../.gitbook/assets/image (88).png>)

2.2 The Policy can also be imported by importing it from IPFS.

![](<../../../../.gitbook/assets/image (80).png>)

2.3 To do this, you can use the sample policy that we have already uploaded to IPFS by entering the Hedera Message IDs.

```
1655293847.166673000 (new iREC Policy)
```

![](<../../../../.gitbook/assets/image (98).png>)

2.4 If the timestamp entered is correct, we get Policy Import Preview screen. If the imported Policy looks good, click on **Import** button.

![](<../../../../.gitbook/assets/image (192).png>)

2.5 Once the Policy is imported, if everything looks good, click on Publish button. Policy will be published and it is represented by changing the status as Published.

![](<../../../../.gitbook/assets/image (12) (4).png>)

2.6 There is also an option to Export the Policy. To export the policy click on Export button. Once, you click on Export, you get Export dialog, where we have two exporting options: Copy message Identifier and saving the Policy as file.

![](<../../../../.gitbook/assets/image (47).png>)

When you click on Save to file, Policy is exported as a .zip file.

**Note:** While importing tool via file, or policy via file or IPFS, you can change used tools in preview dialog, it will change tools references in schemas and config automatically.

To get complete information about tools, please refer to [Tools](../../../../../Methodology%20Library/CDM/Tools/) section.

<figure><img src="../../../../.gitbook/assets/image (587).png" alt=""><figcaption></figcaption></figure>

### 3. Filtering Policies

On the Policy page, it is now possible to filter the policies list by policy name and tags. All available tags are presented in the dropdown list, which you can create using "Create Tag" for each policy, which makes it easier using the filter.

### 4. Select and Delete Multiple Policies

Users can select and delete policies from the Policies table in Guardian UI and also through the API.

<figure><img src="../../../../.gitbook/assets/image (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
Note:

1. Selected items remain selection across pagination.
2. Dependencies are considered when deleting multiple schemas.
{% endhint %}
