# Export Files from Schema

### [NextCreation of Schema related to the topic](https://app.gitbook.com/o/-LuC734MpqlgwA6zyhAO/s/bOsLGPRQ1YXxw4wDcVrE/\~/changes/334/guardian/standard-registry/schemas/schema-creation-using-apis/creation-of-schema-related-to-the-topic)EXPORTING SCHEMA FILES FOR THE SCHEMA

{% swagger method="post" path="" baseUrl="/schemas/{schemaId}/export/file" summary="Return zip file with schemas" %}
{% swagger-description %}
Returns schema files for the schemas. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="schemaID" type="String" required="true" %}
Selected schema ID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
   
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

{% swagger-response status="422: Unprocessable Entity" description="Unprocessable Entity" %}

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
