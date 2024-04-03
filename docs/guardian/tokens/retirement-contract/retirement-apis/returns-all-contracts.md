# Returning all contracts

## Returns all contracts.

<mark style="color:blue;">`GET`</mark> `/contracts`

Returns all contracts.

#### Query Parameters

| Name                                        | Type    | Description                                                           |
| ------------------------------------------- | ------- | --------------------------------------------------------------------- |
| pageIndex<mark style="color:red;">\*</mark> | Integer | The number of pages to skip before starting to collect the result set |
| pageSize<mark style="color:red;">\*</mark>  | Integer | The numbers of items to return                                        |
| type                                        | String  | Contract type                                                         |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    headers:
            x-total-count:
              schema:
                type: integer
              description: Total items in the collection.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Contract'
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
