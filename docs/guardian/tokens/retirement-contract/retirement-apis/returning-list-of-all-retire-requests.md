# Returning list of all Retire Requests

{% swagger method="get" path="" baseUrl="/contracts/retire/requests" summary="Return a list of all retire requests." %}
{% swagger-description %}
Returns all retire requests.
{% endswagger-description %}

{% swagger-parameter in="query" name="contractId" type="String" %}
Contract Identifier
{% endswagger-parameter %}

{% swagger-parameter in="query" name="pageSize" type="Number" required="false" %}
The numbers of items to return
{% endswagger-parameter %}

{% swagger-parameter in="query" name="pageIndex" type="Number" %}
The number of pages to skip before starting to collect the result set
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
                  $ref: '#/components/schemas/RetireRequestDTO'
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}

{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}

{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}

{% endswagger-response %}
{% endswagger %}
