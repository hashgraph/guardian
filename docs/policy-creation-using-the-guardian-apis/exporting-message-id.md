# Exporting Message ID

### EXPORTING MESSAGE ID FOR A POLICY

{% swagger method="get" path="" baseUrl="/policies/{policyId}/export/message" summary="Return Hedera message ID for the specified published policy" %}
{% swagger-description %}
Returns the Hedera message ID for the specified policy published onto IPFS. Only users with the Root Authority role are allowed to make the request.
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
