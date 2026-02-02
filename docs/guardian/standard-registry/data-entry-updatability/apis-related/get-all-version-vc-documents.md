# Get all version VC documents

<mark style="color:red;">`GET`</mark> `/policies/{policyId}/get-all-version-vc-documents/{documentId}`

Get all version VC documents.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name         | Type   | Description |
| ------------ | ------ | ----------- |
| policyId\*   | string | Policy ID   |
| documentId\* | string | Document ID |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
{
  description: Successful operation.
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
description: Forbidden.
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
