---
description: 'API Version: 0.3.0'
---

# getStats

<mark style="color:green;">`GET`</mark> `/asset/{asset_id}/stats`

Get stats for asset.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description |
| --------- | ------ | ----------- |
| asset\_Id | string | Asset ID    |

**Response**

{% tabs %}
{% tab title="200" %}
```javascript
{
  "data": {
    "row_count": 0,
    "field_stats": [
      {
        "data_type": "bigint",
        "min": 0,
        "max": 0,
        "sum": 0,
        "mean": 0,
        "std_dev": 0
      }
    ]
  },
  "status": "success"
}
```
{% endtab %}

{% tab title="422" %}
```javascript
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
