# Retiring Tokens

{% swagger method="post" path="" baseUrl="/contracts/retire/pools/{poolId}/retire" summary="Retire tokens." %}
{% swagger-description %}
Retire tokens.
{% endswagger-description %}

{% swagger-parameter in="path" name="poolId" type="String" %}
Pool Identifier
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
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endswagger-response %}
{% endswagger %}
