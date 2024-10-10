# Delete System Schema

### DELETE THE SYSTEM SCHEMA WITH THE PROVIDED SCHEMA ID

{% swagger method="delete" path="" baseUrl="/schemas/system/{schemaId}" summary="Deletes the Schema" %}
{% swagger-description %}
Deletes the system schema with the provided Schema ID. Only users with the Standard Registry role are allowed to make a request.
{% endswagger-description %}

{% swagger-parameter in="path" name="schemaId" type="String" required="true" %}
SchemaID
{% endswagger-parameter %}

{% swagger-response status="204: No Content" description="No Content" %}
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
