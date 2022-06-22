# PolicyRolesBlock

### Properties

| Block Property | Definition                                                                        | Example Input                                   | Status                                     |
| -------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| type           | A block which determines a role for the user.                                     | **PolicyRoles**Block (Can't be changed).        |                                            |
| tag            | Unique name for the logic block.                                                  | choose\_role.                                   |                                            |
| permissions    | Which entity has rights to interact at this part of the workflow.                 | Installer.                                      |                                            |
| defaultActive  | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                           |                                            |
| dependencies   | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown. | <mark style="color:red;">Deprecated</mark> |
| roles          | Available roles from which the user can choose.                                   | Select the appropriate roles from the dropdown. |                                            |

{% hint style="info" %}
RefreshEvents are used to refreshing the UI, instead of "dependencies" property.
{% endhint %}

### UI Properties

| UI Property | Definition                                   |
| ----------- | -------------------------------------------- |
| Title       | Provide the a title for the role selector.   |
| Description | Provide a description on the role selection. |

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

{% swagger method="get" path="" baseUrl="blockType: 'PolicyRolesBlock'" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="roles" type="array" required="true" %}
List of available roles
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uiMetaData" required="true" %}
{}
{% endswagger-parameter %}
{% endswagger %}

{% swagger method="post" path="" baseUrl="blockType: 'PolicyRolesBlock" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="role" type="String" required="true" %}

{% endswagger-parameter %}
{% endswagger %}
