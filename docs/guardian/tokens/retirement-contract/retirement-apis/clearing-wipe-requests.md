# Clearing Wipe Requests

{% swagger method="delete" path="" baseUrl="/contracts/wipe/{contractId}/requests" summary="Clear wipe requests." %}
{% swagger-description %}
Clear wipe contract requests. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="contractId" type="String" required="true" %}
Contract Identifier
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
