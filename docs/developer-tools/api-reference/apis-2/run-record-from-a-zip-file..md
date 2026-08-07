# Run record from a zip file.

<mark style="color:green;">`POST`</mark> `/users`

Run record from a zip file. Only users with the Standard Registry role are allowed to make the request.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name           | Type   | Description      |
| -------------- | ------ | ---------------- |
| policyId       | string | Policy ID        |
| importRecords  | string | Imported Records |
| syncNewRecords | string | New Records      |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
{
  description: Record UUID.
          content:
            application/json:
              schema:
                type: string
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
