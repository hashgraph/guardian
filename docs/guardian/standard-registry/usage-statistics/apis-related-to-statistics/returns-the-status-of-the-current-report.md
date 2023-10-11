# Returns the status of the current report

{% swagger method="get" path="" baseUrl="/analytics/report" summary="Returns the status of the current report" %}
{% swagger-description %}
Returns the status of the current report
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
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
