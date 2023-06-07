# Deleting Schema Tag

{% swagger method="delete" path="" baseUrl="/tags/schemas/{schemaId}" summary="Delete the schema." %}
{% swagger-description %}
Deletes the schema with the provided schema ID. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="schemaId" type="String" required="true" %}
Schema ID.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                type: boolean
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
