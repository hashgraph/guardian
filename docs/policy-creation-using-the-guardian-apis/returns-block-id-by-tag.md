# Returns Block ID by tag

### RETURNING BLOCK ID FROM POLICY BY TAG

{% swagger method="get" path="" baseUrl="/policies/{policyId}/tag/{tag}" summary="Requests block ID from a policy by tag" %}
{% swagger-description %}
Requests block ID from a policy by tag. Only users with the Root Authority and Installer roles are allowed to make the request
{% endswagger-description %}

{% swagger-parameter in="path" name="policyID" type="String" required="true" %}
Selected policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="tag" type="String" required="true" %}
Tag from the selected policy
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    application/json:
              schema:
                type: object
                properties:
                  id:
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
