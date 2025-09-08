---
description: 'API Version: 0.3.0'
---

# retrieveAssetStatistics

<mark style="color:green;">`GET`</mark> `/dataset/{dataset}/{version}/stats`

Retrieve Asset Statistics.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name    | Type   | Description |
| ------- | ------ | ----------- |
| dataset | string | Dataset     |
| version | number | version     |

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
