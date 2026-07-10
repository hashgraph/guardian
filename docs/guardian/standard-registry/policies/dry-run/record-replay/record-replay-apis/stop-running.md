# Stop Running

{% swagger method="post" path="" baseUrl=" /record/{policyId}/running/stop" summary="Stop running." %}
{% swagger-description %}
Stop running. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="body" required="true" type="Object" %}
Object that contains options
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
