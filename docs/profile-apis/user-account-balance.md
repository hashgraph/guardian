# User Account Balance

### RETURNS USER'S ACCOUNT BALANCE

{% swagger method="get" path="" baseUrl="/profiles/{username}/balance" summary="Returns user's Hedera account balance" %}
{% swagger-description %}
Requests Hedera account balance. Only users with the Installer role are allowed to make the request
{% endswagger-description %}

{% swagger-parameter in="path" name="username" type="String" required="true" %}
The name of the user for whom to fetch the balance
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                type: string
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}
