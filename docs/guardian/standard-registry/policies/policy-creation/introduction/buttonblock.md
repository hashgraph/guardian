# buttonBlock

### Properties

| Block Property   | Definition                                                                        | Example Input                                                                  | Status |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------ |
| tag              | Unique name for the logic block.                                                  | **buttonBlock**                                                                |        |
| permissions      | Which entity has rights to interact at this part of the workflow.                 | VVB                                                                            |        |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                                                          |        |
| On errors        | Called if the system error has occurs in the Block                                | <ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul> |        |
| stop Propagation | End processing here, don't pass control to the next block.                        | Checked or unchecked.                                                          |        |

### Button

| Block Property            | Definition                                                                                                                                                                                                           | Example Input                                                                                                            | Status |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------ |
| Type                      | Type of the Button                                                                                                                                                                                                   | <p>Two types of buttons:<br>1. Selector : Simply button. 2. Selector - dialog : button with dialog</p>                   |        |
| Button Tag                | Tag of the button will be chosen in events tab                                                                                                                                                                       | Button\_0                                                                                                                |        |
| Dialog Title              | pop - up dialog title. this field gets enabled when button type is Selector-dialog                                                                                                                                   | Reject                                                                                                                   |        |
| Dialog Description        | It is the text inside dialog pop up. This field is enabled when button type is Selector - dialog                                                                                                                     | Enter reject reason                                                                                                      |        |
| Button Name               | Label of the button                                                                                                                                                                                                  | Validate                                                                                                                 |        |
| Field                     | Field of document to change                                                                                                                                                                                          | option.status                                                                                                            |        |
| Value                     | Value to set                                                                                                                                                                                                         | Validated                                                                                                                |        |
| UI Class                  | UI class of the button                                                                                                                                                                                               | btn-approve                                                                                                              |        |
| hideWhenDiscontinued      | Check if the button should be hidden when policy is discontinued                                                                                                                                                     | Checked/Unchecked                                                                                                        |        |
| Filters                   | array of addition visible filters                                                                                                                                                                                    | <p>Field (field) – field of document.</p><p>Value (value) – field to compare.</p><p>Type (type)– type of comparison.</p> |        |
| dialogResultFieldPath     | This will allow to define destination field where value from dialog will be stored. Also it will not override value of this field, it will only be replaced to array or value will be just pushed to existing array. | Field Path                                                                                                               |        |
| Enable Individual Filters | As per button visibility filters instead of hiding all buttons                                                                                                                                                       | Checked or Unchecked                                                                                                     |        |

### API Parameters

<mark style="color:blue;">`GET`</mark> `/policies/{policyId}/blocks/{uuid}`

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| policyId<mark style="color:red;">\*</mark> | String | Policy ID   |
| uuid<mark style="color:red;">\*</mark>     | String | Block UUID  |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
  "id": "fa4c1642-700a-44f6-a8eb-1089e77c4d64",
  "blockType": "buttonBlock",
  "type": "selector",
  "uiMetaData": {
    "options": [
      {
        "title": "",
        "name": "Add",
        "tooltip": "",
        "type": "text",
        "value": "Waiting for Validation",
        "uiClass": "btn-approve",
        "bindBlock": "save_added",
        "tag": "Option_0"
      }
    ],
    "content": "VVB",
    "buttons": [
      {
        "tag": "Option_0",
        "name": "Add",
        "type": "selector",
        "filters": [],
        "field": "option.status",
        "value": "Waiting for Validation",
        "uiClass": "btn-approve"
      }
    ]
  }
}

```
{% endtab %}
{% endtabs %}

<mark style="color:green;">`POST`</mark> `/policies/{policyId}/blocks/{uuid}`

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| policyId<mark style="color:red;">\*</mark> | String | Policy ID   |
| uuid<mark style="color:red;">\*</mark>     | String | Block UUID  |

#### Request Body

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| document<mark style="color:red;">\*</mark> | Object | VC Document |
