# Existing file \_id to overwrite (optional)

<mark style="color:green;">`POST`</mark> `/artifacts/files`

Uploads/overwrites file in GridFS

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Response**

{% tabs %}
{% tab title="401" %}
```json5
description: Unauthorized.
```
{% endtab %}

{% tab title="403" %}
```json5
{
  description: Forbidden.
}
```
{% endtab %}
{% endtabs %}
