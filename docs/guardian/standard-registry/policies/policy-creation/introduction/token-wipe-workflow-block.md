# wipeDocumentBlock

### Description
This block allows to wipe tokens. 
* **Fungible (FT):** Wipes the amount computed by **Rule**.
* **Non-Fungible (NFT):** Wipes one or more serial numbers defined by a flexible Serial Numbers Expression. If the block is configured with **fixed serial numbers** (e.g., 1,2-5,10), the wipe operation will always target that same serial range. This effectively makes the run **single-use for those serials**. To keep the policy **reusable across documents**, configure serial numbers to be derived from the selected document.


### Properties

| Block Property   | Definition                                                                        | Example Input                             | Status |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------- | ------ |
| type             | Type of workflow logic block.                                                     | **wipeDocumentBlock** (Can't be changed). |        |
| tag              | Unique name for the logic block.                                                  | wipe\_token.                              |        |
| permissions      | Which entity has rights to interact at this part of the workflow.                 | Standard Registry.                        |        |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                     |        |
| stop Propagation | End processing here, don't pass control to the next block.                        | Checked or unchecked.                     |        |

### UI Properties

| UI Property         | Definition                                                                                      | Examples                                              |
| ------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Token       | Select which token to wipe. The token must exist in the Guardian instance. | specific token                        |
| Rule        | **FT required.** Enter any FT wiping calculations.                                             | `field0`, `10` |
| Serial Numbers        | **NFT required.** Enter serials and ranges for NFT wiping. Supports comma-separated and range formats.                                             | `field0,field1-field2,field3`, `1,2-5,10`        |

### Events

| Property Name | Name in JSON | Property Value                                                    | Value in JSON                          | Description                                                                                                                     |
| ------------- | ------------ | ----------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Event Type    | -            | <p>Input Event</p><p>Output Event</p>                             | -                                      | Type of the event - determines whether this is ingress or egress event for the current block.                                   |
| Source        | "source"     | Block tag(string)                                                 | "block\_tag"                           | The block which initiates the event.                                                                                            |
| Target        | "target"     | Block tag(string)                                                 | "block\_tag"                           | The block which receives the event.                                                                                             |
| Output Event  | "output"     | Event name(string)                                                | "event\_name"                          | Action or issue that caused the event.                                                                                          |
| Input Event   | "input"      | Event name(string)                                                | "event\_name"                          | Action which will be triggered by the event.                                                                                    |
| Event Actor   | "actor"      | <p>Event Initiator</p><p>Document Owner</p><p>Document Issuer</p> | <p>""</p><p>"owner"</p><p>"issuer"</p> | Allows to transfer control of the block (execution context) to another user. Empty field leaves control at the Event Initiator. |
| Disabled      | "disabled"   | True/False                                                        | true/false                             | Allows to disable the event without deleting it.                                                                                |

To know more information about events, please look at [Events](events.md).
