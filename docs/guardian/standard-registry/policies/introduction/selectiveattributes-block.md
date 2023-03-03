# selectiveAttributes Block

This Block can be placed inside documentsSourceAddon. This will filter attributes (option field) in documents returned by documentsSourceAddon.

### Properties

| Property Name    | Description                                                                       | Example                                                                                                                                                                                                                    | Status |
| ---------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Tag              | Unique name for the logic block.                                                  | selective\_attributes\_addon                                                                                                                                                                                               |        |
| Permissions      | Which entity has rights to interact at this part of the workflow.                 | Registrant                                                                                                                                                                                                                 |        |
| Default Active   | Shows whether this block is active at this time and whether it needs to be shown. | Checked or Unchecked                                                                                                                                                                                                       |        |
| Stop Propagation | End processing here, don't pass control to the next block.                        | Checked or Unchecked                                                                                                                                                                                                       |        |
| On Errors        | Called if the system error has occurs in the Block                                | <p>- No action<br> - Retry</p>                                                                                                                                                                                             |        |
| Attributes       | Array of attributes to select                                                     | <p>"attributes": [</p><p>    {</p><p>      "attributePath": "status"</p><p>    },<br><br><strong>Note:</strong> If value is empty no attributes will be selected and field option in returned documents will be empty.</p> |        |

<figure><img src="../../../../.gitbook/assets/image (10).png" alt=""><figcaption></figcaption></figure>
