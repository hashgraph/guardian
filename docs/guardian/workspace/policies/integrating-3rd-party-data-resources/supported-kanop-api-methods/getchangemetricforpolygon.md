---
description: 'API Version: 1.102.0'
---

# getChangeMetricForPolygon

<mark style="color:green;">`GET`</mark>`/projects/{projectId}/requests/{requestId}/geoChange/{indicator}`

Get Change Metric For Polygon.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description |
| --------- | ------ | ----------- |
| projectId | string | Project ID  |
| requestId | string | Request ID  |
| indicator | number | Indicator   |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  "type": "string",
  "features": [
    {
      "id": "string",
      "type": "string",
      "properties": {
        "aggregate": "string",
        "value": {
          "gain": 0,
          "loss": 0,
          "net": 0
        },
        "area": 0
      },
      "geometry": {
        "type": "string",
        "coordinates": [
          null
        ]
      }
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
