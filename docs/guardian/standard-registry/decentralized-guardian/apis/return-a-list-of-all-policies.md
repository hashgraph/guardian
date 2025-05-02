# Return a list of all policies

```yaml
GET /external-policies/requests
```

```yaml
Returns all policies.
```

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description                                                                                                                                   |
| --------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| pageIndex | number | <p></p><pre class="language-yaml"><code class="lang-yaml">The number of pages to skip before starting to collect the result set
</code></pre> |
| pageSize  | number | <p></p><pre class="language-yaml"><code class="lang-yaml">The numbers of items to return
</code></pre>                                        |
| policyId  | String | Policy ID                                                                                                                                     |

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
