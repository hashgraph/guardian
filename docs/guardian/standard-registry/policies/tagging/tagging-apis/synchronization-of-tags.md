# Synchronization of tags

{% swagger method="post" path="" baseUrl="/tags/synchronization" summary="synchronization." %}
{% swagger-description %}
synchronization.
{% endswagger-description %}

{% swagger-parameter in="body" name="entity" type="String" required="true" %}
\[Schema, Policy, Token, Module, Contract, PolicyDocument]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="target" type="String" required="true" %}
targetId
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                $ref: "#/components/schemas/TagMap"
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
