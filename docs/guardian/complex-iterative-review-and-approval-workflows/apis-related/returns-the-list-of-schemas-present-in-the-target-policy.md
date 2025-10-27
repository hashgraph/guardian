# Returns the list of schemas present in the target policy

<mark style="color:green;">`GET`</mark> `/policy-repository/{policyId}/schemas`

Returns the list of schemas present in the target policy

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name     | Type   | Description |
| -------- | ------ | ----------- |
| policyId | string | Policy ID   |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
description: Successful operation.
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
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
