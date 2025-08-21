---
description: 'API Version: 1.102.0'
---

# getAvailableFilesForRequest

<mark style="color:green;">`GET`</mark>`/projects/{projectId}/requests/{requestId}/gisFiles`

Get Available Files For Request.

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
  "GISFiles": [
    {
      "name": "string",
      "extension": "string",
      "links": [],
      "metadata": {
        "bbox": [
          [
            0
          ]
        ],
        "colorMapName": "string",
        "colorMap": [
          [
            "string"
          ]
        ],
        "discreteColorMap": true,
        "dataBounds": [
          0
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
