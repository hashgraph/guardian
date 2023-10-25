# Cancelling Retire Request

{% swagger method="delete" path="" baseUrl="/contracts/retire/requests/{requestId}/cancel" summary="Cancel retire request." %}
{% swagger-description %}
Cancel retire contract request.
{% endswagger-description %}

{% swagger-parameter in="path" name="requestId" type="String" required="true" %}
Request Identifier
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}

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
