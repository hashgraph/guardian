# Returns Schema in Excel file format

{% swagger method="get" path="" baseUrl="/schemas/{schemaId}/export/xlsx" summary="Return schemas in a xlsx file format for the specified policy." %}
{% swagger-description %}
Returns a xlsx file containing schemas. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="schemaId" type="String" required="true" %}
Schema ID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                type: string
                format: binary
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
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endswagger-response %}
{% endswagger %}
