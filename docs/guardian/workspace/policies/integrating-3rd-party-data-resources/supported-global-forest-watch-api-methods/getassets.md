---
description: 'API Version: 0.3.0'
---

# getAssets

<mark style="color:green;">`GET`</mark> `/assets`

Get Assets.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name        | Type   | Description      |
| ----------- | ------ | ---------------- |
| dataset     | string | Dataset          |
| version     | number | Version          |
| asset\_type | string | Asset\_Type      |
| asset\_uri  | string | Asset\_URI       |
| is\_latest  | string | Is\_Latest       |
| is\_default | string | Is\_Default      |
| page\[size] | string | size of the page |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  "data": [
    {
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
```json
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
