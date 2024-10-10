# Creating link between policies

{% swagger method="post" path="" baseUrl="/policies/{policyId}/multiple" summary="Requests Multi policy config" %}
{% swagger-description %}
Creates a link between the current policy and the main policy. Or creates a group making the current policy the main one.
{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="body" required="true" type="String" name="id" %}
mainPolicyTopicId
{% endswagger-parameter %}

{% swagger-parameter in="body" type="String" name="id" required="true" %}
synchronizationTopicId
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/MultiPolicyConfig'
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
