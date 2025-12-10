# Return policy to editing. Only users with the Standard Registry can make request

<mark style="color:green;">`PUT`</mark> `/tools/{id}/draft`

Return policy to editing. Only users with the Standard Registry role are\
allowed to make the request.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name | Type   | Description |
| ---- | ------ | ----------- |
| id   | string | Tool ID     |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
{
 description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ToolValidationDTO'
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
