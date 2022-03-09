# Retrieval of Data from Root Policy Block

### RETRIEVING DATA FROM ROOT POLICY BLOCK

{% swagger method="get" path="" baseUrl="/policies/{policyId}/blocks" summary="Retrieves data for the policy root block" %}
{% swagger-description %}
Returns data from the root policy block. Only users with the Root Authority and Installer role are allowed to make the request
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
                $ref: '#/components/schemas/PolicyBlock'
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
