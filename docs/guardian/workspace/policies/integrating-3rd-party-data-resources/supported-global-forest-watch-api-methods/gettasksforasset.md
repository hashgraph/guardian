---
description: 'API Version: 0.3.0'
---

# getTasksForAsset

<mark style="color:green;">`GET`</mark> `/asset/{asset_id}/tasks`

Get tasks for asset.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name        | Type   | Description      |
| ----------- | ------ | ---------------- |
| asset\_Id   | string | Asset ID         |
| page\[size] | number | size of the page |

**Response**

{% tabs %}
{% tab title="200" %}
```javascript
{
  "data": [
    {
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
    }
  ],
  "status": "success",
  "links": {
    "self": "https://data-api.globalforestwatch.org/:model?page[number]=1&page[size]=25",
    "first": "https://data-api.globalforestwatch.org/:model?page[number]=1&page[size]=25",
    "last": "https://data-api.globalforestwatch.org/:model?page[number]=4&page[size]=25",
    "prev": "",
    "next": "https://data-api.globalforestwatch.org/:model?page[number]=2&page[size]=25"
  },
  "meta": {
    "size": "25",
    "total_items": "100",
    "total_pages": "4"
  }
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
