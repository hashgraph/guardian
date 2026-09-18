---
description: 'API Version: 1.102.0'
---

# getProjectReferences

<mark style="color:green;">`GET`</mark>`/projects/references`

Get Project References.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  "projectTypes": [
    "string"
  ],
  "forestCoverDefinition": [
    {
      "label": "string",
      "details": {
        "minTreeHeight": 0,
        "minArea": 0,
        "crownCoverPercentage": 100
      },
      "configId": 0
    }
  ],
  "allometricRelationships": [
    {
      "label": "Carbon stock",
      "details": {
        "formula": "string"
      }
    }
  ]
}
```
{% endtab %}
{% endtabs %}
