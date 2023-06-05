# Creating new Policy

{% swagger method="post" path="" baseUrl="/policy" summary="Creates a new policy." %}
{% swagger-description %}
Creates a new policy by wizard. Only users with the Standard Registry role are allowed to make the request. security:
{% endswagger-description %}

{% swagger-parameter in="body" type="Object" required="true" %}
Object that contains wizard configuration.
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                type: object
                properties:
                  policyId:
                    type: string
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

{% swagger method="post" path="" baseUrl="/policy/push" summary="Creates a new policy." %}
{% swagger-description %}
Creates a new policy by wizard. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" type="Object" required="true" %}
Object that contains wizard configuration.
{% endswagger-parameter %}

{% swagger-response status="201: Created" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                $ref: "#/components/schemas/Task"
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
