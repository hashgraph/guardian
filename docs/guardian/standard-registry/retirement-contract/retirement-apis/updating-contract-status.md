# Updating Contract Status

{% swagger method="post" path="" baseUrl="/contracts/{contractId}/status" summary="Update contract status" %}
{% swagger-description %}
Update contract status. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="contractId" type="String" required="true" %}
Contract identifier
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation,Returns true if you are added to contract else false." %}
```javascript
{
    content:
            application/json:
              schema:
                type: boolean
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
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}
