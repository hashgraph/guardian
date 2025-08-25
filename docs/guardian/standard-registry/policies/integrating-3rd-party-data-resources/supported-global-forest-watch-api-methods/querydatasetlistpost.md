---
description: 'API Version: 0.3.0'
---

# queryDatasetListPost

<mark style="color:green;">`POST`</mark> `/dataset/{dataset}/{version}/query/batch`

Execute a READ-ONLY SQL query on the specified raster-based dataset version.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name                | Type   | Description                                                         |
| ------------------- | ------ | ------------------------------------------------------------------- |
| dataset             | string | Dataset                                                             |
| version             | number | version                                                             |
| feature\_collection | Object | Feature collection (stringify object)                               |
| sql                 | query  | SQL                                                                 |
| uri                 | string | URI to a vector file in a variety of formats supported by Geopandas |
| geostore\_ids       | number | An inline list of ResourceWatch geostore ids                        |
| id\_field           | string | An inline list of ResourceWatch geostore ids                        |

Response

{% tabs %}
{% tab title="200" %}
```json
{
  "data": {
    "job_id": "453bd7d7-5355-4d6d-a38e-d9e7eb218c3f",
    "job_link": "string",
    "status": "pending",
    "message": "string",
    "download_link": "string",
    "failed_geometries_link": "string",
    "progress": "0%"
  },
  "status": "success"
}
```
{% endtab %}

{% tab title="422" %}
```json5
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
