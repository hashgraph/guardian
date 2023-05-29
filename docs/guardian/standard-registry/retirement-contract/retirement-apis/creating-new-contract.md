# Creating new Contract

{% swagger method="post" path="" baseUrl="/contracts" summary="Creates new contract" %}
{% swagger-description %}
Creates new contract. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" type="String" required="true" %}
Request Object Parameters.
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Created" %}
```javascript
{
    content:
          application/json:
            schema:
              $ref: "#/components/schemas/Contract"
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
