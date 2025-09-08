# Copy Schema

<mark style="color:green;">`POST`</mark> `/schemas/push/copy`

Copy schema. Only users with the Standard Registry role are allowed to\
make the request.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name       | Type    | Description        |
| ---------- | ------- | ------------------ |
| iri        | string  | IRI                |
| topicId    | number  | Topic ID           |
| name       | string  | Schema name        |
| copyNested | boolean | Copy Nested Schema |

**Response**

{% tabs %}
{% tab title="200" %}
```json
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
```json
{
  description: Unauthorized.
}
```
{% endtab %}

{% tab title="403" %}
```
{
description: Forbidden.
}
```
{% endtab %}

{% tab title="500" %}
```
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
