# InterfaceActionBlock

### Properties

| Block Property   | Definition                                                                        | Example Input                                                                   |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Type             | A block to create custom actions.                                                 | **InterfaceAction**Block (Can't be changed).                                    |
| Tag              | Unique name for the logic block.                                                  | download\_config\_btn.                                                          |
| Permissions      | Which entity has rights to interact at this part of the workflow.                 | Installer.                                                                      |
| Default Active   | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                                                           |
| Dependencies     | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown.                                 |
| Stop Propagation | End processing here, don't pass control to the next block.                        | Checked or unchecked.                                                           |
| Type             | Specific the type of action workflow action block.                                | Current options are: SELECTOR (select an action) and DOWNLOAD (download files). |

### UI Properties

| UI Property    | Definition                                                                                                                                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title          | Provides the title.                                                                                                                                                                                                                                                                             |
| Field          | Provides the field name. Action workflow type needs to be SELECTOR.                                                                                                                                                                                                                             |
| Option Name    | Provides the name of the option. Action workflow type needs to be SELECTOR.                                                                                                                                                                                                                     |
| Option Value   | Provides the value of the option. Action workflow type needs to be SELECTOR.                                                                                                                                                                                                                    |
| Bind Block     | Specify which block to pass control to. Action workflow type needs to be SELECTOR.                                                                                                                                                                                                              |
| UI Class       | Button style. Action workflow type needs to be SELECTOR.                                                                                                                                                                                                                                        |
| Button Content | Provide the content for the button. Action workflow type needs to be DOWNLOAD.                                                                                                                                                                                                                  |
| Schema         | Pre-configured schemas relevant for download to be selected from the drop down of available schemas in your Guardian instance. Only needed in the reference implementation of the Guardian because of the IoT Simulator that is generating MRV data. Action workflow type needs to be DOWNLOAD. |
| Target URL     | Set the target URL where the file should be stored. Only needed in the reference implementation of the Guardian because of the IoT Simulator that is generating MRV data. Action workflow type needs to be DOWNLOAD.                                                                            |
| User           | Action workflow type needs to be SELECTOR. It determines who will get update actions (Dependencies property in other blocks) and which user will be used in next Blocks. It can be "Current" or "Owner". "Current" - user under which the action is performed. "Owner" - document owner.        |

### API Parameters

{% swagger method="get" path="" baseUrl="blockType: 'InterfaceAction'" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="id" type="String" required="true" %}
Block ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="blockType" type="String" required="true" %}
Block Type
{% endswagger-parameter %}

{% swagger-parameter in="path" name="type" type="String" required="true" %}
Action type (dropdown / selector / download)
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uiMetaData" required="true" %}
{}
{% endswagger-parameter %}
{% endswagger %}

{% swagger method="post" path="" baseUrl="blockType: 'InterfaceAction" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="document" type="VC" required="true" %}
VC document
{% endswagger-parameter %}
{% endswagger %}
