# Returns the list of requests for adding remote policies

GET _/api/v1/external-policies/_

Returns the list of requests for adding remote policies

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description                                                                                                                                    |
| --------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| pageIndex | number | <p></p><pre class="language-yaml"><code class="lang-yaml"> The number of pages to skip before starting to collect the result set
</code></pre> |
| pageSize  | number | <p></p><pre class="language-yaml"><code class="lang-yaml">The numbers of items to return
</code></pre>                                         |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  description: Successful operation.
          headers:
            X-Total-Count:
              schema:
                type: integer
              description: Total items in the collection.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ExternalPolicyDTO'
}
```
{% endtab %}

{% tab title="401" %}
```json
{
  description: Unauthorized
}
```
{% endtab %}

{% tab title="403" %}
<pre class="language-yaml"><code class="lang-yaml"><strong>{
</strong><strong>description: Forbidden
</strong><strong>}
</strong></code></pre>
{% endtab %}

{% tab title="500" %}
```
{
description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
  }
```
{% endtab %}
{% endtabs %}
