# Sends Data from an External Source

{% openapi src="../../../../.gitbook/assets/swagger (2) (2).yaml" path="/external/{policyId}/{blockTag}" method="post" %}
[swagger (2) (2).yaml](<../../../../.gitbook/assets/swagger (2) (2).yaml>)
{% endopenapi %}

<mark style="color:green;">`POST`</mark> `/external/{policyId}/{blockTag}/sync-events`

Sends Data from an external source

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

<table><thead><tr><th width="248.7265625">Name</th><th>Type</th><th>Description</th></tr></thead><tbody><tr><td>policyId</td><td>string</td><td>Policy ID</td></tr><tr><td>blockTag</td><td>string</td><td>Block Tag</td></tr><tr><td>history</td><td>string</td><td>History</td></tr></tbody></table>

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

<mark style="color:green;">`POST`</mark> `/external/sync-events`

Sends Data from External Source

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description |
| --------- | ------ | ----------- |
| `history` | string | History     |

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
