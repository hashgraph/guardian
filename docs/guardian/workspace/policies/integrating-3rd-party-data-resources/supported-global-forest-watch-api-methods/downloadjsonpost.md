---
description: 'API Version: 0.3.0'
---

# downloadJSONPost

<mark style="color:green;">`POST`</mark> `/dataset/{dataset}/{version}/download/json`

Execute a READ-ONLY SQL query on the given dataset version for datasets with (geo-)database tables.

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
| geometry | Object | Geometry (stringify object) |
| sql      | query  | SQL                         |

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
