# Get Contract Permissions

## &#x20;Get contract permissions.

<mark style="color:blue;">`GET`</mark> `/contracts/{contractId}/permissions`

Get smart-contract permissions. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                         | Type   | Description         |
| -------------------------------------------- | ------ | ------------------- |
| contractID<mark style="color:red;">\*</mark> | String | Contract Identifier |

{% tabs %}
{% tab title="200: OK Contract Permissions" %}
```
content:
            application/json:
              schema:
                type: number
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
