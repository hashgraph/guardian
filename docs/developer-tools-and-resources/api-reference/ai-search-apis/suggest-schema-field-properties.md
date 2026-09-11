# Suggests schema field properties

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_CREATE`

{% swagger method="post" path="" baseUrl="/ai-suggestions/schema-properties" summary="Suggests schema field properties" %}
{% swagger-description %}
Returns ranked IWA property candidates for each schema field
{% endswagger-description %}

{% swagger-parameter in="body" name="schemaId" type="String" required="true" %}
Id of the schema the field(s) needing a suggestion belong to. The schema itself (its fields, name, description and IWA version) is always fetched server-side from this id, never trusted from the request body.
{% endswagger-parameter %}

{% swagger-parameter in="body" name="fieldNames" type="Array" required="true" %}
Names of the fields to return suggestions for. Suggestions are computed using every field on the schema as context, so the same field gets the same candidates regardless of how many fields are requested alongside it.
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
