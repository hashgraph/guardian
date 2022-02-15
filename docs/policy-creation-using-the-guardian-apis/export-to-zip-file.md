# Export to zip file

### POLICY EXPORT FROM .ZIP

{% swagger method="get" path="" baseUrl="/policies/{policyId}/export/file" summary="Return policy and its artifacts in a zip file format for the specified policy" %}
{% swagger-description %}
Returns a zip file containing the published policy and all associated artifacts, i.e. schemas and VCs. Only users with the Root Authority role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="policyID" type="String" required="true" %}
Selected policy ID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExportPolicy'
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
