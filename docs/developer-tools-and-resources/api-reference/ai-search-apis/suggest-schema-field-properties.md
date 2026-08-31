# Suggests schema field properties

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_CREATE`

{% swagger method="post" path="" baseUrl="/ai-suggestions/schema-properties" summary="Suggests schema field properties" %}
{% swagger-description %}
Returns ranked IWA property candidates for each schema field
{% endswagger-description %}

{% swagger-parameter in="body" name="schemaTitle" type="String" %}
Name of the schema the fields belong to
{% endswagger-parameter %}

{% swagger-parameter in="body" name="iwaVersion" type="String" %}
IWA dMRV specification version to match properties against, e.g. 3.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="fields" type="Array" required="true" %}
Schema fields to tag, each with name, title, description, type, currentProperty
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
{
  "available": true,
  "results": [
    {
      "fieldName": "orgCountry",
      "candidates": [
        {
          "title": "Address.country",
          "confidence": 0.9,
          "rationale": "The field name \"orgCountry\" corresponds to Address.country.",
          "description": "The country of the address."
        }
      ]
    }
  ]
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```
{
  "code": 0,
  "message": "string"
}
```
{% endswagger-response %}
{% endswagger %}
