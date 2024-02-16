# Retrieves all Properties

{% swagger method="get" path="" baseUrl="/projects/properties" summary="Get all properties" %}
{% swagger-description %}
Get all properties
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
