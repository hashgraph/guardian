# Export message IDs of Schema

### EXPORTING HEDERA MESSAGED IDS OF PUBLISHED SCHEMA

{% swagger method="post" path="" baseUrl="/schemas/{schemaId}/export/message" summary="Hedera message IDs of published schemas" %}
{% swagger-description %}
Returns Hedera message IDs of the published schemas, these messages contain IPFS CIDs of these schema files. Only users with the Root Authority role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="schemaID" type="String" required="true" %}
Selected schema ID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: "#/components/schemas/ExportSchema"
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
