# retrieveAssetStatistics

GET /dataset/:dataset/:version/stats

Retrieve Asset Statistics

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
