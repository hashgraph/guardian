---
description: 'API Version: 0.3.0'
---

# downloadGeoTiff

<mark style="color:green;">`GET`</mark> `/dataset/{dataset}/{version}/download/geotiff`

Get geotiff raster tile.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name           | Type   | Description   |
| -------------- | ------ | ------------- |
| dataset        | string | Dataset       |
| version        | number | Version       |
| grid           | number | Grid          |
| tile\_id       | number | Tile ID       |
| pixel\_meaning | string | Pixel Meaning |

**Response**

{% tabs %}
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
