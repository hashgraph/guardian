# Returning Schema by SchemaID

<mark style="color:blue;">`GET`</mark> `/schema/{schemaId}`

Returns schema by schema ID

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| schemaId<mark style="color:red;">\*</mark> | String | Schema ID   |

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
