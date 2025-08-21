# Returns Map API Key

<mark style="color:blue;">`GET`</mark> `/map/key`

Returns map api key.

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```
content:
            application/json:
              schema:
                type: string
```
{% endtab %}

{% tab title="401: Unauthorized Unauthorized" %}

{% endtab %}

{% tab title="403: Forbidden Forbidden" %}

{% endtab %}

{% tab title="500: Internal Server Error Internal Server Error" %}
```
content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```
{% endtab %}
{% endtabs %}
