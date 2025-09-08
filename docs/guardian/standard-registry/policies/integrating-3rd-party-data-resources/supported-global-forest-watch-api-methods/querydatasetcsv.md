---
description: 'API Version: 0.3.0'
---

# queryDatasetCSV

<mark style="color:green;">`GET`</mark> `/dataset/{dataset}/{version}/query/csv`

Execute a READ-ONLY SQL query on the given dataset version.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name             | Type   | Description      |
| ---------------- | ------ | ---------------- |
| dataset          | string | Dataset          |
| version          | number | version          |
| geostore\_Id     | string | Geostore ID      |
| sql              | query  | SQL              |
| geostore\_origin | string | Geostore\_Origin |

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
