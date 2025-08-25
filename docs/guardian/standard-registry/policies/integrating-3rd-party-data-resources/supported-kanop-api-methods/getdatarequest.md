---
description: 'API Version: 1.102.0'
---

# getDataRequest

<mark style="color:green;">`GET`</mark>`/projects/{projectId}/requests/{requestId}`

Get Data Request.

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
  "requestId": "d385ab22-0f51-4b97-9ecd-b8ff3fd4fcb6",
  "projectId": 0,
  "requestMeasurementDate": "2019-08-24",
  "status": "REQUESTED",
  "tiers": "monitoring",
  "product": "Monitoring 25m",
  "comments": "string",
  "createdAt": "2019-08-24T14:15:22Z",
  "methodology": "string",
  "metrics": [],
  "runs": [],
  "downloads": [],
  "configuration": {
    "allometricRelationships": [
      {
        "label": "Carbon stock",
        "details": {
          "formula": "string"
        }
      }
    ],
    "forestCoverDefinition": {
      "label": "string",
      "details": {
        "minTreeHeight": 0,
        "minArea": 0,
        "crownCoverPercentage": 100
      },
      "configId": 0
    },
    "recalibration": {
      "collections": [
        {
          "collection_id": "4bdef85c-3f50-4006-a713-2350da665f80",
          "label": "string",
          "plot_count": 0,
          "validated_on": "2019-08-24",
          "created_on": "2019-08-24"
        }
      ]
    }
  },
  "createdBy": "string",
  "owner": "string"
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
