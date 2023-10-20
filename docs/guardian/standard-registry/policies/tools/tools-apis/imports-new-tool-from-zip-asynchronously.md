# Imports new tool from Zip Asynchronously

{% swagger method="post" path="" baseUrl="/tools/push/import/file" summary="Imports new tool from a zip file." %}
{% swagger-description %}
Imports new tool and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                $ref: '#/components/schemas/TaskDTO'
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
