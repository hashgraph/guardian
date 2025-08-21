# Creates New System Schema

<mark style="color:green;">`POST`</mark> `/schemas/system/{username}`

Creates new system schema. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| username<mark style="color:red;">\*</mark> | String | Username    |

#### Request Body

| Name                               | Type   | Description                       |
| ---------------------------------- | ------ | --------------------------------- |
| <mark style="color:red;">\*</mark> | String | Object that contains valid Schema |

{% tabs %}
{% tab title="201: Created Successful Operation" %}
```javascript
{
    // Response
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
