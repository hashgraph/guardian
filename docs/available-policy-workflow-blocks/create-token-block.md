# Create Token Block

## Properties

| Block Property   | Definition                                                                                      | Example Input                              | Status |
| ---------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------ | ------ |
| type             | A type of the block which creates a form from the schema, and sends the document to the server. | **Create Token** Block (Can't be changed). |        |
| tag              | Unique name for the logic block.                                                                | add\_new\_installer\_request.              |        |
| permissions      | Which entity has rights to interact at this part of the workflow.                               | Standard Registry.                         |        |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown.               | Checked or unchecked.                      |        |
| stop propagation | End processing here, don't pass control to the next block.                                      | Checked or Unchecked.                      |        |
| Token Template   | We can set template by which we want to create token                                            | token\_template_\__0                       |        |

## UI Properties

| UI Property          | Definition                                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type                 | Style of the render of the form. It can be either a Page (the form is rendered as a page) or Dialogue (displays a button, which opens a dialogue with the form when clicked). |
| Title                | Provides the Page or Dialogue box a title.                                                                                                                                    |
| Description          | Provides the Page or Dialogue box a description.                                                                                                                              |
| Button Content       | Text to fill inside a button. Needs the Dialogue box to be selected from the "Type."                                                                                          |
| Dialogue Text        | Provides a tile inside the Dialogue box. Needs the dialogue box to be selected from the "Type."                                                                               |
| Dialogue Description | Provides a description inside the Dialogue box. Needs the dialogue box to be selected from the "Type."                                                                        |

### API Parameters

{% swagger method="get" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Block UUID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
  "id": "a411e417-bff7-49dc-bbf0-a4e5b7501b73",
  "blockType": "createTokenBlock",
  "uiMetaData": {
    "type": "page",
    "title": "Create Token",
    "description": "Please enter token info"
  },
  "active": true,
  "data": {
    "templateTokenTag": "token_template_0",
    "tokenType": "fungible",
    "decimals": 3,
    "enableAdmin": true,
    "changeSupply": true
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

{% swagger-parameter in="body" name="tokenName" type="String" required="true" %}
Token Name
{% endswagger-parameter %}

{% swagger-parameter in="body" name="tokenSymbol" type="String" required="true" %}
Token Symbol
{% endswagger-parameter %}

{% swagger-parameter in="body" name="tokenType" type="String" required="true" %}
Fungible or Non Fungible
{% endswagger-parameter %}

{% swagger-parameter in="body" name="decimals" type="String" required="true" %}
Token decimals
{% endswagger-parameter %}

{% swagger-parameter in="body" name="enableAdmin" type="Boolean" required="true" %}
Enable Admin Flag
{% endswagger-parameter %}

{% swagger-parameter in="body" name="enableSupply" type="Boolean" required="true" %}
Enable Supply Flag
{% endswagger-parameter %}

{% swagger-parameter in="body" name="enableFreeze" type="Boolean" required="true" %}
Enable Freeze Flag
{% endswagger-parameter %}

{% swagger-parameter in="body" name="enableKYC" type="Boolean" required="true" %}
Enable KYC Flag
{% endswagger-parameter %}

{% swagger-parameter in="body" name="enableWipe" type="Boolean" required="true" %}
Enable Wipe Flag
{% endswagger-parameter %}
{% endswagger %}
