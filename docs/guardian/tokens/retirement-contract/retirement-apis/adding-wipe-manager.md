# Adding Wipe Manager

{% swagger method="post" path="" baseUrl="/contracts/wipe/{contractId}/manager/{hederaId}" summary="Add wipe manager." %}
{% swagger-description %}
Add wipe contract manager. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="hederaId" type="String" required="true" %}
Hedera ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="contractId" type="String" required="true" %}
Contract ID
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
