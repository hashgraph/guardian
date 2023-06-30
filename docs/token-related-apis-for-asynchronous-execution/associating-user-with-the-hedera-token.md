# Associating User with the Hedera Token

{% swagger method="put" path="" baseUrl="/tokens/push/{tokenId}/associate" summary="Associates the user with the provided Hedera token." %}
{% swagger-description %}
Associates the user with the provided Hedera token. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="tokenId" type="String" required="true" %}
Token ID
{% endswagger-parameter %}

{% swagger-response status="202: Accepted" description="Accepted" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task' 
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthroized" %}
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

{% swagger-response status="422: Unprocessable Entity" description="Unprocessable Entity" %}


```
User not registered
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
