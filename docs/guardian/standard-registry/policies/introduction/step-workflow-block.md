# InterfaceStepBlock

### Properties

| Block Property | Definition                                                                                                      | Example Input                                   | Status                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| type           | Similar to the **InterfaceContainer**Block, with the difference that it can only render a single child element. | **InterfaceStep**Block (Can't be changed).      |                                            |
| tag            | Unique name for the logic block.                                                                                | CSD01 Document.                                 |                                            |
| permissions    | Which entity has rights to interact at this part of the workflow.                                               | Standard Registry.                              |                                            |
| defaultActive  | Shows whether this block is active at this time and whether it needs to be shown.                               | Checked or unchecked.                           |                                            |
| dependencies   | Establish workflow dependancies that need to be completed prior.                                                | Select the appropriate block from the dropdown. | <mark style="color:red;">Deprecated</mark> |
| cyclic         | Go back one step to enable the creation of the previous object.                                                 | Checked or unchecked.                           |                                            |

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

### API Parameters

{% swagger method="get" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Block UUID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
  "uiMetaData": {
    "type": "blank"
  },
  "index": 8,
  "id": "92fdc241-da15-46cb-9153-d223aeb61c5a",
  "blockType": "interfaceStepBlock",
  "blocks": [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    {
      "uiMetaData": {
        "type": "tabs"
      },
      "content": "interfaceContainerBlock",
      "blockType": "interfaceContainerBlock",
      "id": "768d5fae-a907-4566-aa87-62f6929a03c7"
    },
    null,
    null,
    null,
    null,
    null
  ]
}

```
{% endswagger-response %}
{% endswagger %}
