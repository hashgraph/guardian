# Run formula without making any persistent changes or executing         transaction.

<mark style="color:red;">`PUT`</mark> `/formulas/{formulaId}/dry-run`

Run formula without making any persistent changes or executing transaction

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description        |
| --------- | ------ | ------------------ |
| formulaId | string | Formula Identifier |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
 description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FormulaDTO'
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
