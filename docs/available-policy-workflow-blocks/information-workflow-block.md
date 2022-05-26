# InformationBlock

### Properties

| Block Property   | Definition                                                                        | Example Input                                   | Status                                     |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| type             | A block type which can display a notification or a progress bar.                  | **InformationBlock** (Can't be changed).        |                                            |
| tag              | Unique name for the logic block.                                                  | wait\_for\_approval.                            |                                            |
| permissions      | Which entity has rights to interact at this part of the workflow.                 | Installer.                                      |                                            |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                           |                                            |
| dependencies     | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown. | <mark style="color:red;">Deprecated</mark> |
| stop Propagation | End processing here, don't pass control to the next block.                        | Checked or Unchecked.                           |                                            |

{% hint style="info" %}
RefreshEvents are used to refreshing the UI, instead of "dependencies" property.
{% endhint %}

### UI Properties

| UI Property | Definition                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| Type        | Select the type of UI element for notifications. It can be either a LOADER (progress bar) or TEXT box |
| Title       | Provides the Loader or Text box a title.                                                              |
| Description | Provides the Loader or Text box a description.                                                        |

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

### API Parameters

{% swagger method="get" path="" baseUrl="blockType: 'InformationBlock'" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="uiMetaData" required="true" %}
{}
{% endswagger-parameter %}
{% endswagger %}
