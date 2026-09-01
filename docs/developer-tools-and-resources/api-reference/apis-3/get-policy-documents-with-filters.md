# Get policy documents with filters

```yaml
Get policy documents with filters
```

```yaml
GET /policies/{policyId}/search-documents
```

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name       | Type   | Description                                                 |
| ---------- | ------ | ----------------------------------------------------------- |
| policyId   | string | Policy ID                                                   |
| textSearch | string | Text Search                                                 |
| schemas    | string | Schemas                                                     |
| owners     | string | Owners                                                      |
| tokens     | string | Tokens                                                      |
| related    | string | Related                                                     |
| pageIndex  | number | The number of pages to skip before starting the result set. |
| pageSize   | number | The number of items to return                               |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  description: Documents.
          headers:
            X-Total-Count:
              schema:
                type: integer
              description: Total items in the collection.
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
}
```
{% endtab %}

{% tab title="401" %}
```json
{
  description: Unauthorized.
}
```
{% endtab %}

{% tab title="403" %}
{

```yaml
description: Forbidden.
```

}
{% endtab %}

{% tab title="500" %}
{

```yaml
 description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
```

}
{% endtab %}
{% endtabs %}

