# getAssets

GET /assets

Get Assets

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name        | Type   | Description      |
| ----------- | ------ | ---------------- |
| Dataset     | string | Dataset          |
| Version     | number | Version          |
| asset\_type | string | Asset\_Type      |
| asset\_uri  | string | Asset\_URI       |
| is\_latest  | string | Is\_Latest       |
| is\_default | string | Is\_Default      |
| page\[size] | string | size of the page |

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
