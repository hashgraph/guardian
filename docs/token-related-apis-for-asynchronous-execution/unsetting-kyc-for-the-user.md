# Unsetting KYC for the User

{% swagger method="put" path="" baseUrl="/tokens/push/{tokenId}/{username}/revoke-kyc" summary="Unsets the KYC flag for the user." %}
{% swagger-description %}
Unsets the KYC flag for the user. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="tokenId" type="String" required="true" %}
TokenID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="username" type="String" required="true" %}
Username
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
