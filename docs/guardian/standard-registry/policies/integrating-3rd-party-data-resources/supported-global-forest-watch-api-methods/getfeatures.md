---
description: 'API Version: 0.3.0'
---

# getFeatures

<mark style="color:green;">`GET`</mark> `/dataset/{dataset}/{version}/features`

Get features.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name    | Type   | Description |
| ------- | ------ | ----------- |
| dataset | string | Dataset     |
| version | number | Version     |
| lat     | number | Latitude    |
| lng     | number | Longitude   |
| z       | number | Zoom level  |

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
