# Returns Schema by Type

<mark style="color:blue;">`GET`</mark> `/schemas/type/{type}`

Finds the schema using the json document type.

#### Path Parameters

| Name | Type   | Description |
| ---- | ------ | ----------- |
| type | String | JSON type   |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Schema'
}
```
{% endtab %}

{% tab title="401: Unauthorized Unauthorized" %}
```javascript
{
    // Response
}
```
{% endtab %}

{% tab title="403: Forbidden Forbidden" %}
```javascript
{
    // Response
}
```
{% endtab %}

{% tab title="500: Internal Server Error Internal Server Error" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
}
```
{% endtab %}
{% endtabs %}
