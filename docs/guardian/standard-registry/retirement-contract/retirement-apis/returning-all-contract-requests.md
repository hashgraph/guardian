# Returning all contract requests

{% swagger method="get" path="" baseUrl="/contracts/retire/request" summary="Returns all contract requests." %}
{% swagger-description %}
Returns all contract requests.
{% endswagger-description %}

{% swagger-parameter in="path" type="String" name="contractId" %}
Contract Identifier
{% endswagger-parameter %}

{% swagger-parameter in="path" type="Integer" name="pageIndex" %}
The number of pages to skip before starting to collect the result set
{% endswagger-parameter %}

{% swagger-parameter in="path" name="pageSize" type="Integer" %}
The numbers of items to return
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
   headers:
            x-total-count:
              schema:
                type: integer
              description: Total items in the collection.
          content:
            application/json:
              schema:
                type: array
                items:
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
