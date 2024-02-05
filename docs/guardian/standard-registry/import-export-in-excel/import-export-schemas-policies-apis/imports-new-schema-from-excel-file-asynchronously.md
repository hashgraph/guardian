# Asynchronously imports schemas in Excel file format into a policy

{% swagger method="post" path="" baseUrl="/schemas/push/{topicId}/import/xlsx" summary="Asynchronously imports schemas in Excel file format into a policy." %}
{% swagger-description %}
Asynchronously imports schemas in Excel file format into a policy. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="topicId" type="String" required="true" %}
Topic ID
{% endswagger-parameter %}

{% swagger-parameter in="body" name="xlsx" type="String" required="true" %}
A xlsx file containing schema config.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                type: object
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
