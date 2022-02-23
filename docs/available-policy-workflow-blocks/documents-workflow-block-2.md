# filtersAddOnBlock

{% hint style="info" %}
Note: This block is used for dropdown. You can add multiple blocks to 1 grid to combine different data.&#x20;
{% endhint %}

### Properties

| Block Property | Definition                                                                                                                                       | Example Input                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Type           | a block for providing dynamic filters to DocumentsSourceAddOn Block                                                                              | **filtersAddOn**Block (Can't be changed).                             |
| Tag            | Unique name for the logic block.                                                                                                                 | report\__by\__project                                                 |
| Permissions    | Which entity has rights to interact at this part of the workflow.                                                                                | Installer.                                                            |
| Default Active | Shows whether this block is active at this time and whether it needs to be shown.                                                                | Checked or unchecked.                                                 |
| Dependancies   | Automatic update. The block is automatically re-rendered if any of the linked components gets updated.                                           | Select the appropriate block from the dropdown.                       |
| Type           | Filter type, so far only Dropdown type - allows the user to select one of the available values.                                                  | The list of available values is provided by DocumentsSourceAddonBlock |
| Can Be Empty   | if true - if the filter is empty, then it is not taken into account when filtering. If false - then after filtering there will be an empty array | checked or unchecked                                                  |
| Field          | the field by which the filtering will take place                                                                                                 | document.credentialSubject.0.ref                                      |
| Option Name    | the field to be used as the label                                                                                                                | document.credentialSubject.0.id                                       |
| Option Value   | the field that will act as the value                                                                                                             | document.credentialSubject.0.id                                       |

### UI Properties



| Filter Property | Definition             | Example Input |
| --------------- | ---------------------- | ------------- |
| Title           | Filter title           | Filter1       |
| Button Context  | text inside the button | Project       |
