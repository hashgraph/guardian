---
description: 'API Version: 1.102.0'
---

# getConfiguration

<mark style="color:green;">`GET`</mark>`/projects/{projectId}/configurations`

Get Configuration.

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
  "configurations": [
    {
      "projectId": 0,
      "configurationId": 0,
      "content": {
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
      "createdBy": 0,
      "isActive": true,
      "appliedFrom": "2019-08-24T14:15:22Z",
      "appliedUntil": "2019-08-24T14:15:22Z"
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
