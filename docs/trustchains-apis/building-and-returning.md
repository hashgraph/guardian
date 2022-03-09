# Building and returning

### BUILDING AND RETURNING A TRUSTCHAIN

{% swagger method="get" path="" baseUrl="/trustchains/{hash}" summary="Returns a trustchain for a VP document" %}
{% swagger-description %}
Builds and returns a trustchain, from the VP to the root VC document. Only users with the Auditor role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="hash" type="String" required="true" %}
Hash or ID of a VP document
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/TrustChains'
}
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="" %}
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
