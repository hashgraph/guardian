---
description: 'API Version: 1.102.0'
---

# getProjects

<mark style="color:green;">`GET`</mark>`/projects/`

Get Projects.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  "projects": [
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
      "creator": "string"
    }
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
