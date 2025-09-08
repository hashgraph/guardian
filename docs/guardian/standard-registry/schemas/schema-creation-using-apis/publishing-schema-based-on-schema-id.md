# Publishing Schema based on Schema ID

<mark style="color:orange;">`PUT`</mark> `/schemas/{schemaId}/publish`

Publishes the schema with the provided (internal) schema ID onto IPFS, sends a message featuring IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| schemaID<mark style="color:red;">\*</mark> | String | Schema ID   |

#### Request Body

| Name                                      | Type   | Description                         |
| ----------------------------------------- | ------ | ----------------------------------- |
| version<mark style="color:red;">\*</mark> | Object | Object that contains policy version |

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

{% tab title="422: Unprocessable Entity " %}

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
