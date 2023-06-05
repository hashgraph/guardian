# Updating Schema Tag

{% swagger method="put" path="" baseUrl=" /tags/schemas/{schemaId}" summary="Updates the schema." %}
{% swagger-description %}
Updates the schema with the provided schema ID. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="schemaId" type="String" required="true" %}
Schema ID.
{% endswagger-parameter %}

{% swagger-parameter in="body" required="true" %}
Object that contains a valid schema.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Schema"
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}

{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}

{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```
content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
```
{% endswagger-response %}
{% endswagger %}
