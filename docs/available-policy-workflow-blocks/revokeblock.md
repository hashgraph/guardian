# revokeBlock

This Block finds related messages in policy topics, and revokes those messages and sends it to Hedera topic, but it doesn’t save documents in DB. Output of this Block is the documents array.

### Properties

| Block Property                  | Definition                                                                        | Example Input                                                                         | Status |
| ------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ |
| tag                             | Unique name for the logic block.                                                  | revoke\__issue\_device_                                                               |        |
| permissions                     | Which entity has rights to interact at this part of the workflow.                 | Registrant                                                                            |        |
| defaultActive                   | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                                                                 |        |
| On errors                       | Called if the system error has occurs in the Block                                | <p></p><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul> |        |
| stop Propagation                | End processing here, don't pass control to the next block.                        | Checked or unchecked.                                                                 |        |
| Update previous document status | flag which updates previous document status.                                      | Checked or unchecked.                                                                 |        |
| Status value                    | Value of the Previous document status                                             | Waiting for approval                                                                  |        |
