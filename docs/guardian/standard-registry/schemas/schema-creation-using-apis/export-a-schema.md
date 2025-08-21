# Export message IDs of Schema

<mark style="color:green;">`POST`</mark> `/schemas/{schemaId}/export/message`

Returns Hedera message IDs of the published schemas, these messages contain IPFS CIDs of these schema files. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                       | Type   | Description        |
| ------------------------------------------ | ------ | ------------------ |
| schemaID<mark style="color:red;">\*</mark> | String | Selected schema ID |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: "#/components/schemas/ExportSchema"
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
