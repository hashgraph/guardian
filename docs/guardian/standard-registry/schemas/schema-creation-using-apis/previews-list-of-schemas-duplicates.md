# Previews list of schemas duplicates

<mark style="color:green;">`POST`</mark> `/schemas/import/schemas/duplicates`

Previews list of schema duplicates. Only users with the Standard Registry role are allowed to make the request.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name                                          | Type   | Description              |
| --------------------------------------------- | ------ | ------------------------ |
| schemaNames<mark style="color:red;">\*</mark> | string | An array of schema names |
| policyId<mark style="color:red;">\*</mark>    | String | Policy ID                |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
{
  description: Successful operation.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/SchemaDTO'
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
