# Retrieves Block Data by Tag

### RETRIEVES BLOCK DATA BY TAG

{% swagger method="get" path="" baseUrl="/policies/{policyId}/tag/{tag}/blocks" summary="Requests block data" %}
{% swagger-description %}
Requests block data by tag. Only users with a role that described in block are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Selected Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="tag" type="String" required="true" %}
Tag from the selected policy
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
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
     application/json:
              schema:
                $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}
