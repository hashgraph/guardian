# Returns the list of documents in the target policy

<mark style="color:green;">`GET`</mark> `/policy-repository/{policyId}/documents`

Returns the list of documents in the target policy

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type    | Description                                                            |
| --------- | ------- | ---------------------------------------------------------------------- |
| policyId  | string  | Policy ID                                                              |
| pageIndex | number  | The number of pages to skip before starting to collect the result set. |
| pageSize  | number  | The number of items to return                                          |
| type      | string  | Type of Document                                                       |
| owner     | string  | Document Owner                                                         |
| schema    | string  | Document Schema                                                        |
| comments  | boolean | Load Comments                                                          |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
description: Successful operation.
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
                  $ref: '#/components/schemas/VcDocumentDTO'
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
description: Forbidden.
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
