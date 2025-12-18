# Deletes the schema with the provided schema ID

<mark style="color:green;">`POST`</mark> `/schemas/delete-multiple`

Deletes the schema with the provided schema ID. Only users with the Standard Registry role is allowed to make this request.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name            | Type   | Description           |
| --------------- | ------ | --------------------- |
| includeChildren | string | Include Child Schemas |
| schemaIds       | string | Schema IDs            |

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
