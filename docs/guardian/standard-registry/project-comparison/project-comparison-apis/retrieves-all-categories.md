# Retrieves all categories

{% swagger method="get" path="" baseUrl="/policies/categories" summary="Get all categories" %}
{% swagger-description %}
Get all categories
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}

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
