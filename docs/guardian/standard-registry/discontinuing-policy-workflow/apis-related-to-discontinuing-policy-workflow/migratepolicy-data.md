# MigratePolicy Data

{% swagger method="post" path="" baseUrl="/policies/migrate-data" summary="Migrate policy data." %}
{% swagger-description %}
Migrate policy data. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" type="String" required="true" %}
Migration config.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Error while Migration" %}
```
content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    error:
                      type: string
                    id:
                      type: string
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
