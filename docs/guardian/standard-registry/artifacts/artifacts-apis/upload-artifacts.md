# Upload Artifacts

{% swagger method="post" path="" baseUrl="/artifacts/{policyId}" summary="Upload Artifact" expanded="false" %}
{% swagger-description %}
Upload artifact. For users with the Standard Registry role only.
{% endswagger-description %}

{% swagger-parameter in="body" name="schema" type="Object" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="artifacts" type="Array" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="items" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="path" name="policyID" type="String" required="true" %}
Policy Identifier
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Created" %}
```javascript
{
    content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Artifact'
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

{% swagger-response status="422: Unprocessable Entity" description="Unprocessable Entity" %}


```
There are no files to upload
```

```
There is no appropriate policy or policy is not in DRAFT status
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
