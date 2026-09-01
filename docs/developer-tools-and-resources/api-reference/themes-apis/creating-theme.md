# Creating theme

{% swagger method="post" path="" baseUrl="/themes" summary="Creates a new theme." %}
{% swagger-description %}
Creates a new theme.
{% endswagger-description %}

{% swagger-parameter in="body" required="true" %}
Object that contains theme configuration.
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}

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
