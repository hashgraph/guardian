# Policy Import from IPFS

<pre class="language-yaml"><code class="lang-yaml"><strong>POST /external-policies/import
</strong></code></pre>

```yaml
Imports the policy from IPFS without loading it into the local DB.
```

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  description: Policy.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExternalPolicyDTO'
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
```
{
description: Forbidden.
}
```
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
