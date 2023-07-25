# Exports Comparison Result

{% swagger method="post" path="" baseUrl="/analytics/compare/modules/export" summary="Returns the result of comparing two modules" %}
{% swagger-description %}
Returns the result of comparing two modules. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" name="moduleId1" type="String" %}
ID of first module
{% endswagger-parameter %}

{% swagger-parameter in="body" name="moduleId2" type="String" %}
ID of second module
{% endswagger-parameter %}

{% swagger-parameter in="body" name="eventLvl" type="String" %}
depth (level) of Event comparison (0/1)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="propLvl" type="String" %}
depth (level) of Properties comparison (0/1/2)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="childrenLvl" type="String" %}
depth (level) of child block comparison (0/1/2)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="idLvl" type="String" %}
depth (level) of uuid comparision (0/1)
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
{
    content:
            application/json:
              schema:
                type: string
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}

{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}

{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}

{% endswagger-response %}
{% endswagger %}
