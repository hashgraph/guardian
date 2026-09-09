# Asynchronously Imports Schemas in Excel file format into a policy

## Asynchronously imports schemas in Excel file format into a policy.

<mark style="color:green;">`POST`</mark> `/schemas/push/{topicId}/import/xlsx`

Asynchronously imports schemas in Excel file format into a policy. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                      | Type   | Description |
| ----------------------------------------- | ------ | ----------- |
| topicId<mark style="color:red;">\*</mark> | String | Topic ID    |
| schemas<mark style="color:red;">\*</mark> | String | Schemas     |

#### Request Body

| Name                                   | Type   | Description                           |
| -------------------------------------- | ------ | ------------------------------------- |
| xlsx<mark style="color:red;">\*</mark> | String | A xlsx file containing schema config. |

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
