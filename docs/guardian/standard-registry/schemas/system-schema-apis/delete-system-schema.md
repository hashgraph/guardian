# Delete System Schema

<mark style="color:red;">`DELETE`</mark> `/schemas/system/{schemaId}`

Deletes the system schema with the provided Schema ID. Only users with the Standard Registry role are allowed to make a request.

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| schemaId<mark style="color:red;">\*</mark> | String | SchemaID    |

{% tabs %}
{% tab title="204: No Content No Content" %}
```javascript
{
    content:
            application/json:
              schema:
                type: array
                items:
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
