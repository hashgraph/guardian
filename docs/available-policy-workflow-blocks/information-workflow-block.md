# InformationBlock

### Properties

| Block Property   | Definition                                                                        | Example Input                                   |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| Type             | A block type which can display a notification or a progress bar.                  | **InformationBlock** (Can't be changed).        |
| Tag              | Unique name for the logic block.                                                  | wait\_for\_approval.                            |
| Permissions      | Which entity has rights to interact at this part of the workflow.                 | Installer.                                      |
| Default Active   | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                           |
| Dependancies     | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown. |
| Stop Propagation | End processing here, don't pass control to the next block.                        | Checked or Unchecked.                           |

### UI Properties

| UI Property | Definition                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| Type        | Select the type of UI element for notifications. It can be either a LOADER (progress bar) or TEXT box |
| Title       | Provides the Loader or Text box a title.                                                              |
| Description | Provides the Loader or Text box a description.                                                        |

### API Parameters

{% swagger method="get" path="" baseUrl="blockType: 'InformationBlock'" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="uiMetaData" required="true" %}
{}
{% endswagger-parameter %}
{% endswagger %}
