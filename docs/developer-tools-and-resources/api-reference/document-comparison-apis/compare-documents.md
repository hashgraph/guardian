# Compare Documents

## Compare documents.

<mark style="color:green;">`POST`</mark> `/analytics/compare/documents`&#x20;

Compare documents. Only users with the Standard Registry role are allowed to make the request.

#### Request Body

| Name                                          | Type   | Description |
| --------------------------------------------- | ------ | ----------- |
| documentIds<mark style="color:red;">\*</mark> | String | Filters     |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```
 content:
            application/json:
              schema:
                $ref: '#/components/schemas/CompareDocumentsDTO'
```
{% endtab %}

{% tab title="401: Unauthorized Unauthorized" %}

{% endtab %}

{% tab title="403: Forbidden Forbidden" %}

{% endtab %}

{% tab title="500: Internal Server Error Internal Server Error" %}
```
content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endtab %}
{% endtabs %}
