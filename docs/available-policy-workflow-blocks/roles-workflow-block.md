# PolicyRolesBlock

### Properties

| Block Property | Definition                                                                        | Example Input                                   |
| -------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| Type           | A block which determines a role for the user.                                     | **PolicyRoles**Block (Can't be changed).        |
| Tag            | Unique name for the logic block.                                                  | choose\_role.                                   |
| Permissions    | Which entity has rights to interact at this part of the workflow.                 | Installer.                                      |
| Default Active | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                           |
| Dependancies   | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown. |
| Roles          | Available roles from which the user can choose.                                   | Select the appropriate roles from the dropdown. |

### UI Properties

| UI Property | Definition                                   |
| ----------- | -------------------------------------------- |
| Title       | Provide the a title for the role selector.   |
| Description | Provide a description on the role selection. |

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

