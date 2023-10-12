# Compare Documents

{% swagger method="post" path="" baseUrl="/analytics/compare/documents " summary="Compare documents." %}
{% swagger-description %}
Compare documents. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" name="documentIds" type="String" required="true" %}
Filters
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
 content:
            application/json:
              schema:
                $ref: '#/components/schemas/CompareDocumentsDTO'
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
