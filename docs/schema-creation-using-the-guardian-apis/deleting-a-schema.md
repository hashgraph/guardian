# Deleting a schema

### DELETING SCHEMA BASED ON SCHEMA ID

{% swagger method="delete" path="" baseUrl="/schema/{schemaID}" summary="Deletes the schema" %}
{% swagger-description %}
Deletes the schema with the provided schema ID. Only users with the Root Authority role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" type="String" name="schemaID" required="true" %}
Schema ID
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
