# reassigningBlock

### Properties

| Block Property   | Definition                                                                        | Example Input                                   |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| Type             | A block type which re-signs the document and change the user to document owner.   | **reassigningBlock** (Can't be changed).        |
| Tag              | Unique name for the logic block.                                                  | wait\_for\_approval.                            |
| Permissions      | Which entity has rights to interact at this part of the workflow.                 | Installer.                                      |
| Default Active   | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                           |
| Dependencies     | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown. |
| Stop Propagation | End processing here, don't pass control to the next block.                        | Checked or Unchecked.                           |
