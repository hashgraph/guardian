# Deletes file from GridFS by id

Deletes file from GridFS by \_id

<mark style="color:red;">`DELETE`</mark> `/artifacts/files/{fileId}`

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name   | Type   | Description |
| ------ | ------ | ----------- |
| fileId | string | File \_id   |

**Response**

{% tabs %}
{% tab title="401" %}
```json5
description: Unauthorized.
```
{% endtab %}

{% tab title="403" %}
```json5
description: Forbidden.
```
{% endtab %}
{% endtabs %}
