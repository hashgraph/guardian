# Returns the list of private keys for the target document

<mark style="color:green;">`GET`</mark> `/policy-comments/{policyId}/{documentId}/keys`

Returns the list of private keys for the target document

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name         | Type   | Description           |
| ------------ | ------ | --------------------- |
| policyId     | string | Policy ID             |
| documentId   | string | Document Identifier   |
| discussionId | string | Discussion Identifier |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
description: Successful operation.
          content:
            application/json:
              schema:
                type: string
                format: binary
```
{% endtab %}

{% tab title="401" %}
```json5
{
   description: Unauthorized.
}
```
{% endtab %}

{% tab title="403" %}
```json5
description: Forbidden.
```
{% endtab %}

{% tab title="500" %}
```json5
description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endtab %}
{% endtabs %}
