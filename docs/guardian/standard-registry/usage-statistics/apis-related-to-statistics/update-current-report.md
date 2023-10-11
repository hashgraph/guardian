# Update current report

{% swagger method="get" path="" baseUrl="/analytics/report/update" summary="Update current report" %}
{% swagger-description %}
Update current report
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
