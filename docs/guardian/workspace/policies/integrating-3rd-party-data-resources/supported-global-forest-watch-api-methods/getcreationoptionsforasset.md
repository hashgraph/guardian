---
description: 'API Version: 0.3.0'
---

# getCreationOptionsForAsset

<mark style="color:green;">`GET`</mark> `/asset/{asset_id}/creation_options`

Get creation options for asset.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description |
| --------- | ------ | ----------- |
| asset\_id | string | Asset ID    |

**Response**

{% tabs %}
{% tab title="200" %}
```javascript
{
  "data": {
    "has_header": true,
    "delimiter": ",",
    "latitude": "string",
    "longitude": "string",
    "cluster": {
      "index_type": "gist",
      "column_names": [
        "string"
      ]
    },
    "partitions": {
      "partition_type": "hash",
      "partition_column": "string",
      "create_default": false,
      "partition_schema": {
        "partition_count": 0
      }
    },
    "indices": [],
    "constraints": [
      {
        "constraint_type": "unique",
        "column_names": [
          "string"
        ]
      }
    ],
    "table_schema": [
      {
        "name": "string",
        "data_type": "date"
      }
    ],
    "create_dynamic_vector_tile_cache": true,
    "timeout": 400000,
    "source_type": "table",
    "source_driver": "text",
    "source_uri": [
      "string"
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
