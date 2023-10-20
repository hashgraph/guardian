# Retrieves Hedera Message ID

{% swagger method="get" path="" baseUrl="/tools/{id}/export/message" summary="Return Hedera message ID for the specified published tool." %}
{% swagger-description %}
Returns the Hedera message ID for the specified tool published onto IPFS. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="id" type="String" required="true" %}
Tool ID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
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
