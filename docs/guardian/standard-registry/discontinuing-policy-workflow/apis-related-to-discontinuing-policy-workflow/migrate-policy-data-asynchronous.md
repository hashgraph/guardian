# Migrate Policy Data Asynchronous

{% swagger method="post" path="" baseUrl="/policies/push/migrate-data" summary="Migrate policy data asynchronous" %}
{% swagger-description %}
Migrate policy data asynchronous. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" type="String" required="true" %}
Migration config.
{% endswagger-parameter %}

{% swagger-response status="202: Accepted" description="Created Task" %}
```
content:
            application/json:
              schema:
                type: object
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
