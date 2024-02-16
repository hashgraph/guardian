# Updating theme Configuration

{% swagger method="put" path="" baseUrl="/themes/{themeId}" summary="Updates theme configuration." %}
{% swagger-description %}
Updates theme configuration for the specified theme ID.
{% endswagger-description %}

{% swagger-parameter in="path" name="themeId" type="String" required="true" %}
Selected theme ID.
{% endswagger-parameter %}

{% swagger-parameter in="body" required="true" %}
Object that contains theme configuration.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                $ref: "#/components/schemas/Theme"
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
