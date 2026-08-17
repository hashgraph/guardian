# Policy Listing

### **POLICY LISTING**

{% swagger method="get" path="" baseUrl="/policies" summary="Return a list of all policies" %}
{% swagger-description %}
Returns all policies. Only users with the Standard Registry and Installer role are allowed to make the request
{% endswagger-description %}

{% swagger-parameter in="query" name="pageIndex" type="Integer" required="true" %}
The number of pages to skip before starting to collect the result set
{% endswagger-parameter %}

{% swagger-parameter in="query" name="pageSize" type="Integer" required="true" %}
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
                  allOf:
                    - $ref: '#/components/schemas/PolicyConfig'
                    - type: object
                      properties:
                        userRoles:
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
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
}
```
{% endswagger-response %}
{% endswagger %}
