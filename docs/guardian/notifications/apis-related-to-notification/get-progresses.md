# Get Progresses

{% swagger method="get" path="" baseUrl="/notifications/progresses" summary="Get progresses" %}
{% swagger-description %}
Returns progresses
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful operation. Suggested next and nested block types respectively." %}
```
content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ProgressDTO'
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}

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
