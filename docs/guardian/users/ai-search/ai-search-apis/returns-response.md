# Returns response

{% swagger method="get" path="" baseUrl="/ai-suggestions/ask" summary="Returns AI response to the current question" %}
{% swagger-description %}
Returns AI response to the current question
{% endswagger-description %}

{% swagger-parameter in="path" name="q" type="String" required="true" %}
The question of choosing a methodology
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
"string"
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
