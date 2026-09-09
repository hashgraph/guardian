# Deleting theme

{% swagger method="delete" path="" baseUrl="/themes/{themeId}" summary="Deletes the theme." %}
{% swagger-description %}
Deletes the theme with the provided theme ID.
{% endswagger-description %}

{% swagger-parameter in="path" name="themeId" type="String" required="true" %}
Theme ID.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                type: boolean
```
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
