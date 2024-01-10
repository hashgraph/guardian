# paginationAddon

## Properties

| Block Property | Definition                                                                        | Example Input                                   |
| -------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| type           | A block type which adds pagination to the InterfaceDocumentSourceBlock if added   | **paginationAddon** (Can't be changed).         |
| tag            | Unique name for the logic block.                                                  |                                                 |
| permissions    | Which entity has rights to interact at this part of the workflow.                 | Installer                                       |
| defaultActive  | Shows whether this block is active at this time and whether it needs to be shown. | Checked or Unchecked                            |
| dependencies   | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown. |

## API Parameters

{% swagger method="get" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="Requests Block Data" %}
{% swagger-description %}
Requests Block Data
{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Selected policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Selected Block UUID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Succesful Operation" %}
```
{
		  "size": 5,
		  "itemsPerPage": 10,
		  "page": 0
}
```
{% endswagger-response %}
{% endswagger %}

{% swagger method="get" path="" baseUrl="/policies/{policyId}/tag/{tag}/blocks" summary="Requests Block Data by Tag" %}
{% swagger-description %}
Requests Block Data by Tag
{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Selected Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="tag" type="String" required="true" %}
Tag from the selected policy
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
{
		  "size": 5,
		  "itemsPerPage": 10,
		  "page": 0
}
```
{% endswagger-response %}
{% endswagger %}

{% swagger method="post" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="Sends data to the specified block" %}
{% swagger-description %}
Sends data to the specified block
{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Selected Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Selected Block UUID
{% endswagger-parameter %}

{% swagger-parameter in="body" type="Object" required="true" %}
Object with the data to be sent to the block
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}

{% endswagger-response %}
{% endswagger %}

{% swagger method="post" path="" baseUrl="/policies/{policyId}/tag/{tag}/blocks" summary="Sends data to the specified block by tag" %}
{% swagger-description %}
Sends data to the specified block
{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Selected Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Selected Block UUID
{% endswagger-parameter %}

{% swagger-parameter in="body" type="Object" required="true" %}
Object with the data to be sent to the block
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}

{% endswagger-response %}
{% endswagger %}
