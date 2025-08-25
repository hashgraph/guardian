---
description: 'API Version: 0.3.0'
---

# getChangeLogForAsset

<mark style="color:green;">`GET`</mark> `/asset/{asset_id}/change_log`

Get change log for asset.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description |
| --------- | ------ | ----------- |
| asset\_Id | string | Asset ID    |

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
