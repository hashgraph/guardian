# Import Policy from Excel file

{% swagger method="post" path="" baseUrl="/policies/import/xlsx" summary="Imports new policy from a xlsx file." %}
{% swagger-description %}
Imports new policy and all associated artifacts, such as schemas and VCs, from the provided xlsx file into the local DB. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy Identifier
{% endswagger-parameter %}

{% swagger-parameter in="body" type="String" required="true" %}
A xlsx file containing policy config.
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
