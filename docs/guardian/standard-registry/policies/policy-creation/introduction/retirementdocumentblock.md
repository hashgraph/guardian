# retirementDocumentBlock

### Properties

| Block Property   | Definition                                                                        | Example Input                                   | Status                                     |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| type             | Receives the VC from the previous block and retires based on the rule(s).         | **retirementDocument**Block(Can't be changed).  |                                            |
| tag              | Unique name for the logic block.                                                  | retire\_token.                                  |                                            |
| permissions      | Which entity has rights to interact at this part of the workflow.                 | Standard Registry.                              |                                            |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                           |                                            |
| dependencies     | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown. | <mark style="color:red;">Deprecated</mark> |
| stop Propagation | End processing here, don't pass control to the next block.                        | Checked or unchecked.                           |                                            |

### UI Properties

| UI Property | Definition                                                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token       | Select which token to retire. The token must exist in the Guardian instance.                                                                                                 |
| Rule        | Rules under which the number of tokens is calculated. Math operations are supported, e.g. the following will result in 20 tokens: data = { amount: 2 } rule = "amount \* 10" |

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

To know more information about events, please look at [events.md](events.md "mention").
