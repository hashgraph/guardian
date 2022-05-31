# InterfaceActionBlock

### Properties

| Block Property   | Definition                                                                        | Example Input                                                                  | Status                                     |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------ |
| type             | A block to create custom actions.                                                 | **InterfaceAction**Block (Can't be changed).                                   |                                            |
| tag              | Unique name for the logic block.                                                  | download\_config\_btn.                                                         |                                            |
| permissions      | Which entity has rights to interact at this part of the workflow.                 | Installer.                                                                     |                                            |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                                                          |                                            |
| dependencies     | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown.                                | <mark style="color:red;">Deprecated</mark> |
| stop Propagation | End processing here, don't pass control to the next block.                        | Checked or unchecked.                                                          |                                            |
| type             | Specific the type of action workflow action block.                                | Current options are: SELECTOR (select an action) and DOWNLOAD (download files) |                                            |

### UI Properties

| UI Property    | Definition                                                                                                                                                                                                                                                                                      | Status                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Title          | Provides the title.                                                                                                                                                                                                                                                                             |                                            |
| Field          | Provides the field name. Action workflow type needs to be SELECTOR.                                                                                                                                                                                                                             |                                            |
| Option Name    | Provides the name of the option. Action workflow type needs to be SELECTOR.                                                                                                                                                                                                                     |                                            |
| Option Value   | Provides the value of the option. Action workflow type needs to be SELECTOR.                                                                                                                                                                                                                    |                                            |
| Bind Block     | Specify which block to pass control to. Action workflow type needs to be SELECTOR.                                                                                                                                                                                                              | <mark style="color:red;">Deprecated</mark> |
| UI Class       | Button style. Action workflow type needs to be SELECTOR.                                                                                                                                                                                                                                        |                                            |
| Button Content | Provide the content for the button. Action workflow type needs to be DOWNLOAD.                                                                                                                                                                                                                  |                                            |
| Schema         | Pre-configured schemas relevant for download to be selected from the drop down of available schemas in your Guardian instance. Only needed in the reference implementation of the Guardian because of the IoT Simulator that is generating MRV data. Action workflow type needs to be DOWNLOAD. |                                            |
| Target URL     | Set the target URL where the file should be stored. Only needed in the reference implementation of the Guardian because of the IoT Simulator that is generating MRV data. Action workflow type needs to be DOWNLOAD.                                                                            |                                            |
| User           | Action workflow type needs to be SELECTOR. It determines who will get update actions (Dependencies property in other blocks) and which user will be used in next Blocks. It can be "Current" or "Owner". "Current" - user under which the action is performed. "Owner" - document owner.        |                                            |
| Option Tag     | Name of the dynamic events                                                                                                                                                                                                                                                                      |                                            |



![](../.gitbook/assets/Events\_10.png)

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
