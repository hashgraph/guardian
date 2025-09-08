---
description: 'API Version: 0.3.0'
---

# getExtentForAsset

<mark style="color:green;">`GET`</mark> `/asset/{asset_id}/extent`

Get extent for asset.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description |
| --------- | ------ | ----------- |
| asset\_Id | string | Asset ID    |

Response

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
