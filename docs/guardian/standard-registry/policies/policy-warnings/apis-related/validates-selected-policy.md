# Validates selected policy

<mark style="color:green;">`POST`</mark> `/policies/validate`

Validates selected policy. Only users with the Standard Registry role\
are allowed to make the request.

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
  description: Validation result.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PolicyValidationDTO'
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
