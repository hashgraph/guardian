# Returns all Schemas related to the topic

{% swagger method="get" path="" baseUrl=" /schemas/{topicId}" summary="Returns schemas related to the topic (policy)" %}
{% swagger-description %}
Returns all schemas by topicId.
{% endswagger-description %}

{% swagger-parameter in="path" name="topicId" type="Integer" required="true" %}
Topic ID
{% endswagger-parameter %}

{% swagger-parameter in="query" name="pageIndex" type="Integer" required="false" %}
The number of pages to skip before starting to collect the result set
{% endswagger-parameter %}

{% swagger-parameter in="query" type="Integer" name="pageSize" required="false" %}
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
