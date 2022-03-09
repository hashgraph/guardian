# Retrieves Policy Configuration

### **RETRIEVES POLICY CONFIGURATION**

{% swagger method="get" path="policies/{policyId}" baseUrl="/" summary="Retrieves policy configuration" %}
{% swagger-description %}
Retrieves policy configuration for the specified policy ID. Only users with the Root Authority role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="query" name="policyID" type="String" required="true" %}
Selected policy ID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/PolicyConfig'
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
