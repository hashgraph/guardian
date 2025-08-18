# getExtent

GET /dataset/:dataset/:version/extent

Get extent

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name    | Type   | Description |
| ------- | ------ | ----------- |
| Dataset | string | Dataset     |
| Version | number | version     |

**Response**

{% tabs %}
{% tab title="200" %}
```
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
```
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
