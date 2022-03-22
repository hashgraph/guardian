# Policy Preview from IPFS

### POLICY PREVIEW FROM IPFS

{% swagger method="post" path="" baseUrl="/policies/import/message/preview" summary="Policy preview from IPFS" %}
{% swagger-description %}
Previews the policy from IPFS without loading it into the local DB. Only users with the Root Authority role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" type="Object" name="messageID" required="true" %}
Object that contains the identifier of the Hedera message which contains the IPFS CID of the policy
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/PreviewPolicy'
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
