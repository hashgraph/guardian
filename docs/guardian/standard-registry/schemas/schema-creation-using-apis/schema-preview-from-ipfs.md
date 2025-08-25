# Schema Preview from IPFS

<mark style="color:green;">`POST`</mark> `/schemas/import/message/preview`

Previews the schema from IPFS without loading it into the local DB. Only users with the Standard Registry role are allowed to make the request.

#### Request Body

| Name                               | Type   | Description                                                                                         |
| ---------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| <mark style="color:red;">\*</mark> | Object | Object that contains the identifier of the Hedera message which contains the IPFS CID of the schema |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Schema'
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
