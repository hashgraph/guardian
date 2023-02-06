# filtersAddOnBlock

{% hint style="info" %}
Note: This block is used for dropdown. You can add multiple blocks to 1 grid to combine different data.&#x20;
{% endhint %}

### Properties

| Block Property | Definition                                                                                                                                       | Example Input                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| type           | A block for providing dynamic filters to DocumentsSourceAddOn Block                                                                              | **filtersAddOn**Block (Can't be changed).                             |
| tag            | Unique name for the logic block.                                                                                                                 | report\__by\__project                                                 |
| permissions    | Which entity has rights to interact at this part of the workflow.                                                                                | Installer.                                                            |
| defaultActive  | Shows whether this block is active at this time and whether it needs to be shown.                                                                | Checked or unchecked.                                                 |
| dependencies   | Automatic update. The block is automatically re-rendered if any of the linked components gets updated.                                           | Select the appropriate block from the dropdown.                       |
| type           | Filter type, so far only Dropdown type - allows the user to select one of the available values.                                                  | The list of available values is provided by DocumentsSourceAddonBlock |
| canBeEmpty     | if true - if the filter is empty, then it is not taken into account when filtering. If false - then after filtering there will be an empty array | checked or unchecked                                                  |
| field          | the field by which the filtering will take place                                                                                                 | document.credentialSubject.0.ref                                      |
| optionName     | the field to be used as the label                                                                                                                | document.credentialSubject.0.id                                       |
| optionValue    | the field that will act as the value                                                                                                             | document.credentialSubject.0.id                                       |

### UI Properties

| Filter Property | Definition             | Example Input |
| --------------- | ---------------------- | ------------- |
| Title           | Filter title           | Filter1       |
| Button Context  | text inside the button | Project       |

### API Parameters

{% swagger method="get" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="policyID" type="String" required="true" %}
Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" %}
Block UUID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
  "id": "a4b87158-7428-48ac-b69b-762f96777edc",
  "blockType": "filtersAddon",
  "type": "dropdown",
  "uiMetaData": {
    "options": [],
    "content": "Device"
  },
  "data": [
    {
      "name": "device1",
      "value": "did:hedera:testnet:EHXwuE486eSD4yGXr6qTNLstmb8H1B2Jn4kx3PeWZzjv_0.0.1675232535045"
    }
  ],
  "optionName": "document.credentialSubject.0.field4.field0",
  "optionValue": "document.credentialSubject.0.id",
  "filterValue": "did:hedera:testnet:EHXwuE486eSD4yGXr6qTNLstmb8H1B2Jn4kx3PeWZzjv_0.0.1675232535045"
}

```
{% endswagger-response %}
{% endswagger %}

{% swagger method="post" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="filterValue" type="String" required="true" %}
New filter value
{% endswagger-parameter %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Block UUID
{% endswagger-parameter %}
{% endswagger %}
