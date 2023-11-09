# Returns Tools and its artifacts in zip format

{% swagger method="get" path="" baseUrl="/tools/{id}/export/file" summary="Return tool and its artifacts in a zip file format for the specified tool." %}
{% swagger-description %}
Returns a zip file containing the published tool and all associated artifacts, i.e. schemas and VCs. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="id" type="String" required="true" %}
Tool ID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful operation. Response zip file." %}

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
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endswagger-response %}
{% endswagger %}
