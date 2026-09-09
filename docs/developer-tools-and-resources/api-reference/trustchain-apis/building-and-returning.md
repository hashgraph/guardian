# Building and returning

### BUILDING AND RETURNING A TRUSTCHAIN

{% hint style="info" %}
**Note: This API is obsolete and will be deprecated in future releases. We would recommend to use policy based controlled API through policy configurator.**
{% endhint %}

## Returns a trustchain for a VP document

<mark style="color:blue;">`GET`</mark> `/trust-chains/{hash}`

Builds and returns a trustchain, from the VP to the root VC document. Only users with the Auditor role are allowed to make the request.

#### Path Parameters

| Name                                   | Type   | Description                 |
| -------------------------------------- | ------ | --------------------------- |
| hash<mark style="color:red;">\*</mark> | String | Hash or ID of a VP document |

{% tabs %}
{% tab title="200: OK " %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/TrustChains'
}
```
{% endtab %}

{% tab title="401: Unauthorized " %}
```javascript
{
    // Response
}
```
{% endtab %}

{% tab title="403: Forbidden " %}
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
