# Rejects policy Asynchronously

```yaml
POST /external-policies/push/{messageId}/reject
```

```yaml
Rejects policy for the specified policy ID.
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
                $ref: '#/components/schemas/TaskDTO'
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
