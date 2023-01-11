# Returning Contract Pairs

{% swagger method="get" path="" baseUrl="/contracts/pair" summary="Returns all contracts pairs" %}
{% swagger-description %}
Returns all contracts pairs.
{% endswagger-description %}

{% swagger-parameter in="query" name="baseTokenId" type="String" %}
Base Token Identifier
{% endswagger-parameter %}

{% swagger-parameter in="query" name="OppositeTokenId" type="String" %}
Opposite Token Identifier
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
                  type: object
                  properties:
                    baseTokenRate:
                      type: Integer
                    oppositeTokenRate:
                      type: Integer
                    contractId:
                      type: string
                    description:
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
