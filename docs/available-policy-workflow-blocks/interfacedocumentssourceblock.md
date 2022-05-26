# InterfaceDocumentsSourceBlock

### Properties

| Block Property | Definition                                                                                             | Example Input                                                        | Status                                     |
| -------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------ |
| type           | A block type which outputs information from the DB as grid.                                            | **InterfaceDocumentsSource** Block (Can't be changed).               |                                            |
| tag            | Unique name for the logic block.                                                                       | sensors\_grid.                                                       |                                            |
| permissions    | Which entity has rights to interact at this part of the workflow.                                      | Installer.                                                           |                                            |
| defaultActive  | Shows whether this block is active at this time and whether it needs to be shown.                      | Checked or unchecked.                                                |                                            |
| dependencies   | Automatic update. The block is automatically re-rendered if any of the linked components gets updated. | Select the appropriate block from the dropdown.                      | <mark style="color:red;">Deprecated</mark> |
| dataType       | Specify the table to request the data from.                                                            | Current options are: Verifiable Credential, DID, Approve, or Hedera. |                                            |

{% hint style="info" %}
RefreshEvents are used to refreshing the UI, instead of "dependencies" property.
{% endhint %}

### UI Properties

| UI Property        | Definition                                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title              | Type of the displayed value, possible options. Current options are: TEXT (ordinary text), BUTTON (a button), or BLOCK (a block embedded into the column).                              |
| Field Name         | Object fields to retrieve the values from. Internal fields are separated by ".", access to array elements is via index. This is the field name.                                        |
| Field Type         | Current Options: TEXT, BUTTON, AND BLOCK.                                                                                                                                              |
| Field Title        | Title of the column.                                                                                                                                                                   |
| Field Tooltip      | Provide a tooltip for the field.                                                                                                                                                       |
| Field Cell Content | Content inside the cell.                                                                                                                                                               |
| Field UI Class     | Arbitrary Class                                                                                                                                                                        |
| Width              | For example : 100px                                                                                                                                                                    |
| Bind Group         | If interfaceDocumentsSourceBlock has more than one documentsSourceAddon, then you can create different columns for each (names must be the same)                                       |
| Bind Block         | Specifying a "bindBlock" field would result in the display of the linked block in side the dialog.. Needs for the field type to be a BLOCK or BUTTON with the Action type as DIALOGUE. |
| Action             | Needs for the field type to be a BUTTON. Specifies what action will happen when the button is clicked. Action options are currently: LINK to a URL or prompt a DIALOGUE box.           |
| Dialogue Type      | Currently only json type is supported. Needs for the field type to be a BUTTON and Action to be DIALOGUE.                                                                              |
| Dialogue Content   | Provide content for the dialogue box. Needs for the field type to be a BUTTON and Action to be DIALOGUE.                                                                               |
| Dialogue Class     | Dialog style. Needs for the field type to be a BUTTON and Action to be DIALOGUE.                                                                                                       |

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

{% swagger method="get" path="" baseUrl="blockType: 'InterfaceDocumentsSource'" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="blocks" type="array" required="true" %}
Contained addons (filter)
{% endswagger-parameter %}

{% swagger-parameter in="path" name="data" type="array" required="true" %}
Data
{% endswagger-parameter %}

{% swagger-parameter in="path" name="Fields" type="array" required="true" %}
Column Description
{% endswagger-parameter %}
{% endswagger %}
