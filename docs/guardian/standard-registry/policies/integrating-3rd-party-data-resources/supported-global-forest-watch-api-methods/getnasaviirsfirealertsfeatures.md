---
description: 'API Version: 0.3.0'
---

# getNasaViirsFireAlertsFeatures

<mark style="color:green;">`GET`</mark> `/dataset/nasa_viirs_fire_alerts/{version}/features`

Get Nasa Viirs fire alerts features.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name        | Type   | Description |
| ----------- | ------ | ----------- |
| version     | string | version     |
| lat         | number | Latitude    |
| lng         | number | Longitude   |
| z           | number | zoom level  |
| start\_date | Date   | Start Date  |
| end\_date   | Date   | End Date    |

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
