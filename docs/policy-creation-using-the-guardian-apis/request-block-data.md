# Request Block Data

### REQUESTING BLOCK DATA

{% swagger method="get" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="Requests block data" %}
{% swagger-description %}
Requests block data. Only users with a role that described in block are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="policyID" type="String" required="true" %}
Selected policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Selected block UUID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/PolicyBlockData'
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
