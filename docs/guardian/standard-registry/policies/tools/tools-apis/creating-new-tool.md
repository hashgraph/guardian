# Creating new Tool

{% swagger method="post" path="" baseUrl="/tools" summary="Creates a new tool." %}
{% swagger-description %}
Creates a new tool. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                $ref: '#/components/schemas/ToolDTO'
```
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
