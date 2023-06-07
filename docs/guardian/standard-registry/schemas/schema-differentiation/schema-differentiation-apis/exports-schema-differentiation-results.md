# Exports Schema Differentiation Results

{% swagger method="post" path="" baseUrl="/analytics/compare/schemas/export" summary="Returns the result of comparing two schemas." %}
{% swagger-description %}
Returns the result of comparing two schemas. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="query" name="type" type="String" required="true" %}
File Type
{% endswagger-parameter %}

{% swagger-parameter in="body" name="schemaId1" type="String" %}
Schema Identifier 1
{% endswagger-parameter %}

{% swagger-parameter in="body" name="schemaId2" type="String" %}
Schema Identifier 2
{% endswagger-parameter %}

{% swagger-parameter in="body" name="idLvl" type="String" %}
UUID comparison setting (0/1)
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                type: string
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
