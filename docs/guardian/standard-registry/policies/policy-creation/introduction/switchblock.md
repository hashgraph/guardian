# switchBlock

### Properties

| Block Property     | Definition                                                                        | Example Input                                                                                                                                                                          | Status |
| ------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| tag                | Unique name for the logic Block.                                                  | **switchBlock**                                                                                                                                                                        |        |
| permissions        | Which entity has rights to interact at this part of the workflow.                 | Standard Registry                                                                                                                                                                      |        |
| defaultActive      | Shows whether this block is active at this time and whether it needs to be shown. | Checked or Unchecked                                                                                                                                                                   |        |
| On errors          | Called if the system error has occurs in the Block                                | <ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul>                                                                                                         |        |
| stop Propagation   | End processing here, don't pass control to the next block.                        | Checked or Unchecked                                                                                                                                                                   |        |
| Execution Flow     | Flow of Execution                                                                 | <ol><li>First True - only the ‘branch’ under the first ‘true’ condition gets executed.</li><li>2. All True - branches under all conditions evaluated as ‘true’ get executed.</li></ol> |        |
| Condition(i)       | number of the condition                                                           | if (field(0))>1                                                                                                                                                                        |        |
| Condition Type     | Type of the condition                                                             | Equal - resolves as true if the condition is true - Not Equal - resolved as true if the condition is false - Unconditional - always true                                               |        |
| Condition (String) | condition expression which can contain math formulas                              | field0 > 0                                                                                                                                                                             |        |
| Actor              | the permissions/role context of the execution of the next block                   | Current User - user under whom the condition is evaluated - Document Owner - the creator of the document - Document Issuer - the signator of the document                              |        |
| Condition Tag      | The name of the dynamic events to use                                             | Condition 1                                                                                                                                                                            |        |

![](../../../../../.gitbook/assets/Events\_11.png)

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
