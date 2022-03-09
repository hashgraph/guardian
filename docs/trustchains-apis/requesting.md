# Requesting

### REQUESTS ALL VP DOCUMENTS

{% swagger method="get" path="" baseUrl="/trustchains" summary="Returns a list of all VP documents" %}
{% swagger-description %}
Requests all VP documents. Only users with the Auditor role are allowed to make the request
{% endswagger-description %}

{% swagger-response status="200: OK" description="" %}
```javascript
{
    content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/VerifiablePresentation'
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

{% swagger-response status="403: Forbidden" description="" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="" %}
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
