# Returns the list of Relayer Accounts available for use in the Policy by the active user

<mark style="color:green;">`GET`</mark> `/relayer-accounts/all`

Returns the list of Relayer Accounts available for use in the Policy by the active user

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

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
