# Token Creation

{% swagger method="post" path="" baseUrl="/tokens/push" summary="Creates a new token" %}
{% swagger-description %}
Creates a new token. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" required="true" %}
Object that contains token information
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

{% swagger-response status="403: Forbidden" description="" %}

{% endswagger-response %}

{% swagger-response status="404: Not Found" description="Not Found" %}


```
Token not found
```
{% endswagger-response %}

{% swagger-response status="422: Unprocessable Entity" description="Unprocessable Entity" %}


```
The field tokenId is required
```

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
