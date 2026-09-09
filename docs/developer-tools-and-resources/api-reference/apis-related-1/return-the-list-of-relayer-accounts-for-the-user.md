# Return the list of Relayer Accounts for the user

<mark style="color:green;">`GET`</mark> `/api/v1/relayer-accounts/accounts`

Return the list of Relayer Accounts for the user. If the active user is a Standard Registry return the list of all Relayer Accounts of its users.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description                                                                     |
| --------- | ------ | ------------------------------------------------------------------------------- |
| pageIndex | number | <p>The number of pages to skip before starting to collect the result<br>set</p> |
| pageSize  | number | The numbers of items to return                                                  |
| search    | string | Search                                                                          |

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
