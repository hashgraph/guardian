---
description: 'API Version: 0.3.0'
---

# getSingleTask

<mark style="color:green;">`GET`</mark> `/task/{task_id}`

Get single tasks by task ID.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name     | Type   | Description |
| -------- | ------ | ----------- |
| task\_id | string | Task ID     |

**Response**

{% tabs %}
{% tab title="200" %}
```javascript
{
  "data": {
    "created_on": "2019-08-24T14:15:22Z",
    "updated_on": "2019-08-24T14:15:22Z",
    "task_id": "736fde4d-9029-4915-8189-01353d6982cb",
    "asset_id": "b4695157-0d1d-4da0-8f9e-5c53149389e4",
    "change_log": [
      {
        "date_time": "2019-08-24T14:15:22Z",
        "status": "success",
        "message": "string",
        "detail": "string"
      }
    ]
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
