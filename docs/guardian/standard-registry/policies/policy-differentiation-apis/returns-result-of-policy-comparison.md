# Returns result of Policy comparison

{% swagger method="post" path="" baseUrl="/analytics/compare/policies" summary="Returns the result of comparing two policies." %}
{% swagger-description %}
Returns the result of comparing two policies. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" name="policyId1" type="String" %}
Policy 1 Identifier
{% endswagger-parameter %}

{% swagger-parameter in="body" name="policyId2" type="String" %}
Policy 2 Identifier
{% endswagger-parameter %}

{% swagger-parameter in="body" name="propLvl" type="String" %}
Properties comparison settings (0/1/2)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="childrenLvl" type="String" %}
Child block comparison setting (0/1/2)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="eventsLvl" type="String" %}
Event comparison setting (0/1)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="idLvl" type="String" %}
Level of UUID comparison (0/1)
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                type: object
                properties:
                  left:
                    type: object
                  right:
                    type: object
                  roles:
                    $ref: '#/components/schemas/Table'
                  groups:
                    $ref: '#/components/schemas/Table'
                  tokens:
                    $ref: '#/components/schemas/Table'
                  topics:
                    $ref: '#/components/schemas/Table'
                  blocks:
                    $ref: '#/components/schemas/Table'
                  total:
                    type: number
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
