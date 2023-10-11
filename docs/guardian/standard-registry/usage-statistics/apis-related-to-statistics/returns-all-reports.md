# Returns all reports

{% swagger method="get" path="" baseUrl="/analytics/reports" summary="Returns all reports" %}
{% swagger-description %}
Returns all reports
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                type: array
                items:
                  "$ref": "#/components/schemas/ReportDTO"
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
