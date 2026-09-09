# Approves Policy

```yaml
POST /external-policies/{messageId}/approve
```

```yaml
Approves policy for the specified policy ID.
```

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description       |
| --------- | ------ | ----------------- |
| messageId | string | Policy Message ID |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
   description: Successful operation.
          content:
            application/json:
              schema:
                type: boolean
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
