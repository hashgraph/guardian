# Displaying Current Settings

## DISPLAYS CURRENT SETTINGS

{% swagger method="get" path="" baseUrl="/settings" summary="Returns current settings" %}
{% swagger-description %}
Returns current settings. For users with the Root Authority role only
{% endswagger-description %}

{% swagger-response status="200: OK" description="Success Operation" %}
```javascript
{
    type: object
            properties:
			operatorId:
			  type: string
			operatorKey:
			  type: string
			schemaTopicId:
			  type: string
			nftApiKey:
			  type: string
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
