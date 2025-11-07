# Associates the user with the provided Hedera token Asynchronously

<mark style="color:green;">`PUT`</mark> `/tokens/push/{tokenId}/associate/{accountId}`

Associates the user with the provided Hedera token. Only users with the\
Installer role are allowed to make the request.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description |
| --------- | ------ | ----------- |
| tokenId   | string | Token ID    |
| accountId | string | Account ID  |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
{
  description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TaskDTO'
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
{
description: Forbidden.
}
```
{% endtab %}

{% tab title="500" %}
```json5
{
description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
}
```
{% endtab %}
{% endtabs %}
