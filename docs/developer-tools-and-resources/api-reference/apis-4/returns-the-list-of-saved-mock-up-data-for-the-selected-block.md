# Returns the list of saved mock-up data for the selected block

Returns the list of saved mock-up data for the selected block

<pre class="language-yaml"><code class="lang-yaml"><strong>GET /policies/{policyId}/dry-run/block/{tagName}/history
</strong></code></pre>

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name     | Type   | Description      |
| -------- | ------ | ---------------- |
| policyId | string | Policy Id        |
| tagName  | string | Block Name (tag) |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
   description: Input data.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/DebugBlockHistoryDTO'
}
```
{% endtab %}

{% tab title="401" %}
```json
{
  description: Unauthorized.
}
```
{% endtab %}

{% tab title="403" %}
```yaml
description: Forbidden.
```
{% endtab %}

{% tab title="500" %}
```yaml
description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endtab %}
{% endtabs %}
