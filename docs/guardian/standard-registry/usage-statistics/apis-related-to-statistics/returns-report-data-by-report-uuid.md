# Returns report data by report uuid

{% swagger method="get" path="" baseUrl="/analytics/reports/{uuid}" summary="Returns report data by report uuid" %}
{% swagger-description %}
Returns report data by report uuid
{% endswagger-description %}

{% swagger-parameter in="path" name="uuid" required="true" type="String" %}
Report Identifier
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
<pre><code><strong>content:
</strong>            application/json:
              schema:
                "$ref": "#/components/schemas/DataContainerDTO"
</code></pre>
{% endswagger-response %}

{% swagger-response status="500: Internal Server Error" description="Internal Server Error" %}
```
 content:
            application/json:
              schema:
                "$ref": "#/components/schemas/InternalServerErrorDTO"
```
{% endswagger-response %}
{% endswagger %}
