# User Account Information

### RETURNS USER'S ACCOUNT BALANCE

{% swagger method="get" path="" baseUrl="/profiles/{username}" summary="Returns user account info" %}
{% swagger-description %}
Returns user account information. For users with the Root Authority role it also returns address book and VC document information
{% endswagger-description %}

{% swagger-parameter in="path" name="username" type="String" required="true" %}
The name of the user for whom to fetch the information
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}
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

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
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
