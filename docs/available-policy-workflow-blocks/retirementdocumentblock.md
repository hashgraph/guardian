# retirementDocumentBlock

### Properties

| Block Property   | Definition                                                                        | Example Input                                   |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| Type             | Receives the VC from the previous block and retires based on the rule(s).         | **retirementDocument**Block(Can't be changed).  |
| Tag              | Unique name for the logic block.                                                  | retire\_token.                                  |
| Permissions      | Which entity has rights to interact at this part of the workflow.                 | Root Authority.                                 |
| Default Active   | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                           |
| Dependencies     | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown. |
| Stop Propagation | End processing here, don't pass control to the next block.                        | Checked or unchecked.                           |

### UI Properties

| UI Property | Definition                                                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token       | Select which token to retire. The token must exist in the Guardian instance.                                                                                                 |
| Rule        | Rules under which the number of tokens is calculated. Math operations are supported, e.g. the following will result in 20 tokens: data = { amount: 2 } rule = "amount \* 10" |
