# Returns user information for the selected token

<mark style="color:green;">`GET`</mark> `/tokens/{tokenId}/relayer-accounts/{relayerAccountId}/info`

Returns user information for the selected token. Only users with the\
Standard Registry role are allowed to make the request.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name             | Type   | Description        |
| ---------------- | ------ | ------------------ |
| tokenId          | string | Token ID           |
| relayerAccountId | string | Relayer Account ID |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
{
 description: Successful operation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TokenInfoDTO'
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
