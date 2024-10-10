# ⚙ Returning Schema Tree

{% swagger method="get" path="" baseUrl="/schema/{schemaId}/tree" summary="Returns schema tree." %}
{% swagger-description %}
Returns schema tree.
{% endswagger-description %}

{% swagger-parameter in="path" name="schemaId" type="String" required="true" %}
Schema identifier
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string
                  type:
                    type: string
                  children:
                    type: array
                    items:
                      type: object
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
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endswagger-response %}
{% endswagger %}
