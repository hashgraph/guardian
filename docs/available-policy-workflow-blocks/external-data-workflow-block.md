# externalDataBlock

### Properties

| Block Property | Definition                                                                                                                     | Example Input                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| type           | Receives data from the external source and passes them over the the next block.                                                | **externalData**Block (Can't be changed).       |
| tag            | Unique name for the logic block.                                                                                               | mrv\_source.                                    |
| permissions    | Which entity has rights to interact at this part of the workflow.                                                              | Installer.                                      |
| defaultActive  | Shows whether this block is active at this time and whether it needs to be shown.                                              | Checked or unchecked.                           |
| dependencies   | Establish workflow dependancies that need to be completed prior.                                                               | Select the appropriate block from the dropdown. |
| entityType     | Specify the type of Entity this workflow block is for.                                                                         | MRV.                                            |
| schema         | Pre-configured schemas relevant for download to be selected from the drop down of available schemas in your Guardian instance. | MRV.                                            |

