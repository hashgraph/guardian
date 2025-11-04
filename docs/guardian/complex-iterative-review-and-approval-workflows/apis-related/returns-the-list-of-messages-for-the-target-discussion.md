# Returns the list of messages for the target discussion

<mark style="color:red;">`POST`</mark> `/policy-comments/{policyId}/{documentId}/discussions/{discussionId}/comments/search`

Returns the list of messages for the target discussion

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name         | Type    | Description           |
| ------------ | ------- | --------------------- |
| policyId     | string  | Policy ID             |
| documentId   | string  | Document Identifier   |
| discussionId | string  | Discussion Identifier |
| readonly     | boolean | ReadOnly              |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
description: Successful operation.
          headers:
            X-Total-Count:
              schema:
                type: integer
              description: Total items in the collection.
          content:
            application/json:
              schema:
                type: array
                items:
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
{% endtabs %}
