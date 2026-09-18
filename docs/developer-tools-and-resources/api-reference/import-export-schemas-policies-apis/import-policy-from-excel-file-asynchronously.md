# Asynchronously Imports Schemas in Excel file format into a policy

## Asynchronously imports schemas in Excel file format into a policy

<mark style="color:green;">`POST`</mark> `/api/v1/policies/push/import/xlsx?policyId=<policyId>`

Asynchronously imports schemas in Excel file format into a policy. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                       | Type   | Description       |
| ------------------------------------------ | ------ | ----------------- |
| policyId<mark style="color:red;">\*</mark> | String | Policy Identifier |
| schemas<mark style="color:red;">\*</mark>  | string | Schemas           |

#### Request Body

| Name                               | Type   | Description                           |
| ---------------------------------- | ------ | ------------------------------------- |
| <mark style="color:red;">\*</mark> | String | A xlsx file containing policy config. |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```
content:
            application/json:
              schema:
                type: object
```
{% endtab %}

{% tab title="401: Unauthorized Unauthorized" %}

{% endtab %}

{% tab title="403: Forbidden Forbidden" %}

{% endtab %}

{% tab title="500: Internal Server Error Internal Server Error" %}
```
content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endtab %}
{% endtabs %}
