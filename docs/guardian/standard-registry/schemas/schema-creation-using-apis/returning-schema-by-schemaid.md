# Returning Schema by SchemaID

{% swagger method="get" path="" baseUrl="/schema/{schemaId}" summary="Returns schema by schema ID" %}
{% swagger-description %}
Returns schema by schema ID
{% endswagger-description %}

{% swagger-parameter in="path" name="schemaId" type="String" required="true" %}
Schema ID
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
