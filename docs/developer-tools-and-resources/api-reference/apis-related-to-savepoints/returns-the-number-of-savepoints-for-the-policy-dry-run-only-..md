# Returns the number of savepoints for the policy (Dry Run only).

<mark style="color:green;">`GET`</mark> `/policies/{policyId}/savepoints/count`

Returns the number of savepoints for the policy (Dry Run only).

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name           | Type    | Description                     |
| -------------- | ------- | ------------------------------- |
| policyId       | string  | Policy Identifier               |
| includeDeleted | boolean | to be included to delete or not |

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
  description: Unauthorized."
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
