# Returns Schema by Username

<mark style="color:blue;">`GET`</mark> `/schemas/system/{username}`

Return all system schemas by username. Only user with the Standard Registry are allowed to make the request.

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| username<mark style="color:red;">\*</mark> | String | Username    |

#### Query Parameters

| Name      | Type    | Description                                                            |
| --------- | ------- | ---------------------------------------------------------------------- |
| pageIndex | Integer | The number of pages to skip before starting to collect the result set. |
| pageSize  | Integer | The number of items to return.                                         |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    headers:
            x-total-count:
              schema:
                type: integer
              description: Total number of items in the collection.
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
