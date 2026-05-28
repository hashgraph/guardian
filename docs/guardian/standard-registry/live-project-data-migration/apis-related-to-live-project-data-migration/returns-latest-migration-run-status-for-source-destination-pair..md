# Returns latest migration run status for source/destination pair.

<mark style="color:red;">`GET`</mark> `/policies/migrate-data/status`

Returns latest migration run status for source/destination pair. Only users with the Standard Registry role are allowed to make the request.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name        | Type   | Description           |
| ----------- | ------ | --------------------- |
| srcPolicyId | string | Source Policy ID      |
| dstPolicyId | string | Destination Policy ID |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
description: Migration run status.
        content:
          application/json:
            schema:
              $ref: ‘#/components/schemas/MigrationStatusResponseDTO’
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
