---
description: 'API Version: 1.102.0'
---

# getProjectIndicatorsForRequest

<mark style="color:green;">`GET`</mark>`/projects/{projectId}/requests/{requestId}/metrics/{indicators}`

Get Project Indicators For Request.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name       | Type   | Description |
| ---------- | ------ | ----------- |
| projectId  | string | Project ID  |
| requestId  | string | Request ID  |
| indicators | number | Indicators  |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  "meta": {
    "version": "v1",
    "requestTimestamp": 1753782514,
    "page": {
      "size": 1,
      "current": 1
    }
  },
  "context": {
    "projectId": 0,
    "runId": 0,
    "indicators": [
      "string"
    ],
    "aggregationLevel": "string",
    "aggregationLevelValues": [
      "string"
    ]
  },
  "results": {
    "property1": {
      "average": 0,
      "median": 0,
      "range": [
        0
      ],
      "averageDistribution": [
        null
      ]
    },
    "property2": {
      "average": 0,
      "median": 0,
      "range": [
        0
      ],
      "averageDistribution": [
        null
      ]
    }
  }
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
