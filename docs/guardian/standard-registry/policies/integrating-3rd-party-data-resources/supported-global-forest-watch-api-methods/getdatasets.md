---
description: 'API Version: 0.3.0'
---

# getDatasets

<mark style="color:green;">`GET`</mark> `/datasets`

Get list of all datasets.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name        | Type   | Description |
| ----------- | ------ | ----------- |
| page\[Size] | string | Items Count |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  "data": [
    {
      "created_on": "2019-08-24T14:15:22Z",
      "updated_on": "2019-08-24T14:15:22Z",
      "dataset": "string",
      "is_downloadable": true,
      "metadata": {
        "title": "Deforestation alerts (GLAD-S2)",
        "subtitle": "Sentinel-2 based deforestation alerts",
        "source": "Global Land Analysis and Discovery (GLAD), University of Maryland",
        "license": "[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)",
        "data_language": "en",
        "overview": "This data set is a forest loss alert product developed by the Global Land Analysis and Discovery lab at the University of Maryland.",
        "citation": "Pickens, A.H., Hansen, M.C., Adusei, B., and Potapov P. 2020. Sentinel-2 Forest Loss Alert. Global Land Analysis and Discovery (GLAD), University of Maryland.",
        "cautions": "Results are masked to only within the primary forest mask.", 
        "tags": [
          "Forest Change"
        ],
        "learn_more": "https://glad.earthengine.app/view/s2-forest-alerts"
      },
      "versions": []
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
