# reassigningBlock

### Properties

| Block Property   | Definition                                                                        | Example Input                                                                         |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| type             | A block type which re-signs the document and change the user to document owner.   | **reassigningBlock** (Can't be changed).                                              |
| tag              | Unique name for the logic block.                                                  | wait\_for\_approval.                                                                  |
| permissions      | Which entity has rights to interact at this part of the workflow.                 | Installer.                                                                            |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                                                                 |
| dependencies     | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown.                                       |
| stop Propagation | End processing here, don't pass control to the next block.                        | Checked or Unchecked.                                                                 |
| issuer           | Person, who will be a Signer                                                      | <p>not set - Current User<br>owner - document Owner<br>policyOwner - Policy Owner</p> |
| actor            | Person, who will be next Block Owner                                              | <p>not set - Current User<br>owner - document Owner<br>issuer - document Issuer</p>   |

