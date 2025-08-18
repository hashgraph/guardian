# getChangeLog

GET /dataset/:dataset/:version/change\_log

Get change log

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name    | Type   | Description |
| ------- | ------ | ----------- |
| Dataset | string | Dataset     |
| Version | number | version     |

**Response**

{% tabs %}
{% tab title="200" %}
```
{
  "data": [
    {
      "date_time": "2019-08-24T14:15:22Z",
      "status": "success",
      "message": "string",
      "detail": "string"
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
