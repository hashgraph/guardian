# Searching Tag

{% swagger method="post" path="" baseUrl="/tags/search" summary="Search tags." %}
{% swagger-description %}
Search tags.
{% endswagger-description %}

{% swagger-parameter in="body" type="String" required="true" name="entity" %}
\[Schema, Policy, Token, Module, Contract, PolicyDocument]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="target" type="String" required="true" %}
targetId1
{% endswagger-parameter %}

{% swagger-parameter in="body" name="entity" type="String" required="true" %}
\[Schema, Policy, Token, Module, Contract, PolicyDocument]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="targets" type="String" required="true" %}
\[targetId1, targetId2]
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                description: a (targetId, Tags) map. `targetId1` is an example key
                properties:
                  targetId1:
                    $ref: "#/components/schemas/TagMap"
                additionalProperties:
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
