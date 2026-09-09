# Sends Data to Specified Block as per Tag

<mark style="color:green;">`POST`</mark> `/policies/{policyId}/tag/{tagName}/blocks`

Sends Data to Specified Block as per Tag

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name     | Type   | Description      |
| -------- | ------ | ---------------- |
| policyId | string | Policy ID        |
| tagName  | string | Block Name (Tag) |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BlockDTO'
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
