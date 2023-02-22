# historyAddon

This block turn on history on interfaceDocumentsSourceBlock. This block should be placed inside interfaceDocumentsSourceBlock.

### Properties

| Property Name           | Description                                                                       | Example                                                   | Status |
| ----------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------- | ------ |
| Tag                     | Unique name for the logic block.                                                  | history\_addon                                            |        |
| Permissions             | Which entity has rights to interact at this part of the workflow.                 | Registrant                                                |        |
| Default Active          | Shows whether this block is active at this time and whether it needs to be shown. | Checked or Unchecked                                      |        |
| Stop Propagation        | End processing here, don't pass control to the next block.                        | Checked or Unchecked                                      |        |
| On Errors               | Called if the system error has occurs in the Block                                | <p> - No action<br> - Retry</p>                           |        |
| timelineLabelPath       | Label of timeline point                                                           | “option.status”. It is default value if setting is empty  |        |
| timelineDescriptionPath | Description of timeline point                                                     | “option.comment”. It is default value if setting is empty |        |

<figure><img src="../../../../.gitbook/assets/image (9).png" alt=""><figcaption></figcaption></figure>
