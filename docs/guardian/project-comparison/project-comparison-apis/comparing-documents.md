# Comparing Documents

{% swagger method="post" path="" baseUrl="/analytics/compare/documents" summary="Compare documents. Only users with the Standard Registry role are allowed to make the request." %}
{% swagger-description %}
Compare documents. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" name="documentIds" type="String" required="true" %}
Document Identifiers to compare
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
{
  "documents": {},
  "left": {},
  "right": {},
  "total": {}
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```
{
  "code": 0,
  "message": "string"
}
```
{% endswagger-response %}
{% endswagger %}
