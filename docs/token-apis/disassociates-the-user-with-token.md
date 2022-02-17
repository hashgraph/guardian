# Disassociates the user with token

### DISASSOCIATES USER WITH TOKEN

{% swagger method="put" path="" baseUrl="/tokens/{tokenId}/dissociate" summary="Disassociate the user with the provided Hedera token" %}
{% swagger-description %}
Disassociates the user with the provided Hedera token. Only users with the Installer role are allowed to make the request.
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

**Description:** Disassociates the user with the provided Hedera token.&#x20;

Only users with the Installer role are allowed to make the request.

PUT  /tokens/{tokenId}/disassociate

**Request body:**

```
  parameters:
        - in: path
          name: tokenId
          schema:
            type: string
          required: true
          description: Token ID.
      security:
      - bearerAuth: []
```

#### Response body:

```
200:
          description: Successful operation.
401:
          description: Unauthorized.
403:
          description: Forbidden.
500:
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```
