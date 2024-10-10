# Creates New System Schema

### CREATES NEW SYSTEM SCHEMA

{% swagger method="post" path="" baseUrl="/schemas/system/{username}" summary="Creates new System Schema" %}
{% swagger-description %}
Creates new system schema. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="username" type="String" required="true" %}
Username
{% endswagger-parameter %}

{% swagger-parameter in="body" required="true" %}
Object that contains valid Schema
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
```javascript
{
    // Response
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

{% swagger-response status="422: Unprocessable Entity" description="Unprocessable Entity" %}

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
