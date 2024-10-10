# Get Policy Documents

{% swagger method="get" path="" baseUrl="/policies/{policyId}/documents" summary="Get policy documents." %}
{% swagger-description %}
Get policy documents. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="query" name="pageSize" type="String" required="true" %}
Page size.
{% endswagger-parameter %}

{% swagger-parameter in="query" name="pageIndex" type="String" required="true" %}
Page index.
{% endswagger-parameter %}

{% swagger-parameter in="query" name="type" type="String" required="true" %}
Document type.
{% endswagger-parameter %}

{% swagger-parameter in="query" name="includeDocument" type="Boolean" required="true" %}
Include document field.
{% endswagger-parameter %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy identifier.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Documents" %}
```
headers:
            X-Total-Count:
              description: Total documents count.
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
