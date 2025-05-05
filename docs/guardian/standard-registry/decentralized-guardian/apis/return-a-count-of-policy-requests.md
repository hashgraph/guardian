# Return a count of policy requests

<pre class="language-yaml"><code class="lang-yaml"><strong>GET /external-policies/requests/count
</strong></code></pre>

```yaml
Return a count of policy requests.
```

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name     | Type   | Description |
| -------- | ------ | ----------- |
| policyId | string | Policy ID   |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
   description: Successful operation.
          content:
            application/json:
              schema:
                type: number
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
