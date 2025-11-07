# Search Projects by filters

{% swagger method="post" path="" baseUrl="/projects/search" summary="Search projects by filters" %}
{% swagger-description %}
Search projects by filters
{% endswagger-description %}

{% swagger-parameter in="body" name="q" type="String" required="true" %}
The question of the methodology
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
[
  {
    "id": "string",
    "policyId": "string",
    "policyName": "string",
    "registered": "string",
    "title": "string",
    "companyName": "string",
    "sectoralScope": "string"
  }
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
