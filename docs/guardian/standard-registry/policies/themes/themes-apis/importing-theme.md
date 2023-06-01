# Importing theme

{% swagger method="post" path="" baseUrl="/themes/import/file" summary="Imports new theme from a zip file." %}
{% swagger-description %}
Imports new theme from the provided zip file into the local DB.
{% endswagger-description %}

{% swagger-parameter in="body" required="true" %}
A zip file that contains the theme to be imported.
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
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
