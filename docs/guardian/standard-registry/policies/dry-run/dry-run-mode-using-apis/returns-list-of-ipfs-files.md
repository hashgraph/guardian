# Returns List of IPFS Files

{% swagger method="get" path="" baseUrl="/policies/{policyId}/dry-run/ipfs" summary="Returns lists of IPFS files." %}
{% swagger-description %}
Returns lists of IPFS files. Only users with the Standard Registry role are allowed to make the request
{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy ID
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
                    createDate:
                      type: string
                    documentURL:
                      type: string
                    document:
                      type: object
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
