# Delete Notifications

{% swagger method="delete" path="" baseUrl="/notifications/delete/{notificationId}" summary="Delete notifications up to this point" %}
{% swagger-description %}
Returns deleted count.
{% endswagger-description %}

{% swagger-parameter in="path" name="notificationId" type="String" required="true" %}
Notification ID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful operation. Suggested next and nested block type respectively." %}
```
content:
            application/json:
              schema:
                type: number
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
