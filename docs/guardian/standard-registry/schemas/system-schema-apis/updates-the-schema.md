# Updates the Schema

<mark style="color:orange;">`PUT`</mark> `/schemas/system/{schemaId}`

Updates the system Schema with the provided Schema ID. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                       | Type   | Description                       |
| ------------------------------------------ | ------ | --------------------------------- |
| schemaId<mark style="color:red;">\*</mark> | String | SchemaID                          |
| <mark style="color:red;">\*</mark>         | String | Object that contains valid Schema |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
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

{% tab title="422: Unprocessable Entity Unprocessable Entity" %}
```
Schema is active.
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
