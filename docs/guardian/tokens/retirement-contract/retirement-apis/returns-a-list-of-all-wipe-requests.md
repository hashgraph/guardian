# Returns a list of all Wipe requests

{% swagger method="get" path="" baseUrl="/contracts/wipe/requests" summary="Return a list of all wipe requests" %}
{% swagger-description %}
Returns all wipe requests. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="query" name="contractId" type="String" %}
Contract Identifier
{% endswagger-parameter %}

{% swagger-parameter in="query" name="pageSize" type="number" %}
The numbers of items to return
{% endswagger-parameter %}

{% swagger-parameter in="query" name="pageIndex" type="number" %}
The number of pages to skip before starting to collect the result
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
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
                  $ref: '#/components/schemas/WiperRequestDTO'

```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}

{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}

{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```
content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endswagger-response %}
{% endswagger %}
