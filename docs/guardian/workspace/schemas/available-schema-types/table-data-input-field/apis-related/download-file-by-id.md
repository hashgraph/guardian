# Download file by id

<mark style="color:green;">`GET`</mark> `/artifacts/files/{fileId}`

Returns file from GridFS

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name   | Type   | Description |
| ------ | ------ | ----------- |
| fileId | string | File ID     |

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
