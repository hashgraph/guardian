# Publishing schema based on schema ID

### PUBLISHING SCHEMA BASED ON SCHEMA ID

{% swagger method="put" path="" baseUrl="/schemas/{schemaId}/publish" summary="Publishes the schema" %}
{% swagger-description %}
Publishes the schema with the provided (internal) schema ID onto IPFS, sends a message featuring IPFS CID into the corresponding Hedera topic. Only users with the Root Authority role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="schemaID" type="String" required="true" %}
Schema ID
{% endswagger-parameter %}

{% swagger-parameter in="body" type="Object" required="true" name="version" %}
Object that contains policy version
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
