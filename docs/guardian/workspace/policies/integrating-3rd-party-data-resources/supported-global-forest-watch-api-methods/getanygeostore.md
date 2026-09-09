---
description: 'API Version: 0.3.0'
---

# getAnyGeostore

<mark style="color:green;">`GET`</mark> `/geostore/{geostore_id}`

Retrieve GeoJSON representation for a given geostore ID of any dataset.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name         | Type   | Description |
| ------------ | ------ | ----------- |
| geostore\_Id | string | Geostore ID |

Response

{% tabs %}
{% tab title="200" %}
```javascript
{
  "data": {
    "created_on": "2019-08-24T14:15:22Z",
    "updated_on": "2019-08-24T14:15:22Z",
    "gfw_geostore_id": "c4d9b2a2-ea1d-4630-9a25-32ca1539af6e",
    "gfw_geojson": {
      "type": "string",
      "coordinates": [
        null
      ]
    },
    "gfw_area__ha": 0,
    "gfw_bbox": [
      0
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
