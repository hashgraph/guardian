# getMetadataForAsset

GET /asset/:asset\_id/metadata

Get metadata for asset

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description |
| --------- | ------ | ----------- |
| asset\_Id | string | Asset ID    |

Response

{% tabs %}
{% tab title="200" %}
```
{
  "data": {
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
  },
  "status": "success"
}
```
{% endtab %}

{% tab title="422" %}
```
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
