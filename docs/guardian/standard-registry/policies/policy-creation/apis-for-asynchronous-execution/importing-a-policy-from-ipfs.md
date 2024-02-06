# Importing a Policy from IPFS

{% swagger method="post" path="" baseUrl=" /policies/push/import/message" summary="Imports new policy and all associated artifacts from IPFS into the local DB." %}
{% swagger-description %}
Imports new policy and all associated artifacts from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" name="messageID" type="String" required="true" %}
Object that contains the identifier of the Hedera message which contains the IPFS CID of the Policy.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
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
