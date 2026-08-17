# Restores the user’s participation in the policy after disconnection

<mark style="color:green;">`PUT`</mark> `/policies/{policyId}/reconnect`

Restores the user’s participation in the policy after disconnection

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name     | Type   | Description |
| -------- | ------ | ----------- |
| policyID | string | Policy ID   |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
description: Successful operation.
          content:
            application/json:
              schema:
                type: array
                items:
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
