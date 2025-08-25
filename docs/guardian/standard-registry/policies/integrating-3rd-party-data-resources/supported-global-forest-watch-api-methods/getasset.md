---
description: 'API Version: 0.3.0'
---

# getAsset

<mark style="color:green;">`GET`</mark> `/asset/{asset_id}`

Get asset.

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
  "data": {
    "created_on": "2019-08-24T14:15:22Z",
    "updated_on": "2019-08-24T14:15:22Z",
    "asset_id": "b4695157-0d1d-4da0-8f9e-5c53149389e4",
    "dataset": "string",
    "version": "string",
    "asset_type": "Dynamic vector tile cache",
    "asset_uri": "string",
    "status": "pending",
    "is_managed": true,
    "is_downloadable": true,
    "metadata": {
      "tags": [
        "string"
      ],
      "fields": [
        {
          "name": "string",
          "alias": "string",
          "description": "string",
          "data_type": "date",
          "unit": "string",
          "is_feature_info": true,
          "is_filter": true
        }
      ],
      "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08"
    }
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
