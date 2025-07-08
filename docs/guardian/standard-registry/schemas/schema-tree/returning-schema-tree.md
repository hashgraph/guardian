# API for Returning Schema Tree

## Returns schema tree.

<mark style="color:blue;">`GET`</mark> `/schema/{schemaId}/tree`

Returns schema tree.

#### Path Parameters

| Name                                       | Type   | Description       |
| ------------------------------------------ | ------ | ----------------- |
| schemaId<mark style="color:red;">\*</mark> | String | Schema identifier |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```
content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string
                  type:
                    type: string
                  children:
                    type: array
                    items:
                      type: object
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
