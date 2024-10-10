# Set suggestions configuration

{% swagger method="post" path="" baseUrl="/suggestions/config" summary="Set suggestions config" %}
{% swagger-description %}
Set suggestions config. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" type="Object" required="true" %}
Object that contains suggestions priority order array.
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful operation. Response set suggestions priority order array." %}
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
