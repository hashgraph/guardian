# Schema Type

<mark style="color:blue;">`GET`</mark> `/schemas/system/entity/{schemaEntity}`

Finds the schema using Schema Type.

#### Path Parameters

| Name                                           | Type   | Description |
| ---------------------------------------------- | ------ | ----------- |
| schemaEntity<mark style="color:red;">\*</mark> | String | Schema Type |

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

{% tab title="404: Not Found Not Found" %}
```
Schema not found.
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
