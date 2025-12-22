# Deletes all schemas by topic id. Only users with the Standard Registry are allowed.

<mark style="color:red;">`DELETE`</mark> `/schemas/topic/{topicId}`

Deletes all schema by topic ID.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name    | Type   | Description     |
| ------- | ------ | --------------- |
| topicId | string | Topic ID        |
| `age`   | number | Age of the user |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
description: Successful operation.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/SchemaDTO'
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
