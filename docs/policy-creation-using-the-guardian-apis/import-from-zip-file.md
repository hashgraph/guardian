# Import from zip file

### POLICY IMPORT FROM .ZIP

{% swagger method="post" path="" baseUrl="/policies/import/file" summary="Imports new policy from a zip file" %}
{% swagger-description %}
Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB. Only users with the Root Authority role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" required="true" %}
A zip file that contains the policy and associated schemas and VCs to be imported
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/PolicyConfig'
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
