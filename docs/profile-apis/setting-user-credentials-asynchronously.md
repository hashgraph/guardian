# Setting User Credentials Asynchronously

{% swagger method="put" path="" baseUrl="/profiles/push/{username}" summary="Sets Hedera credentials for the user" %}
{% swagger-description %}
Sets Hedera credentials for the user
{% endswagger-description %}

{% swagger-parameter in="path" name="username" type="String" required="true" %}
The name of the user for whom to update the information.
{% endswagger-parameter %}

{% swagger-parameter in="body" type="String" required="true" %}
Object that contains the Hedera account data.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
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
