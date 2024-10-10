# Publishing Module onto IPFS

{% swagger method="put" path="" baseUrl="/modules/{uuid}/publish" summary="Publishes the module onto IPFS." %}
{% swagger-description %}
Publishes the module with the specified (internal) module ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Selected module ID.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/PublishModule'
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
