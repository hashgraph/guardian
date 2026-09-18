---
description: 'API Version: 1.102.0'
---

# getVariationGisFiles

<mark style="color:green;">`GET`</mark>`/projects/{projectId}/requests/{requestId}/variationGisFiles`

Get Variation Gis Files.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description |
| --------- | ------ | ----------- |
| projectId | string | Project ID  |
| requestId | string | Request ID  |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  "variationGISFiles": [
    {
      "name": "string",
      "extension": "string",
      "compareToRequestId": "e24bf391-a675-4473-b71c-22071ec24b7a",
      "compareToYear": 0
    }
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
