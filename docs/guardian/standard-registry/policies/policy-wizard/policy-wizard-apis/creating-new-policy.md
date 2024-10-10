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

{% swagger method="post" path="" baseUrl="/policy/push" summary="Creates a new policy. - Deprecated" %}
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

{% swagger method="post" path="" baseUrl="/wizard/push/policy" summary="Creates a new policy" %}
{% swagger-description %}
Creates a new policy by wizard. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="body" name="saveState" type="Boolean" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="policy name" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="policy description" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="topicDescription" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="policyTag" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="schemas name" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="iri" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="isApproveEnable" type="Boolean" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="isMintSchema" type="Boolean" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="mintOptions" type="Object" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="dependencySchemaIri" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="relationshipsSchemaIri" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="initialRolesFor" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="role" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="isApprover" type="Boolean" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="isCreator" type="Boolean" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="field" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="title" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="role" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="mintSchemaIri" type="String" required="true" %}

{% endswagger-parameter %}

{% swagger-parameter in="body" name="viewOnlyOwnDocuments" type="Boolean" required="true" %}

{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
          content:
            application/json:
              schema:
                type: boolean
```
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```
content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endswagger-response %}
{% endswagger %}
