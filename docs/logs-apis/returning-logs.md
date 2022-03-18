# Returning Logs

## RETURNS LOGS

{% swagger method="post" path="" baseUrl="/logs" summary="Returns logs." %}
{% swagger-description %}
Returns logs. For users with the Root Authority role only.
{% endswagger-description %}

{% swagger-parameter in="body" type="String" name="type" required="true" %}
Type of Log
{% endswagger-parameter %}

{% swagger-parameter in="body" name="startDate" type="String" required="true" %}
Start Date
{% endswagger-parameter %}

{% swagger-parameter in="body" name="endDate" type="String" required="true" %}
End Date
{% endswagger-parameter %}

{% swagger-parameter in="body" name="attributes" type="Array" required="true" %}
Attributes
{% endswagger-parameter %}

{% swagger-parameter in="body" name="items" type="String" required="true" %}
Items
{% endswagger-parameter %}

{% swagger-parameter in="body" name="message" type="String" required="true" %}
Log Message
{% endswagger-parameter %}

{% swagger-parameter in="body" name="pageSize" type="Number" required="true" %}
Size of the Page
{% endswagger-parameter %}

{% swagger-parameter in="body" name="pageIndex" type="Number" required="true" %}
Index of page
{% endswagger-parameter %}

{% swagger-parameter in="body" name="sortDirection" type="String" required="true" %}
enum: [ASC, DESC]
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    application/json:
              schema:
                totalCount:
			 type: number
		logs:
			 type: object
			      properties:
					type:
					  type: string
					datetime:
					  type: string
					message:
					  type: string
					attributes:
					  type: array
					items:
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
