# Returns the list of user names which are present in the target policy and have access to the target

<mark style="color:green;">`GET`</mark> `/policy-comments/{policyId}/{documentId}/users`

Returns the list of user names which are present in the target policy\
and have access to the target document.

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
{
   description: Successful operation.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/PolicyCommentUserDTO'
}
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
