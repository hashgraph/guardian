# Deletes the specified savepoints for the policy (Dry Run only).

<mark style="color:red;">`DELETE`</mark> `/policies/{policyId}/savepoints`

Deletes the specified savepoints for the policy (Dry Run only).

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name         | Type   | Description       |
| ------------ | ------ | ----------------- |
| policyId     | string | Policy Identifier |
| savepointIds | object | Ids of savepoint  |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
{
  description: Successful operation.
}
```
{% endtab %}

{% tab title="401" %}
```json5
{
   description: Unauthorized.
}
```
{% endtab %}

{% tab title="403" %}
<pre class="language-json5"><code class="lang-json5">{
<strong>description: Forbidden.
</strong>}
</code></pre>
{% endtab %}

{% tab title="500" %}
```json5
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
