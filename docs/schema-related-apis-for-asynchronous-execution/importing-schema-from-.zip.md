# Importing Schema from .zip

{% swagger method="post" path="" baseUrl=" /schemas/push/{topicId}/import/file" summary="Imports new schema from a zip file." %}
{% swagger-description %}
Imports new schema from a zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" type="String" required="true" %}
A zip file containing schema to be imported
{% endswagger-parameter %}

{% swagger-parameter in="path" name="topicId" type="String" required="true" %}
topic ID
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
