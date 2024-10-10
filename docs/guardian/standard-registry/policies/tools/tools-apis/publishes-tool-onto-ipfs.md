# Publishes Tool onto IPFS

{% swagger method="put" path="" baseUrl="/tools/{id}/publish" summary="Publishes the tool onto IPFS." %}
{% swagger-description %}
Publishes the tool with the specified (internal) tool ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="id" type="String" required="true" %}
Tool ID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                $ref: '#/components/schemas/ToolDTO'
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
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endswagger-response %}
{% endswagger %}
