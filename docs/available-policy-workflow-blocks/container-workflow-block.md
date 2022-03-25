# InterfaceContainerBlock

### Properties

| Block Property | Definition                                                                        | Example Input                                   |
| -------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| Type           | A block which contains and organizes other blocks.                                | **InterfaceContainer**Block (Can't be changed). |
| Tag            | Unique name for the logic block.                                                  | installer\_header.                              |
| Permissions    | Which entity has rights to interact at this part of the workflow.                 | Installer.                                      |
| Default Active | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                           |
| Dependencies   | Establish workflow dependancies that need to be completed prior.                  | Select the apprioriate block from the dropdown. |

### **UI Properties**

| UI Property | Definition                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| Title       | Provides a title for the UI element.                                                                               |
| Type BLANK  | Does not contain any frame, will render all child elements one after the other.                                    |
| Type TABS   | A container which has a tab for each of the child element. It will render the first child element as type "blank". |

### API Parameters



{% swagger method="get" path=" 'InterfaceContainerBlock'" baseUrl="blocktype :" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="id" type="String" required="true" %}
Block ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="blockType" type="String" required="true" %}
Block Type
{% endswagger-parameter %}

{% swagger-parameter in="path" name="blocks" type="array" required="true" %}
Contained blocks
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uiMetadata" required="true" %}
{}
{% endswagger-parameter %}
{% endswagger %}
