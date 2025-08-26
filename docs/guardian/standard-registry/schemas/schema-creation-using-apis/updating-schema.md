# Updating Schema

<mark style="color:orange;">`PUT`</mark> `/schemas/{schemaId}`

Updates the schema matching the id in the request body. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| schemaID<mark style="color:red;">\*</mark> | String | Schema ID   |

#### Request Body

| Name                               | Type   | Description                                                                             |
| ---------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| <mark style="color:red;">\*</mark> | schema | Object that contains a valid schema including the id of the schema that is to be update |

{% tabs %}
{% tab title="200: OK Succesful Operation" %}
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
