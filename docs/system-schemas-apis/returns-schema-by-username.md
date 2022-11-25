# Returns Schema by Username

### RETURNS ALL SYSTEM SCHEMAS BY USERNAME

{% swagger method="get" path="" baseUrl="/schemas/system/{username}" summary="Returns all System Schemas by Username" %}
{% swagger-description %}
Return all system schemas by username. Only user with the Standard Registry are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="username" type="String" required="true" %}
Username
{% endswagger-parameter %}

{% swagger-parameter in="query" name="pageIndex" type="Integer" required="false" %}
The number of pages to skip before starting to collect the result set.
{% endswagger-parameter %}

{% swagger-parameter in="query" name="pageSize" type="Integer" required="false" %}
The number of items to return.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    headers:
            x-total-count:
              schema:
                type: integer
              description: Total number of items in the collection.
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
