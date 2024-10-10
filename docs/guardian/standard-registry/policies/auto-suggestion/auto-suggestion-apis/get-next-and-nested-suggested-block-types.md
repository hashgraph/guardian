# Get next and nested suggested block types

{% swagger method="post" path="" baseUrl="/suggestions" summary="Get next and nested suggested block types" %}
{% swagger-description %}
Get next and nested suggested block types. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" required="true" %}
Object that contains suggestions input
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful operation. Suggested next and nested block types respectively." %}
```
content:
            application/json:
              schema:
                type: object
                properties:
                  next:
                    type: string
                  nested:
                    type: string
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
