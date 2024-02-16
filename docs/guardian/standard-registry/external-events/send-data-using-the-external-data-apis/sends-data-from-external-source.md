# Sends Data from External Source

{% swagger method="post" path="" baseUrl="/external" summary="Sends data from an external source." %}
{% swagger-description %}
Sends data from an external source
{% endswagger-description %}

{% swagger-parameter in="body" name="Object" required="true" %}
Object that contains VC Document
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
   content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}
