# Creates a new key

`Post``         `_`/api/v1/profiles/keys`_

```yaml
Create policy key.
```

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

<table><thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead><tbody><tr><td><ul class="contains-task-list"><li><input type="checkbox">DID</li></ul></td><td>string</td><td><p></p><p></p><pre class="language-yaml"><code class="lang-yaml">DID Document and keys.
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
