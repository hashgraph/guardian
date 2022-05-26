# reassigningBlock

### Properties

| Block Property   | Definition                                                                        | Example Input                                                                         | Status                                     |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------ |
| type             | A block type which re-signs the document and change the user to document owner.   | **reassigningBlock** (Can't be changed).                                              |                                            |
| tag              | Unique name for the logic block.                                                  | wait\_for\_approval.                                                                  |                                            |
| permissions      | Which entity has rights to interact at this part of the workflow.                 | Installer.                                                                            |                                            |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                                                                 |                                            |
| dependencies     | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown.                                       | <mark style="color:red;">Deprecated</mark> |
| stop Propagation | End processing here, don't pass control to the next block.                        | Checked or Unchecked.                                                                 |                                            |
| issuer           | Person, who will be a Signer                                                      | <p>not set - Current User<br>owner - document Owner<br>policyOwner - Policy Owner</p> |                                            |
| actor            | Person, who will be next Block Owner                                              | <p>not set - Current User<br>owner - document Owner<br>issuer - document Issuer</p>   |                                            |

{% hint style="info" %}
RefreshEvents are used to refreshing the UI, instead of "dependencies" property.
{% endhint %}

### Events

| Property Name | Name in JSON | Property Value                                                    | Value in JSON                                                                                                                   | Description |
| ------------- | ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Event Type    | -            | <p>Input Event</p><p>Output Event</p>                             | Type of the event - determines whether this is ingress or egress event for the current block.                                   |             |
| Source        | "source"     | Block tag(string)                                                 | The block which initiates the event.                                                                                            |             |
| Target        | "target"     | Block tag(string)                                                 | The block which receives the event.                                                                                             |             |
| Output Event  | "output"     | Event name(string)                                                | Action or issue that caused the event.                                                                                          |             |
| Input Event   | "input"      | Event name(string)                                                | Action which will be triggered by the event.                                                                                    |             |
| Event Actor   | "actor"      | <p>Event Initiator</p><p>Document Owner</p><p>Document Issuer</p> | Allows to transfer control of the block (execution context) to another user. Empty field leaves control at the Event Initiator. |             |
| Disabled      | "disabled"   | True/False                                                        | Allows to disable the event without deleting it.                                                                                |             |

To know more information about events, please look at [events.md](events.md "mention").
