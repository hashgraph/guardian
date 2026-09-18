# Make the selected Group active

{% swagger method="post" path="" baseUrl="/policies/{policyId}/groups" summary="Makes the selected group active." %}
{% swagger-description %}
Makes the selected group active. if UUID is not set then returns the user to the default state.
{% endswagger-description %}

{% swagger-parameter in="body" required="true" name="uuid" type="String" %}
Selected Group
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
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

{% swagger-response status="500: Internal Server Error" description="Internal Sever Error" %}
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
