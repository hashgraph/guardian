# Return the list of VC documents which are associated with the selected Relayer Account

<mark style="color:green;">`GET`</mark> `/relayer-accounts/{relayerAccountId}/relationships`

Return the list of VC documents which are associated with the selected Relayer Account

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name             | Type   | Description                                                                     |
| ---------------- | ------ | ------------------------------------------------------------------------------- |
| relayerAccountId | string | Relayer Account ID                                                              |
| pageIndex        | number | <p>The number of pages to skip before starting to collect the result<br>set</p> |
| pageSize         | number | The numbers of items to return                                                  |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
{
  description: Successful operation.
          content:
            application/json:
              schema:
                type: object
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
