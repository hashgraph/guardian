# InterfaceContainerBlock

### Properties

| Block Property | Definition                                                                        | Example Input                                   | Status                                     |
| -------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| type           | A block which contains and organizes other blocks.                                | **InterfaceContainer**Block (Can't be changed). |                                            |
| tag            | Unique name for the logic block.                                                  | installer\_header.                              |                                            |
| permissions    | Which entity has rights to interact at this part of the workflow.                 | Installer.                                      |                                            |
| defaultActive  | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                           |                                            |
| dependencies   | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown. | <mark style="color:red;">Deprecated</mark> |

{% hint style="info" %}
RefreshEvents are used to refreshing the UI, instead of "dependencies" property.
{% endhint %}

### **UI Properties**

| UI Property | Definition                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| Title       | Provides a title for the UI element.                                                                               |
| Type BLANK  | Does not contain any frame, will render all child elements one after the other.                                    |
| Type TABS   | A container which has a tab for each of the child element. It will render the first child element as type "blank". |

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

### API Parameters

{% swagger method="get" path="" baseUrl="/policies/{policyID}/blocks/{uuid}" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="policyID" type="String" required="true" %}
Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" required="true" type="String" %}
block UUID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
    {
  "uiMetaData": {
    "type": "blank"
  },
  "id": "27c9f288-c4b4-4690-b3b9-9843cc90129f",
  "blockType": "interfaceContainerBlock",

}
```
{% endswagger-response %}
{% endswagger %}
