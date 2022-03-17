# Returning Logs

## RETURNS LOGS

{% swagger method="post" path="" baseUrl="/logs" summary="Returns logs." %}
{% swagger-description %}
Returns logs. For users with the Root Authority role only.
{% endswagger-description %}

{% swagger-parameter in="body" type="schema" %}
Log Filters
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    application/json:
              schema:
                type: object
                properties:
                  totalCount:
                    type: number
                  logs:
                    $ref: '#/components/schemas/Log'
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
     application/json:
              schema:
                $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}
