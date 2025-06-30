# Executes the test-run of the code in the block

Executes the test-run of the code in the block

```
POST  /api/v1/policies/:policyId/dry-run/block
```

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name         | Type   | Description  |
| ------------ | ------ | ------------ |
| policyId     | string | Policy Id    |
| Block Config | json   | Block Config |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
   description: Result.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DebugBlockResultDTO'
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





