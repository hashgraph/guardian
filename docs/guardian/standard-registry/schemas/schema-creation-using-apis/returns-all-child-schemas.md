# Returns all child schemas

<mark style="color:green;">GET</mark> `/schema/{schemaId}/deletionPreview`

Returns all child schemas

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name     | Type   | Description     |
| -------- | ------ | --------------- |
| schemaId | string | Schema ID       |
| topicId  | string | Policy topic Id |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
description: Schema deletion preview.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/SchemaDeletionPreviewDTO'
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
