# Discontinue Policy

{% swagger method="put" path="" baseUrl="/policies/{policyId}/discontinue" summary="Discontinue policy." %}
{% swagger-description %}
Discontunue policy. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy identifier.
{% endswagger-parameter %}

{% swagger-parameter in="body" required="true" %}
Discontinue details.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Policies" %}
```
content:
            application/json:
              schema:
                type: array
                items:
                  type: object
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
