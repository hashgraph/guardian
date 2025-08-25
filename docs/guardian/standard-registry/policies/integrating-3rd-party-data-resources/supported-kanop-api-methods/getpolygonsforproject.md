---
description: 'API Version: 1.102.0'
---

# getPolygonsForProject

<mark style="color:green;">`GET`</mark>`/projects/{projectId}/polygons`

Get Polygons For Project.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description |
| --------- | ------ | ----------- |
| projectId | string | Project ID  |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  "projectId": 0,
  "geometry": {}
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
