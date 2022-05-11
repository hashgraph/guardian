# DocumentsSourceAddOn

{% hint style="info" %}
Note: This block is used for dropdown. You can add multiple blocks to 1 grid to combine different data.&#x20;
{% endhint %}

### Properties

| Block Property      | Definition                                                                                             | Example Input                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| type                | A block for searching VC, for grid                                                                     | **DocumentsSourceAddOn** Block (Can't be changed).                   |
| tag                 | Unique name for the logic block.                                                                       | approve_d\_documents\__grid\_source                                  |
| permissions         | Which entity has rights to interact at this part of the workflow.                                      | Installer.                                                           |
| defaultActive       | Shows whether this block is active at this time and whether it needs to be shown.                      | Checked or unchecked.                                                |
| dependencies        | Automatic update. The block is automatically re-rendered if any of the linked components gets updated. | Select the appropriate block from the dropdown.                      |
| dataType            | Specify the table to request the data from.                                                            | Current options are: Verifiable Credential, DID, Approve, or Hedera. |
| schema              | Filters the VC according to the selected scheme                                                        | iRec Application Details (1.0.0) PUBLISHED                           |
| onlyOwnDocuments    | When checked, filter out only VCs created by the user                                                  | checked or unchecked                                                 |
| onlyAssignDocuments | When checked, it filter only VCs assigned to the user                                                  | checked or unchecked                                                 |

### Filter Properties

| Filter Property | Definition                                                 | Example Input |
| --------------- | ---------------------------------------------------------- | ------------- |
| Field           | Name of the field to filter, it can be nested using "."    | option.status |
| Type            | Filter on the basis of type (Equal, Not Equal, In, Not In) | Equal         |
| Value           | The field by which to filter Value                         | Verified      |
