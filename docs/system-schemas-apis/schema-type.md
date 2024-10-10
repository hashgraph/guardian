# Schema Type

### FINDS THE SCHEMA USING SCHEMA TYPE

{% swagger method="get" path="" baseUrl="/schemas/system/entity/{schemaEntity}" summary="Returns Schema by Schema Type" %}
{% swagger-description %}
Finds the schema using Schema Type.
{% endswagger-description %}

{% swagger-parameter in="path" name="schemaEntity" type="String" required="true" %}
Schema Type 
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Schema'
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

{% swagger-response status="404: Not Found" description="Not Found" %}


```
Schema not found.
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
