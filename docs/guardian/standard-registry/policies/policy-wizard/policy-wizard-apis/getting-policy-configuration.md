# Getting Policy Configuration

{% swagger method="post" path="" baseUrl="/{policyId}/config" summary="Get policy config." %}
{% swagger-description %}
Get policy config by wizard. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy identifier.
{% endswagger-parameter %}

{% swagger-parameter in="body" type="Object" required="true" %}
Object that contains wizard configuration.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                type: object
                properties:
                  policyConfig: 
                    $ref: "#/components/schemas/PolicyConfig"
                  wizardConfig:
                    $ref: "#/components/schemas/WizardConfig"
```
{% endswagger-response %}

{% swagger-response status="401: Unauthorized" description="Unauthorized" %}

{% endswagger-response %}

{% swagger-response status="403: Forbidden" description="Forbidden" %}

{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```
content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
```
{% endswagger-response %}
{% endswagger %}
