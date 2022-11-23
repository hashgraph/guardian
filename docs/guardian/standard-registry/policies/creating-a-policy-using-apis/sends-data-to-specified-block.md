# Sends Data to Specified Block

### SENDING BLOCK DATA

{% swagger method="post" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="Sends data to the specified block" %}
{% swagger-description %}
Sends data to the specified block
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
