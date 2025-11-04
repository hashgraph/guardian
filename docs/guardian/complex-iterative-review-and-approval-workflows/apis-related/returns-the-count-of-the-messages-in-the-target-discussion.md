# Returns the count of the messages in the target discussion

<mark style="color:green;">`GET`</mark> `/policy-comments/{policyId}/{documentId}/comments/count`

Returns the count of the messages in the target discussion

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name       | Type   | Description         |
| ---------- | ------ | ------------------- |
| policyId   | string | Policy ID           |
| documentId | string | Document Identifier |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PolicyCommentDTO'
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

{% tab title="503" %}
```json5
description: Block Unavailable.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ServiceUnavailableErrorDTO'
```
{% endtab %}
{% endtabs %}
