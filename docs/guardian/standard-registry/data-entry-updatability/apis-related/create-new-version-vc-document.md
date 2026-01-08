# Create new version vc document

<mark style="color:green;">`POST`</mark> /policies/{policyId}/create-new-version-vc-document

Create new version VC document

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name       | Type   | Description |
| ---------- | ------ | ----------- |
| policyId\* | string | Policy ID   |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
description: Successful operation.
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
