# Token Wipe Workflow Block

### Properties

| Block Property   | Definition                                                                        | Example Input                                   |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| Type             | Type of workflow logic block.                                                     | **wipeDocument**Block (Can't be changed).       |
| Tag              | Unique name for the logic block.                                                  | wipe\_token.                                    |
| Permissions      | Which entity has rights to interact at this part of the workflow.                 | Root Authority.                                 |
| Default Active   | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                           |
| Dependancies     | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown. |
| Stop Propagation | End processing here, don't pass control to the next block.                        | Checked or unchecked.                           |

### UI Properties

| UI Property | Definition                                                                 |
| ----------- | -------------------------------------------------------------------------- |
| Token       | Select which token to wipe. The token must exist in the Guardian instance. |
| Rule        | Enter any wiping calculations.                                             |
