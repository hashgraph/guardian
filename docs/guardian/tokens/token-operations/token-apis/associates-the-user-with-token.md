# Associates the user with token

### ASSOCIATES USER WITH TOKEN

{% swagger method="put" path="" baseUrl="/tokens/{tokenId}/associate" summary="Associates the user with the provided Hedera token" %}
{% swagger-description %}
Associates the user with the provided Hedera token. Only users with the Installer role are allowed to make the request
{% endswagger-description %}

{% swagger-parameter in="path" name="tokenID" type="String" required="true" %}
Token ID
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
