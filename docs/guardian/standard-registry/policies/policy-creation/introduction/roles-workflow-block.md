# PolicyRolesBlock

This block allows the user to select a role or a group.

### Properties

| Block Property    | Definition                                                                        | Example Input                                   | Status |
| ----------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- | ------ |
| type              | A block which determines a role for the user.                                     | **PolicyRolesBlock** (Can't be changed).        |        |
| tag               | Unique name for the logic block.                                                  | choose\_role.                                   |        |
| permissions       | Which entity has rights to interact at this part of the workflow.                 | Installer.                                      |        |
| defaultActive     | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                           |        |
| roles             | Available roles from which the user can choose.                                   | Select the appropriate roles from the dropdown. |        |
| Available Roles   | list of roles for selected user                                                   | Checked or unchecked.                           |        |
| ·Available Groups | list of groups for selected user                                                  | Checked or unchecked.                           |        |

{% hint style="info" %}
**Note: ‘**_**Available Groups**_**’** option takes priority and thus, when set, causes the system to ignore **‘**_**Available Roles**_**’**.
{% endhint %}

{% hint style="info" %}
**Note:** Setting the Permissions property to ‘**No Role’** limits the visibility of this block to those users which have not yet selected a role or a group.
{% endhint %}

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

To know more information about events, please look at [Events](events.md).

### API Parameters

{% swagger method="get" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
PolicyID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" required="true" type="String" %}
Block UUID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
 {
  "roles": [],
  "groups": [
    "VVBs",
    "Project_Proponent"
  ],
  "groupMap": {
    "VVBs": {
      "groupAccessType": "Private",
      "groupRelationshipType": "Multiple"
    },
    "Project_Proponent": {
      "groupAccessType": "Private",
      "groupRelationshipType": "Single"
    }
  },
  "isMultipleGroups": true,
  "uiMetaData": {
    "title": "Roles",
    "description": "Choose Roles"
  }
}

```
{% endswagger-response %}
{% endswagger %}

{% swagger method="post" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Block UUID
{% endswagger-parameter %}

{% swagger-parameter in="body" name="role" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="invitation" type="String" required="false" %}
Invite Code
{% endswagger-parameter %}

{% swagger-parameter in="body" name="Group" type="String" required="false" %}
Group Name
{% endswagger-parameter %}
{% endswagger %}
