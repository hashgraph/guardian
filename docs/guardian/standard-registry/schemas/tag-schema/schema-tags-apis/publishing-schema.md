# Publishing Schema

{% swagger method="put" path="" baseUrl="/tags/schemas/{schemaId}/publish" summary="Publishes the schema." %}
{% swagger-description %}
Publishes the schema with the provided (internal) schema ID onto IPFS, sends a message featuring IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" type="String" name="schemaId" required="true" %}
Schema ID.
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Schema"
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
