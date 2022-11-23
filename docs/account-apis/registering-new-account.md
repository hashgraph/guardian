# Registering new account

### REGISTERING NEW ACCOUNT

{% swagger method="post" path="" baseUrl="/accounts/register" summary="Registers a new user account" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" required="true" %}
Object that contain username, password and role (optional) fields
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Account'
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
