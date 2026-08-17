# Download file by id

Download file by id

<mark style="color:green;">`GET`</mark> `/artifacts/files/{fileId}`

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
{% tab title="200" %}
```json5
description: Raw file contents (streamed)
```
{% endtab %}

{% tab title="500" %}
```json5
description: Internal server error
```
{% endtab %}
{% endtabs %}
