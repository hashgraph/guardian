# Returns migration runs

<mark style="color:red;">`GET`</mark> `/policies/migrate-data/runs`

Returns migration runs.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description       |
| --------- | ------ | ----------------- |
| pageIndex | number | Index of the page |
| pageSize  | number | Page Size         |
| status    | string | Migration status  |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
description: Migration runs.
        content:
          application/json:
            schema:
              $ref: ‘#/components/schemas/MigrationRunsResponseDTO’
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
              $ref: ‘#/components/schemas/InternalServerErrorDTO’
```
{% endtab %}
{% endtabs %}
