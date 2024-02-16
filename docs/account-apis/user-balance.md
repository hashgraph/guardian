# User Balance

### RETURNS CURRENT USER'S HEDERA ACCOUNT BALANCE

{% swagger method="get" path="" baseUrl="/accounts/balance" summary="Returns user's Hedera account balance" %}
{% swagger-description %}
Requests current Hedera account balance
{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                type: object
                properties:
                  balance:
                    type: number
                  unit:
                    type: string
                  user:
                    type: object
                    properties:
                      username:
                        type: string
                      did:
                        type: string
}
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```javascript
{
    content:
            application/json:
              schema:
}
```
{% endswagger-response %}
{% endswagger %}
