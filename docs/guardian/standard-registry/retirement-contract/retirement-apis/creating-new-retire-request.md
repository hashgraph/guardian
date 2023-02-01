# Creating new Retire Request

{% swagger method="post" path="" baseUrl="/contracts/{contractId}/retire/request" summary="Creates new contract retire request." %}
{% swagger-description %}
Creates new contract retire request.
{% endswagger-description %}

{% swagger-parameter in="path" name="contractId" type="String" required="true" %}
Contract identifier
{% endswagger-parameter %}

{% swagger-parameter in="body" name="baseTokenId" type="String" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="oppositeTokenId" type="String" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="baseTokenCount" type="Integer" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="oppositeTokenCount" type="Integer" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="baseTokenSerials" type="array" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="oppositeTokenSerials" type="array" %}

{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
          application/json:
            schema:
              $ref: "#/components/schemas/RetireRequest"
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
