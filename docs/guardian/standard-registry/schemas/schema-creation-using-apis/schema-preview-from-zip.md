# Schema Preview from Zip

<mark style="color:green;">`POST`</mark> `/schemas/import/file/preview`

Previews the schema from a zip file. Only users with the Standard Registry role are allowed to make the request.

#### Request Body

| Name                               | Type | Description                                   |
| ---------------------------------- | ---- | --------------------------------------------- |
| <mark style="color:red;">\*</mark> |      | A zip file containing the schema to be viewed |

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
