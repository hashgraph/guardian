# Returns Token Serials

{% swagger method="get" path="" baseUrl="/tokens/{tokenId}/serials" summary="Return token serials." %}
{% swagger-description %}
Returns token serials of current user.
{% endswagger-description %}

{% swagger-parameter in="path" name="tokenId" type="String" required="true" %}
Token Identifier
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Token Serials" %}
```
content:
            application/json:
              schema:
                type: array
                items:
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
