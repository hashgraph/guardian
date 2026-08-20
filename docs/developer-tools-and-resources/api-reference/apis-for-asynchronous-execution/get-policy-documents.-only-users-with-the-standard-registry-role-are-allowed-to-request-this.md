# Get policy documents. Only users with the Standard Registry role are         allowed to request this

<mark style="color:green;">`GET`</mark> `/policies/{policyId}/documents`

Get policy documents. Only users with the Standard Registry role are\
allowed to make the request.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name            | Type    | Description                                                                     |
| --------------- | ------- | ------------------------------------------------------------------------------- |
| policyId        | string  | Policy Identifier                                                               |
| type            | string  | document Type                                                                   |
| includeDocument | boolean | Include Document type or not                                                    |
| pageIndex       | number  | <p>The number of pages to skip before starting to collect the result<br>set</p> |
| pageSize        | number  | The numbers of items to return                                                  |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
{
   description: Documents.
          headers:
            X-Total-Count:
              schema:
                type: integer
              description: Total items in the collection.
          content:
            application/json:
              schema:
                type: array
                items:
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
