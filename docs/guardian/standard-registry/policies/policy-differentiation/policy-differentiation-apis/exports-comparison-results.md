# Exports Comparison results

{% swagger method="post" path="" baseUrl="/analytics/compare/policies/export" summary="Returns the result of comparing two or more policies." %}
{% swagger-description %}
Returns the result of comparing two or more policies. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="query" name="type" type="String" required="true" %}
File type.
{% endswagger-parameter %}

{% swagger-parameter in="body" name="policyId1" type="String" required="true" %}
Policy 1 Identifier
{% endswagger-parameter %}

{% swagger-parameter in="body" name="policyId2" type="String" required="true" %}
Policy 2 Identifier
{% endswagger-parameter %}

{% swagger-parameter in="body" name="eventsLvl" type="String" required="true" %}
Event comparison setting (0/1)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="propLvl" type="String" required="true" %}
Properties comparison setting (0/1/2)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="childrenLvl" type="String" required="true" %}
Child block comparison setting (0/1/2)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="idLvl" type="String" required="true" %}
UUID comparison setting (0/1)
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
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
