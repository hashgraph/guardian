# Returning Log Attributes

## RETURNS LOGS ATTRIBUTES

{% swagger method="get" path="" baseUrl="/logs/attributes" summary="Returns logs attributes" %}
{% swagger-description %}
Returns logs attributes. For users with the Root Authority role only.
{% endswagger-description %}

{% swagger-parameter in="query" name="name" type="String" required="true" %}
Part of the name
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    application/json:
              schema:
                type: array
                items: 
                  type: string
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
