# Returns list of Groups of a particular user

{% swagger method="get" path="" baseUrl="/policies/{policyId}/groups" summary="Returns a list of groups the user is a member of." %}
{% swagger-description %}
Returns a list of groups the user is a member of.
{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Selected policy ID.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: string
                    uuid:
                      type: string
                    role:
                      type: string
                    groupLabel:
                      type: string
                    groupName:
                      type: string
                    active:
                      type: boolean
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
