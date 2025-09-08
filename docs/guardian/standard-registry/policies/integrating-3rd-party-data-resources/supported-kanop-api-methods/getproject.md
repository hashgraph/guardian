---
description: 'API Version: 1.102.0'
---

# getProject

<mark style="color:green;">`GET`</mark>`/projects/{projectId}`

Get Project.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name       | Type   | Description |
| ---------- | ------ | ----------- |
| Project ID | string | Project ID  |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  "projectId": 0,
  "customerId": 0,
  "name": "string",
  "description": "string",
  "country": "string",
  "status": "CREATED",
  "area": 0,
  "polygonCount": 0,
  "createdAt": "string",
  "updatedAt": "string",
  "owner": "string",
  "creator": "string",
  "metrics": [
    "string"
  ]
}
```
{% endtab %}

{% tab title="422" %}
```json
{
  "detail": [
    {
      "loc": [
        "string"
      ],
      "msg": "string",
      "type": "string"
    }
  ]
}
```
{% endtab %}
{% endtabs %}
