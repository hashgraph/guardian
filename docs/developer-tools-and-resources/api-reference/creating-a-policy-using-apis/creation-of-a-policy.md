# Creation of a Policy

### **POLICY CREATION**

{% swagger method="post" path="" baseUrl="/policies" summary="Creates a new policy" %}
{% swagger-description %}
Creates a new policy. Only users with the Standard Registry role are allowed to make the request
{% endswagger-description %}

{% swagger-parameter in="body" type="Object" required="true" %}
Object that contains policy configuration.
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Created" %}

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

{% swagger-response status="500: Internal Server Error" description="Internal server error" %}
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
