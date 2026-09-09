# Requesting

### REQUESTS ALL VP DOCUMENTS

{% hint style="info" %}
**Note: This API is obsolete and will be deprecated in future releases. We would recommend to use policy based controlled API through policy configurator.**
{% endhint %}

## Returns a list of all VP documents

<mark style="color:blue;">`GET`</mark> `/trust-chains`

Requests all VP documents. Only users with the Auditor role are allowed to make the request

{% tabs %}
{% tab title="200: OK " %}
```javascript
{
    content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/VerifiablePresentation'
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

{% tab title="403: Forbidden " %}
```javascript
{
    // Response
}
```
{% endtab %}

{% tab title="500: Internal Server Error " %}
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
