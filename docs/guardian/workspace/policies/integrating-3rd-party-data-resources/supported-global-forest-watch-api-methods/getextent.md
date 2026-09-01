---
description: 'API Version: 0.3.0'
---

# getExtent

<mark style="color:green;">`GET`</mark> `/dataset/{dataset}/{version}/extent`

Get extent.

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
    "features": [
      {
        "properties": {},
        "type": "string",
        "geometry": {
          "type": "string",
          "coordinates": [
            null
          ]
        }
      }
    ],
    "crs": {},
    "type": "string"
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
