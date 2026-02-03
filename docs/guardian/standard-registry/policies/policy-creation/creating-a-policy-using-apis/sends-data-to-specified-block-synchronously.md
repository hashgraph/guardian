# Sends Data to Specified Block Synchronously

<mark style="color:green;">`POST`</mark> `/policies/{policyId}/blocks/{uuid}/sync-events`

Sends Data to Specified Block Synchronously

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name       | Type   | Description      |
| ---------- | ------ | ---------------- |
| policyId\* | string | Policy ID        |
| uuid\*     | string | Block Identifier |
| history    | string | History          |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ResponseDTOWithSyncEvents'
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
