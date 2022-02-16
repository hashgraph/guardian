# Schema Preview from IPFS

### PREVIEWING SCHEMA FROM IPFS FILE

{% swagger method="post" path="" baseUrl="/schemas/import/message/preview" summary="Schema preview from IPFS" %}
{% swagger-description %}
Previews the schema from IPFS without loading it into the local DB. Only users with the Root Authority role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" name="" type="Object" required="true" %}
 Object that contains the identifier of the Hedera message which contains the IPFS CID of the schema
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Schema'
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
