# Returns result of Module Comparison

{% swagger method="post" path="" baseUrl="/analytics/compare/modules" summary="Returns the result of comparing two modules" %}
{% swagger-description %}
Returns the result of comparing two modules. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" name="moduleId1" required="false" type="String" %}
ID of first module
{% endswagger-parameter %}

{% swagger-parameter in="body" name="moduleId2" required="false" type="String" %}
ID of second module
{% endswagger-parameter %}

{% swagger-parameter in="body" name="eventsLvl" type="String" required="false" %}
depth (level) of Event comparison (0/1)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="propLvl" type="String" required="false" %}
depth (level) of Properties comparison (0/1/2)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="childrenLvl" type="String" required="false" %}
depth (level) of child block comparison (0/1/2)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="idLvl" type="String" required="false" %}
depth (level) of uuid comparison (0/1)
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
{
    content:
            application/json:
              schema:
                type: object
                properties:
                  left:
                    type: object
                  right:
                    type: object
                  blocks:
                    $ref: '#/components/schemas/Table'
                 
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
