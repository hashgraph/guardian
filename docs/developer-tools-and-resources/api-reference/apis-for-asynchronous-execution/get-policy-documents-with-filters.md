# Get policy documents with filters

<mark style="color:green;">`GET`</mark> `/policies/{policyId}/search-documents`

Get policy documents with filters.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name       | Type   | Description                                                                     |
| ---------- | ------ | ------------------------------------------------------------------------------- |
| policyId   | string | Policy Identifier                                                               |
| textSearch | string | Text search                                                                     |
| schemas    | string | Schemas                                                                         |
| owners     | string | Owners                                                                          |
| tokens     | string | Tokens                                                                          |
| related    | string | Related                                                                         |
| pageIndex  | number | <p>The number of pages to skip before starting to collect the result<br>set</p> |
| pageSize   | number | The numbers of items to return                                                  |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
{
  '200':
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
                  type: string
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
