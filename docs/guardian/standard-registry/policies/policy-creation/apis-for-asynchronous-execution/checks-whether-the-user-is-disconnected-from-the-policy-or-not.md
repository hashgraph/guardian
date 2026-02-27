# Checks whether the user is disconnected from the policy or not

<mark style="color:red;">`GET`</mark> `/policies/{policyId}/disconnected`

Checks whether the user is disconnected from the policy or not

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
description: Policy configuration.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PolicyDTO'
```
{% endtab %}

{% tab title="401" %}
```json5
description: Unauthorized.
```
{% endtab %}

{% tab title="403" %}
```json5
description: Forbidden.
```
{% endtab %}

{% tab title="500" %}
```json5
description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endtab %}
{% endtabs %}
