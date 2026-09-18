---
description: 'API Version: 1.102.0'
---

# getSummaryMetricsForRequest

<mark style="color:green;">`GET`</mark>`/projects/{projectId}/requests/{requestId}/metrics`

Get Summary Metrics For Request.

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
    "runId": 0
  },
  "results": {
    "forestCover": 0,
    "canopyHeightMean": 0,
    "treeHeightMean": 0,
    "biomass": 0,
    "carbon": 0,
    "co2eq": 0
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
