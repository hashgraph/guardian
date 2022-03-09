# Updating schema

### UPDATING SCHEMA BASED ON SCHEMA ID

{% swagger method="get" path="" baseUrl="/schemas/{schemaId}" summary="Updates the schema" %}
{% swagger-description %}
Updates the schema with the provided schema ID. Only users with the Root Authority role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="schemaID" type="String" required="true" %}
Schema ID
{% endswagger-parameter %}

{% swagger-parameter in="body" type="schema" required="true" %}
Object that contains a valid schema
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Succesful Operation" %}
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
