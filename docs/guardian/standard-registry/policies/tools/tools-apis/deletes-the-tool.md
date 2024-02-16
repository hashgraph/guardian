# Deletes the Tool

{% swagger method="delete" path="" baseUrl="/tools/{id}" summary="Deletes the tool." %}
{% swagger-description %}
Deletes the tool with the provided tool ID. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="id" type="String" required="true" %}
Tool ID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}

{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```
content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endswagger-response %}
{% endswagger %}
