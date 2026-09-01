---
description: 'API Version: 0.3.0'
---

# queryDatasetJsonPost

<mark style="color:green;">`POST`</mark> `/dataset/{dataset}/{version}/query/json`

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
{% tab title="200" %}
```json5
string
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
