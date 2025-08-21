# getDatasets

Get list of all datasets

<mark style="color:green;">`GET`</mark> `/datasets`

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
```javascript
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
        "overview": "This data set is a forest loss alert product developed by the Global Land Analysis and Discovery lab at the University of Maryland. GLAD-S2 alerts utilize data from the European Space Agency's Sentinel-2 mission, which provides optical imagery at a 10m spatial resolution with a 5-day revisit time. The shorter revisit time, when compared to GLAD Landsat alerts, reduces the time to detect forest loss and between the initial detection of forest loss and classification as high confidence. This is particularly advantageous in wet and tropical regions, where persistent cloud cover may delay detections for weeks to months. GLAD-S2 alerts are available for primary forests in the Amazon basin from January 1st 2019 to present, updated daily. New Sentinel-2 images are analyzed as soon as they are acquired. Cloud, shadow, and water are filtered out of each new image, and a forest loss algorithm is applied to all remaining clear land observations. The algorithm relies on the spectral data in each new image in combination with spectral metrics from a baseline period of the previous two years. Alerts become high confidence when at least two of four subsequent observations are flagged as forest loss (this corresponds to 'high', 'medium', and 'low' confidence loss on the GLAD app linked below). The alert date represents the date of forest loss detection. Users can choose to display only high confidence alerts on the map, but keep in mind this will filter out the most recent detections of forest loss. Additionally, forest loss will not be detected again on pixels with high confidence alerts. Alerts that have not become high confidence within 180 days are removed from the data set.",
        "function": "Identifies areas of primary forest loss  in near real time using Sentinel-2 imagery",
        "citation": "Pickens, A.H., Hansen, M.C., Adusei, B., and Potapov P. 2020. Sentinel-2 Forest Loss Alert. Global Land Analysis and Discovery (GLAD), University of Maryland.",
        "cautions": "Results are masked to only within the primary forest mask of [Turubanova et al (2018)](https://iopscience.iop.org/article/10.1088/1748-9326/aacd1c) in the Amazon river basin, with 2001-2018 forest loss from [Hansen et al. (2013)](https://science.sciencemag.org/content/342/6160/850) removed. Alerts that have been detected in two out of four consecutive images are classified as high confidence. Pixels with high confidence alerts cannot be alerted again. The accuracy of this product has not been assessed",
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
