# Returns list of tools

{% swagger method="get" path="" baseUrl="/tools" summary="Return a list of all tools." %}
{% swagger-description %}
Returns all tools. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="query" name="pageSize" type="number" %}
The numbers of items to return
{% endswagger-parameter %}

{% swagger-parameter in="query" name="pageIndex" type="number" %}
The number of pages to skip before starting to collect the result set
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                $ref: '#/components/schemas/ToolDTO'
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```
content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endswagger-response %}
{% endswagger %}
