# Importing Schema from IPFS

{% swagger method="post" path="" baseUrl="/schemas/push/{topicId}/import/message" summary="Imports new schema from IPFS." %}
{% swagger-description %}
Imports new schema from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" required="true" type="String" name="messageId" %}
Object that contains the identifier of the Hedera message which contains the IPFS CID of the schema.
{% endswagger-parameter %}

{% swagger-parameter in="path" name="topicId" type="String" required="true" %}
Topic ID
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
