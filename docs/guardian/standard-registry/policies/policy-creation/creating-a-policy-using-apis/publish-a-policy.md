# Publish a Policy

### PUBLISH POLICY USING SPECIFIED POLICY ID

## Publishes the policy onto IPFS

<mark style="color:orange;">`PUT`</mark> `/policies/{policyId}/publish`

Publishes the policy with the specified (internal) policy ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                       | Type    | Description           |
| ------------------------------------------ | ------- | --------------------- |
| policyID<mark style="color:red;">\*</mark> | String  | Selected policy ID    |
| recordingEnabled                           | Boolean | Record policy actions |

#### Request Body

| Name                                            | Type   | Description                         |
| ----------------------------------------------- | ------ | ----------------------------------- |
| policyVersion<mark style="color:red;">\*</mark> | Object | Object that contains policy version |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/PublishPolicy'
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
