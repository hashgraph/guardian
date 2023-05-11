# Creating new Module

{% swagger method="post" path="" baseUrl="/modules" summary="Creates a new module." %}
{% swagger-description %}
Creates a new module. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" required="true" type="Json" %}
Object that contains module configuration
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
````scheme
```typescript
{
  createDate: string
  updateDate: string
  _id: string
  name: string
  description: string
  config: Config
  creator: string
  owner: string
  type: string
  status: string
  uuid: string
  codeVersion: string
  configFileId: string
  id: string
}
```
````
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


```
Invalid module config
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

