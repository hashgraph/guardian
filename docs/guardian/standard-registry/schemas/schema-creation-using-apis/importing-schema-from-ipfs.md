# Importing Schema from IPFS

<mark style="color:green;">`POST`</mark> `/schemas/{topicId}/import/message`

Imports new schema from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                      | Type   | Description |
| ----------------------------------------- | ------ | ----------- |
| topicID<mark style="color:red;">\*</mark> | String | Topic ID    |

#### Request Body

| Name                               | Type   | Description                                                                                          |
| ---------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| <mark style="color:red;">\*</mark> | Object | Object that contains the identifier of the Hedera message which contains the IPFS CID of the schema. |

{% tabs %}
{% tab title="201: Created Successful Operation" %}
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

{% tab title="422: Unprocessable Entity Unprocessable Entity" %}

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
