# Get suggestions configuration

{% swagger method="get" path="" baseUrl="/suggestions/config" summary="Get suggestions config" %}
{% swagger-description %}
Get suggestions config. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful operation. Response suggestions config." %}
```
content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: "#/components/schemas/SuggestionsOrderPriority"
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
