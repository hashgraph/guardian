# Importing Schema from IPFS

<mark style="color:green;">`POST`</mark> `/schemas/push/{topicId}/import/message`

Imports new schema from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                      | Type   | Description |
| ----------------------------------------- | ------ | ----------- |
| topicId<mark style="color:red;">\*</mark> | String | Topic ID    |
| schemas<mark style="color:red;">\*</mark> | String | schema      |

#### Request Body

| Name                                        | Type   | Description                                                                                          |
| ------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| messageId<mark style="color:red;">\*</mark> | String | Object that contains the identifier of the Hedera message which contains the IPFS CID of the schema. |

{% tabs %}
{% tab title="202: Accepted Accepted" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
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
