# Get Contract Permissions

{% swagger method="get" path="" baseUrl="/contracts/{contractId}/permissions" summary=" Get contract permissions." %}
{% swagger-description %}
Get smart-contract permissions. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="contractID" type="String" required="true" %}
Contract Identifier
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Contract Permissions" %}
```
content:
            application/json:
              schema:
                type: number
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
