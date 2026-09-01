---
description: 'API Version: 1.102.0'
---

# getProjectTsEvolutionIndicators

<mark style="color:green;">`GET`</mark>`/projects/{projectId}/evolution/{indicators}`

Get Project Ts Evolution Indicators.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name       | Type   | Description |
| ---------- | ------ | ----------- |
| projectId  | string | Project ID  |
| indicators | string | Indicators  |

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
    ],
    "timeseries": "string",
    "timeseriesValues": [
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
        {
          "aggregate": "string",
          "value": 0,
          "confidenceLowerBound": 0,
          "confidenceUpperBound": 0
        }
      ]
    },
    "property2": {
      "average": 0,
      "median": 0,
      "range": [
        0
      ],
      "averageDistribution": [
        {
          "aggregate": "string",
          "value": 0,
          "confidenceLowerBound": 0,
          "confidenceUpperBound": 0
        }
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
