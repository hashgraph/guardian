# setRelationshipsBlock

This block contains DocumentsSourceAddOn and **set relationships** for input document from DocumentsSourceAddOn documents (messageId’s). It doesn’t save document to database.

### Properties

| Block Property   | Definition                                                                        | Example Input                                                                         | Status |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ |
| tag              | Unique name for the logic block.                                                  | set\__relationships\_to\_rejected\_vvb_                                               |        |
| permissions      | Which entity has rights to interact at this part of the workflow.                 | VVB                                                                                   |        |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                                                                 |        |
| On errors        | Called if the system error has occurs in the Block                                | <p></p><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul> |        |
| stop Propagation | End processing here, don't pass control to the next block.                        | Checked or unchecked.                                                                 |        |
| Include Accounts | Merges all the accounts from the documents                                        | Checked or unchecked.                                                                 |        |
| Change Owner     | It takes owner from first document                                                | Checked or unchecked.                                                                 |        |
