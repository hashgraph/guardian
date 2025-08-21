# Exports Schema Differentiation Results

<mark style="color:green;">`POST`</mark> `/analytics/compare/schemas/export`

Returns the result of comparing two schemas. Only users with the Standard Registry role are allowed to make the request.

#### Query Parameters

| Name                                   | Type   | Description |
| -------------------------------------- | ------ | ----------- |
| type<mark style="color:red;">\*</mark> | String | File Type   |

#### Request Body

| Name      | Type   | Description                   |
| --------- | ------ | ----------------------------- |
| schemaId1 | String | Schema Identifier 1           |
| schemaId2 | String | Schema Identifier 2           |
| idLvl     | String | UUID comparison setting (0/1) |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                type: string
}
```
{% endtab %}

{% tab title="401: Unauthorized Unauthorized" %}
```javascript
{
    // Response
}
```
{% endtab %}

{% tab title="403: Forbidden Forbidden" %}
```javascript
{
    // Response
}
```
{% endtab %}

{% tab title="500: Internal Server Error Internal Server Error" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
}
```
{% endtab %}
{% endtabs %}
