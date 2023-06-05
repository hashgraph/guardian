# Creating new Schema Tag

{% swagger method="post" path="" baseUrl="/tags/schemas" summary="Creates new schema tag" %}
{% swagger-description %}
Creates new schema. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" required="true" %}
Object that contains a valid schema.
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                $ref: "#/components/schemas/Schema"
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
