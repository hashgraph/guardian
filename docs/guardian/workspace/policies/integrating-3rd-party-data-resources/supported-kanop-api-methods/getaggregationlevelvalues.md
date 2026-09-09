---
description: 'API Version: 1.102.0'
---

# getAggregationLevelValues

`GET/projects/{projectId}/aggregationLevels/{level}`

Get Aggregation Level Values.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description |
| --------- | ------ | ----------- |
| projectId | string | Project ID  |
| level     | string | Level       |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  "property1": [
    "string"
  ],
  "property2": [
    "string"
  ]
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
