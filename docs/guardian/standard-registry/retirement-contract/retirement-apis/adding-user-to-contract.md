# Adding User to Contract

{% swagger method="post" path="" baseUrl=" /contracts/{contractId}/user" summary="Add new contract user" %}
{% swagger-description %}
Add new contract user. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="contractId" type="String" required="true" %}
Contract identifier
{% endswagger-parameter %}

{% swagger-parameter in="body" name="userId" type="String" %}
Request Object Parameters
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
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
