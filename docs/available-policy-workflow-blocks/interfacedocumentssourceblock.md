# InterfaceDocumentsSourceBlock

### Properties

| Block Property | Definition                                                                                             | Example Input                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Type           | A block type which outputs information from the DB as grid.                                            | **InterfaceDocumentsSource** Block (Can't be changed).               |
| Tag            | Unique name for the logic block.                                                                       | sensors\_grid.                                                       |
| Permissions    | Which entity has rights to interact at this part of the workflow.                                      | Installer.                                                           |
| Default Active | Shows whether this block is active at this time and whether it needs to be shown.                      | Checked or unchecked.                                                |
| Dependencies   | Automatic update. The block is automatically re-rendered if any of the linked components gets updated. | Select the appropriate block from the dropdown.                      |
| Data Type      | Specify the table to request the data from.                                                            | Current options are: Verifiable Credential, DID, Approve, or Hedera. |

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
