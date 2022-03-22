# Adding Settings

## SET SETTINGS

{% swagger method="post" path="" baseUrl="/settings" summary="Set settings." %}
{% swagger-description %}
Set settings. For users with the Root Authority role only.
{% endswagger-description %}

{% swagger-parameter in="body" type="String" required="true" name="operatorID" %}
ID of the operator
{% endswagger-parameter %}

{% swagger-parameter in="body" name="operatorKey" type="String" required="true" %}
Key of the operator
{% endswagger-parameter %}

{% swagger-parameter in="body" name="schemaTopicID" type="String" required="true" %}
TopicID of Schema
{% endswagger-parameter %}

{% swagger-parameter in="body" name="nftApiKey" type="String" required="true" %}
API key of NFT
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
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

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
    application/json:
              schema:
                $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}
