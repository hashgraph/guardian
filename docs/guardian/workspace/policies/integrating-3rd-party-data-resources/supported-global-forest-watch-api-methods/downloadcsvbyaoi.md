---
description: 'API Version: 0.3.0'
---

# downloadCSVByAoi

<mark style="color:green;">`GET`</mark> `/dataset/{dataset}/{version}/download_by_aoi/csv`

Execute a READ-ONLY SQL query on the given dataset version.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name    | Type   | Description                                                                   |
| ------- | ------ | ----------------------------------------------------------------------------- |
| dataset | string | Dataset                                                                       |
| version | number | version                                                                       |
| sql     | query  | SQL                                                                           |
| aoi     | string | GeostoreAreaOfInterest or AdminAreaOfInterest or Global or WdpaAreaOfInterest |

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
