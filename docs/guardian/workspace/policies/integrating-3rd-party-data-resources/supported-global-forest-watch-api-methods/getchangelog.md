---
description: 'API Version: 0.3.0'
---

# getChangeLog

<mark style="color:green;">`GET`</mark> `/dataset/{dataset}/{version}/change_log`

Get change log.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name    | Type   | Description |
| ------- | ------ | ----------- |
| dataset | string | Dataset     |
| version | number | version     |

**Response**

{% tabs %}
{% tab title="200" %}
```javascript
{
  "data": [
    {
      "date_time": "2019-08-24T14:15:22Z",
      "status": "success",
      "message": "string",
      "detail": "string"
    }
  ],
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
