# Logging Virtual User

{% swagger method="post" path="" baseUrl="/policies/{policyId}/dry-run/login" summary="Logs virtual user into the system" %}
{% swagger-description %}
Logs virtual user into the system. Only users with the Standard Registry role are allowed to make the request
{% endswagger-description %}

{% swagger-parameter in="path" name="policy ID" type="String" required="true" %}
policy ID
{% endswagger-parameter %}

{% swagger-parameter in="body" type="Object" required="true" %}
Virtual User
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    username:
                      type: string
                    did:
                      type: string
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
