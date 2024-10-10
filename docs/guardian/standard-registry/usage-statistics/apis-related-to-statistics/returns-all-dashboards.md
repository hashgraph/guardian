# Returns all dashboards

{% swagger method="get" path="" baseUrl="/analytics/dashboards" summary="Returns all dashboards." %}
{% swagger-description %}
Returns all dashboards.
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                type: array
                items:
                  "$ref": "#/components/schemas/DashboardDTO"
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
