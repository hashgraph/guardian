# Get policy document owners

```yaml
GET /policies/{policyId}/document-owners
```

```yaml
Get policy document owners.
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
   description: Owner Ids.
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
{

```yaml
description: Forbidden.
```

}
{% endtab %}

{% tab title="500" %}
{

```yaml
description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
```

}
{% endtab %}
{% endtabs %}
