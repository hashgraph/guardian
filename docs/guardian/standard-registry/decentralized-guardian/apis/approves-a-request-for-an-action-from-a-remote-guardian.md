# Approves a request for an action from a remote Guardian

```yaml
PUT /external-policies/requests/{messageId}/approve
```

```yaml
Updates schema rule configuration for the specified rule ID.
```

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description                                                                                    |
| --------- | ------ | ---------------------------------------------------------------------------------------------- |
| messageId | string | <p></p><pre class="language-yaml"><code class="lang-yaml">Schema Rule Identifier
</code></pre> |

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
