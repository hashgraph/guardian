# Creation of Schema related to the topic

{% swagger method="post" path="" baseUrl="/schemas/{topicId}" summary="Creates a schema related to the topic (policy)" %}
{% swagger-description %}
Creates new schema. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="topicId" type="String" required="true" %}
Topic ID
{% endswagger-parameter %}

{% swagger-parameter in="body" required="true" type="Object" %}
Object that contains a valid schema
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
```javascript
{
    // Response
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

{% swagger-response status="422: Unprocessable Entity" description="Unprocessable Entity" %}

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
