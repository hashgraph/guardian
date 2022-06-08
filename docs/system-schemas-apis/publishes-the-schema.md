# Publishes the Schema

### PUBLISHES THE SCHEMA

{% swagger method="put" path="" baseUrl="/schemas/{schemaId}/active" summary="Publishes the Schema" %}
{% swagger-description %}
Makes the selected schema active. Other schemas of the same type become inactive. Only suers with the Root Authority role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="schemaID" type="String" required="true" %}
schema ID
{% endswagger-parameter %}

{% swagger-parameter in="body" required="true" %}
Object that contains Policy Version
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                type: array
                items:
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
