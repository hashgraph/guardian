# Get All Notifications

{% swagger method="get" path="" baseUrl="/notifications" summary="Get all notifications." %}
{% swagger-description %}
Returns all notifications.
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful operation. Suggested next and nested block types respectively." %}
```
headers:
            X-Total-Count:
              description: Count of notifications
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/NotificationDTO'
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}

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
