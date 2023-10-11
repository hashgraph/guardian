# Returns dashboard by uuid

{% swagger method="get" path="" baseUrl="/analytics/dashboards/{id}" summary="Returns dashboard by uuid" %}
{% swagger-description %}
Returns dashboard by uuid
{% endswagger-description %}

{% swagger-parameter in="path" name="id" type="String" required="true" %}
Dashboard Identifier
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                "$ref": "#/components/schemas/DataContainerDTO"
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```
content:
            application/json:
              schema:
                "$ref": "#/components/schemas/InternalServerErrorDTO"
```
{% endswagger-response %}
{% endswagger %}
