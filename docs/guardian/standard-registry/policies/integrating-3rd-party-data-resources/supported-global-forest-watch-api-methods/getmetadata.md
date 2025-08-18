# getMetadata

`GET` `/dataset/:dataset/:version/metadata`

Get metadata record for a dataset version

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name                       | Type   | Description                |
| -------------------------- | ------ | -------------------------- |
| Dataset                    | string | dataset                    |
| Version                    | number | version                    |
| Include\_dataset\_metadata | string | include\_dataset\_metadata |

**Response**

{% tabs %}
{% tab title="200" %}
```
{
  "data": {
    "content_date_range": {
      "start_date": "2000-01-01",
      "end_date": "2021-04-06"
    },
    "content_date_description": "2000 - present"
  },
  "status": "success"
}
```
{% endtab %}

{% tab title="422" %}
<pre><code><strong>{
</strong>  "detail": [
    {
      "loc": [
        "string"
      ],
      "msg": "string",
      "type": "string"
    }
  ]
}
</code></pre>
{% endtab %}
{% endtabs %}
