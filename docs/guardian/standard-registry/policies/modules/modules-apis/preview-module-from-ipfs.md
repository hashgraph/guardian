# Preview Module from IPFS

{% swagger method="post" path="" baseUrl="/modules/import/message/preview" summary="Module preview from IPFS." %}
{% swagger-description %}
Previews the module from IPFS without loading it into the local DB. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" name="messageId" type="String" required="true" %}
Object that contains the identifier of the Hedera message which contains the IPFS CID of the module.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
  content:
            application/json:
              schema:
                $ref: '#/components/schemas/PreviewModule'
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

{% swagger-response status="500: Internal Server Error" description="Internal server Error" %}
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
