# customLogicBlock

## Properties

| Block Property   | Definition                                                                                                                                        | Example Input                                                                         | Status |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ |
| tag              | Unique name for the logic block.                                                                                                                  | multiSignBlock                                                                        |        |
| permissions      | Which entity has rights to interact at this part of the workflow.                                                                                 | NoRole                                                                                |        |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown.                                                                 | Checked or unchecked.                                                                 |        |
| On errors        | Called if the system error has occurs in the Block                                                                                                | <p></p><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul> |        |
| Stop Propagation | End processing here, don't pass control to the next block.                                                                                        | Checked or unchecked.                                                                 |        |
| Output Schema    | Sending the logic output to this particular Schema                                                                                                | Report Employee schema                                                                |        |
| Document Signer  | <p>defines who will sign processed document.<br>Options:<br>1. Policy Owner<br>2. First Document Owner<br>3. First Document Issues</p>            | Policy Owner                                                                          |        |
| Id Type          | <p>defines Id Type in credential subject of processed document.<br>Options:<br>1. DID (new DID)<br>2. UUID (new UUID)<br>3. Owner (Owner DID)</p> | UUID (new UUID)                                                                       |        |

