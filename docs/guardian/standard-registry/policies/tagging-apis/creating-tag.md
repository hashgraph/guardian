# Creating Tag

{% swagger method="post" path="" baseUrl="/tags/" summary="Creates new tag." %}
{% swagger-description %}
Creates new tag.
{% endswagger-description %}

{% swagger-parameter in="body" type="Object" required="true" %}
Object that contains tag information.
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                $ref: "#/components/schemas/Tag"
```
{% endswagger-response %}

{% swagger-response status="400: Bad Request" description="Bad Request" %}
```
content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
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
