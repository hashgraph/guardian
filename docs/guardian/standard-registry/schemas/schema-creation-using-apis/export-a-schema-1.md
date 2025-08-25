# Export Files from Schema

<mark style="color:green;">`POST`</mark> `/schemas/{schemaId}/export/file`

Returns schema files for the schemas. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                       | Type   | Description        |
| ------------------------------------------ | ------ | ------------------ |
| schemaID<mark style="color:red;">\*</mark> | String | Selected schema ID |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
   
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

{% tab title="422: Unprocessable Entity Unprocessable Entity" %}

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
