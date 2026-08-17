# Makes the selected group active. if UUID is not set then returns the         user to the default sta

<mark style="color:green;">`POST`</mark> `/policies/{policyId}/groups`

Makes the selected group active. if UUID is not set then returns the\
user to the default state.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name     | Type   | Description       |
| -------- | ------ | ----------------- |
| policyId | string | Policy Identifier |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
{
  description: Successful operation.
          content:
            application/json:
              schema:
                type: object
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
