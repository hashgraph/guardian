---
description: 'API Version: 0.3.0'
---

# queryDatasetCSVPost

<mark style="color:green;">`POST`</mark> `/dataset/{dataset}/{version}/query/csv`

Execute a READ-ONLY SQL query on the given dataset version.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name     | Type   | Description                 |
| -------- | ------ | --------------------------- |
| dataset  | string | Dataset                     |
| version  | number | version                     |
| geometry | Object | Geometry (Stringify object) |
| sql      | query  | SQL                         |

**Response**

{% tabs %}
{% tab title="422" %}
```json
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
