# Import schema from Zip

### IMPORTING SCHEMA FROM .ZIP FILE

{% swagger method="post" path="" baseUrl="/schemas/import/file" summary="Imports new schema from a zip file" %}
{% swagger-description %}
Imports new schema from a zip file into the local DB. Only users with the Root Authority role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" required="true" type=".zip file" %}
A zip file containing schema to be imported
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
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
