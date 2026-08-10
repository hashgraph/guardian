---
description: 'API Version: 2.0'
---

# getAdvancedData

<mark style="color:green;">`GET`</mark>`/v2/sources/{sourceId}/country/{country}/series/{series}/time/{time}/version/{version}/data`

Retrieve data for a combination of concepts (source, country, series, time, version).

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name     | Type   | Description                      |
| -------- | ------ | -------------------------------- |
| sourceId | string | Source ID                        |
| country  | string | Country                          |
| series   | number | Series code                      |
| time     | Time   | Time period (e.g. yr1975 or all) |
| version  | number | Version (e.g. 199704)            |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  "id": 1,
  "name": "John",
  "age": 30
}
```
{% endtab %}

{% tab title="400" %}
```json
{
  "error": "Invalid request"
}
```
{% endtab %}
{% endtabs %}
