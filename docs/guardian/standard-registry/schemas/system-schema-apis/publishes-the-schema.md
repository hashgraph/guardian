# Publishes the Schema

<mark style="color:orange;">`PUT`</mark> `/schemas/{schemaId}/active`

Makes the selected schema active. Other schemas of the same type become inactive. Only suers with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| schemaID<mark style="color:red;">\*</mark> | String | schema ID   |

#### Request Body

| Name                               | Type   | Description                         |
| ---------------------------------- | ------ | ----------------------------------- |
| <mark style="color:red;">\*</mark> | String | Object that contains Policy Version |

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
Schema is not system.
```
{% endtab %}

{% tab title="404: Not Found Not Found" %}
```
Schema not found.
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
