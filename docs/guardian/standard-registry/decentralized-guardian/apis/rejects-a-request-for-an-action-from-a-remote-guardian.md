# Rejects a request for an action from a remote Guardian

<pre class="language-yaml"><code class="lang-yaml"><strong>PUT /external-policies/requests/{messageId}/reject
</strong></code></pre>

```yaml
Updates schema rule
```

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

<table><thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead><tbody><tr><td>messageID</td><td>string</td><td><p></p><pre class="language-yaml"><code class="lang-yaml">Schema Rule Identifier
</code></pre></td></tr></tbody></table>

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PolicyDTO'
}
```
{% endtab %}

{% tab title="400" %}
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
