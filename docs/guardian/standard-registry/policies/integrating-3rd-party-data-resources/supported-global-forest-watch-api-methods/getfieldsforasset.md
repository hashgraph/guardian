# getFieldsForAsset

`GET` `/asset/:asset_id/fields`

Get Fields for asset

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
```
{
  "data": [
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
