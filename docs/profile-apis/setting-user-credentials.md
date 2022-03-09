# Setting User Credentials

### SETS HEDERA CREDENTIALS

{% swagger method="put" path="" baseUrl="/profiles/{username}" summary="Sets Hedera credentials for the user" %}
{% swagger-description %}
Sets Hedera credentials for the user. For users with the Root Authority role it also creates an address book
{% endswagger-description %}

{% swagger-parameter in="path" name="username" type="String" required="true" %}
The name of the user for whom to update the information
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="" %}
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
