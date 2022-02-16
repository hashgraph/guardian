# Creation of a schema

### SCHEMA CREATION

{% swagger method="post" path="" baseUrl="/schemas" summary="Create new schema" %}
{% swagger-description %}
Creates new schema. Only users with the Root Authority role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" type="Object" required="true" %}
Object that contains a valid schema
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
```javascript
{
    
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

****
