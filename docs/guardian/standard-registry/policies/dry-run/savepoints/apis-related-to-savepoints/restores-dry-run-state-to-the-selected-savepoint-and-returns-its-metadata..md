# Restores Dry Run state to the selected savepoint and returns its         metadata.

<mark style="color:green;">`PUT`</mark> `/policies/{policyId}/savepoints/{savepointId}`

Restores Dry Run state to the selected savepoint and returns its\
metadata.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name        | Type   | Description          |
| ----------- | ------ | -------------------- |
| policyId    | string | Policy Identifier    |
| savepointId | string | Savepoint Identifier |

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
```json5
{
description: Forbidden.
}

```
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
