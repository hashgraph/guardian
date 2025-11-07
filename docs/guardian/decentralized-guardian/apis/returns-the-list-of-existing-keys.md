# Returns the list of existing keys

<pre class="language-yaml"><code class="lang-yaml"><strong>GET /profiles/keys
</strong></code></pre>

```yaml
Returns all keys.
```

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

<table><thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead><tbody><tr><td>pageIndex</td><td>number</td><td><p></p><pre class="language-yaml"><code class="lang-yaml">The number of pages to skip before starting to collect the result
            set
</code></pre></td></tr><tr><td>pageSize</td><td>number</td><td><p></p><pre class="language-yaml"><code class="lang-yaml">The numbers of items to return
</code></pre></td></tr><tr><td></td><td></td><td></td></tr></tbody></table>

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
                  type: string
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
