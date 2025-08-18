# queryDatasetCsv

GET /dataset/:dataset/:version/query/csv

(CSV) Execute a READ-ONLY SQL query on the given dataset version

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name             | Type   | Description      |
| ---------------- | ------ | ---------------- |
| Dataset          | string | Dataset          |
| Version          | number | version          |
| geostore\_Id     | string | Geostore ID      |
| sql              | query  | SQL              |
| geostore\_origin | string | Geostore\_Origin |

**Response**

{% tabs %}
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
