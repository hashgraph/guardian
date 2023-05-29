# Returns all Artifacts

{% swagger method="get" path="" baseUrl="/artifacts" summary="Returns all artifacts." %}
{% swagger-description %}
Returns all artifacts.
{% endswagger-description %}

{% swagger-parameter in="query" name="policyID" type="String" required="true" %}
Policy Identifier
{% endswagger-parameter %}

{% swagger-parameter in="query" name="pageIndex" type="Integer" required="true" %}
The number of pages to skip before starting to collect the result set
{% endswagger-parameter %}

{% swagger-parameter in="query" name="pageSize" type="Integer" required="true" %}
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
                  $ref: '#/components/schemas/Artifact'
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

