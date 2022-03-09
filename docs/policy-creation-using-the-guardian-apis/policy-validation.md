# Policy Validation

### VALIDATES POLICY

{% swagger method="post" path="" baseUrl="/policies/validate" summary="Validates policy" %}
{% swagger-description %}
Validates selected policy. Only users with the Root Authority role are allowed to make the request
{% endswagger-description %}

{% swagger-parameter in="body" type="application/jsonn" required="true" %}
Object that contains policy configuration
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/ValidatePolicy'
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
