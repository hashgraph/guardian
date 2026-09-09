# User Account Balance

### RETURNS USER'S ACCOUNT BALANCE

## Returns user's Hedera account balance

<mark style="color:blue;">`GET`</mark> `/profiles/{username}/balance`

Requests Hedera account balance. Only users with the Installer role are allowed to make the request

#### Path Parameters

| Name                                       | Type   | Description                                        |
| ------------------------------------------ | ------ | -------------------------------------------------- |
| username<mark style="color:red;">\*</mark> | String | The name of the user for whom to fetch the balance |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                type: string
}
```
{% endtab %}

{% tab title="401: Unauthorized " %}
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

{% tab title="500: Internal Server Error " %}
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
