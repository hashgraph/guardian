# Deletes the key with the specified ID

```yaml
delete /profiles/keys/{id}
```

```yaml
Deletes the key with the provided ID.
```

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name | Type   | Description                                                                            |
| ---- | ------ | -------------------------------------------------------------------------------------- |
| id   | string | <p></p><pre class="language-yaml"><code class="lang-yaml">Key Identifier
</code></pre> |

**Response**

{% tabs %}
{% tab title="200" %}
```json
{
  description: Successful operation.
          content:
            application/json:
              schema:
                type: boolean
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
```
{

description: Forbidden.

}
```
{% endtab %}

{% tab title="500" %}
```
{
description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
}
```
{% endtab %}
{% endtabs %}
