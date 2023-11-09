# Creation of Schema

{% swagger method="post" path="" baseUrl="/schemas/push/{topicId}" summary="Create new schema." %}
{% swagger-description %}
Creates new schema. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="topicId" type="String" required="true" %}
Topic ID
{% endswagger-parameter %}

{% swagger-parameter in="body" required="true" %}
Object that contains a valid schema.
{% endswagger-parameter %}

{% swagger-response status="202: Accepted" description="Accepted" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
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
