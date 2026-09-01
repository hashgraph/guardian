---
description: 'API Version: 0.3.0'
---

# getVersion

<mark style="color:green;">`GET`</mark> `/dataset/{dataset}/{version}`

Get basic metadata for a given version.

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
```javascript
{
  "data": {
    "created_on": "2019-08-24T14:15:22Z",
    "updated_on": "2019-08-24T14:15:22Z",
    "dataset": "string",
    "version": "string",
    "is_latest": false,
    "is_mutable": false,
    "metadata": {
      "content_date_range": {
        "start_date": "2000-01-01",
        "end_date": "2021-04-06"
      },
      "content_date_description": "2000 - present"
    },
    "status": "pending",
    "assets": []
  },
  "status": "success"
}
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
