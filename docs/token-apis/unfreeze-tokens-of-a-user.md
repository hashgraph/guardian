# UnFreeze Tokens of a user

### UNFREEZE TRANSFER OF TOKENS OF A USER

{% swagger method="put" path="" baseUrl="/tokens/{tokenId}/{username}/unfreeze" summary="Unfreezes transfers of the specified token for the user" %}
{% swagger-description %}
Unfreezes transfers of the specified token for the user. Only users with the Root Authority role are allowed to make the request
{% endswagger-description %}

{% swagger-parameter in="path" name="tokenID" type="String" required="true" %}
Token ID
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
                $ref: '#/components/schemas/TokenInfo'
}
```
{% endswagger-response %}

{% swagger-response status="400: Bad Request" description="Bad Request" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
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
