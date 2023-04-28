# tagsManagerBlock

Block _**tagsManager**_ is responsible for managing tags in policies. This block should be added as a ‘child’ block to the grid and linked to one of its columns. This block does not have any settings.

## Properties

| Property Name    | Description                                                                       | Example                        | Status |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------ | ------ |
| Tag              | Unique name for the logic block.                                                  | tags\_manager                  |        |
| Permissions      | Which entity has rights to interact at this part of the workflow.                 | Registrant                     |        |
| Default Active   | Shows whether this block is active at this time and whether it needs to be shown. | Checked or Unchecked           |        |
| Stop Propagation | End processing here, don't pass control to the next block.                        | Checked or Unchecked           |        |
| On Errors        | Called if the system error has occurs in the Block                                | <p>- No action<br> - Retry</p> |        |

<figure><img src="../../../../.gitbook/assets/image (1) (7).png" alt=""><figcaption></figcaption></figure>
