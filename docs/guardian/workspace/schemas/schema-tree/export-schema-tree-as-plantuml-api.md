# Export Schema Tree in PlantUML Format

## Returns schema tree in PlantUML format.

<mark style="color:blue;">`GET`</mark> `/schema/{schemaId}/tree/export/plantuml`

Returns the schema tree as exportable PlantUML code. The response is a plain-text `.puml` file. Users with the `SCHEMAS_SCHEMA_READ` permission are allowed to make the request.

#### Path Parameters

| Name                                       | Type   | Description       |
| ------------------------------------------ | ------ | ----------------- |
| schemaId<mark style="color:red;">\*</mark> | String | Schema identifier |

#### Query Parameters

| Name                | Type    | Description                                                             |
| ------------------- | ------- | ----------------------------------------------------------------------- |
| includeFields       | Boolean | Include field names and descriptions in classes. Defaults to `true`.    |
| includeFormulas     | Boolean | Include formula components and links. Defaults to `false`.             |
| includeDependencies | Boolean | Include dependent formulas referenced by linked formulas. Defaults to `false`. Requires `includeFormulas=true`. |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```
content:
            text/plain:
              schema:
                type: string
              headers:
                Content-Disposition:
                  schema:
                    type: string
                    example: attachment; filename="schema-tree-{schemaId}.puml"
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
