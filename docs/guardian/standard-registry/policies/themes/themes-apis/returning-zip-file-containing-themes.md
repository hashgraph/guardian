# Returning zip file containing themes

{% swagger method="get" path="" baseUrl="/themes/{themeId}/export/file" summary="Returns a zip file containing the theme." %}
{% swagger-description %}
Returns a zip file containing the theme.
{% endswagger-description %}

{% swagger-parameter in="path" name="themeId" type="String" required="true" %}
Selected theme ID.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful operation. Response zip file" %}

{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}

{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}

{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```
content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
```
{% endswagger-response %}
{% endswagger %}
