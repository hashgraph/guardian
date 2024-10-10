# List of policies that are best suited for given parameters

{% swagger method="post" path="" baseUrl="/policies/filtered-policies" summary="Get policies by categories and text" %}
{% swagger-description %}
Get policies by categories and text
{% endswagger-description %}

{% swagger-parameter in="body" name="categoryIds" type="String" required="true" %}
Category Identifiers
{% endswagger-parameter %}

{% swagger-parameter in="body" name="text" type="String" required="true" %}
Filter Text
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
[
  "string"
]
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
