# reassigningBlock

### Properties

<table><thead><tr><th width="192.33333333333331">Block Property</th><th>Definition</th><th>Example Input</th><th>Status</th></tr></thead><tbody><tr><td>type</td><td>A block type which re-signs the document and change the user to document owner.</td><td><strong>reassigningBlock</strong> (Can't be changed).</td><td></td></tr><tr><td>tag</td><td>Unique name for the logic block.</td><td>wait_for_approval.</td><td></td></tr><tr><td>permissions</td><td>Which entity has rights to interact at this part of the workflow.</td><td>Installer.</td><td></td></tr><tr><td>defaultActive</td><td>Shows whether this block is active at this time and whether it needs to be shown.</td><td>Checked or unchecked.</td><td></td></tr><tr><td>dependencies</td><td>Establish workflow dependancies that need to be completed prior.</td><td>Select the appropriate block from the dropdown.</td><td><mark style="color:red;">Deprecated</mark></td></tr><tr><td>stop Propagation</td><td>End processing here, don't pass control to the next block.</td><td>Checked or Unchecked.</td><td></td></tr><tr><td>issuer</td><td>Person, who will be a Signer</td><td>not set - Current User<br>owner - document Owner<br>policyOwner - Policy Owner</td><td></td></tr><tr><td>actor</td><td>Person, who will be next Block Owner</td><td>not set - Current User<br>owner - document Owner<br>issuer - document Issuer</td><td></td></tr></tbody></table>

{% hint style="info" %}
RefreshEvents are used to refreshing the UI, instead of "dependencies" property.
{% endhint %}

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
