# Deleting a Schema

<mark style="color:red;">`DELETE`</mark> `/schema/{schemaID}`

Deletes the schema with the provided schema ID. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                       | Type    | Description           |
| ------------------------------------------ | ------- | --------------------- |
| schemaID<mark style="color:red;">\*</mark> | String  | Schema ID             |
| includeChildren                            | Boolean | Include child schemas |

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

{% tab title="422: Unprocessable Entity " %}
```
Schema is published.
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
