# User Login

### LOGS USER INTO THE SYSTEM

{% swagger method="post" path="" baseUrl="/accounts/login" summary="Logs user into the system" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" required="true" %}
Object that contains username and password fields
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Session'
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
