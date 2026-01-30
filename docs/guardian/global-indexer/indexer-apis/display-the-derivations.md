# Display the derivations

<mark style="color:red;">`GET`</mark> `/analytics/derivations/{messageId}`

Display the derivations made to original policy

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name            | Type   | Description      |
| --------------- | ------ | ---------------- |
| messageId       | string | Message ID       |
| pageIndex       | string | Page Index       |
| pageSize        | string | Size of the page |
| orderField      | string | Order number     |
| orderDir        | string | Order Directory  |
| keywords        | string | keywords         |
| topicId         | string | Topic ID         |
| options.owner   | string | Owner Options    |
| analytics.tools | string | Tools            |

**Response**

{% tabs %}
{% tab title="500" %}
```json5
description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InternalServerErrorDTO'
```
{% endtab %}
{% endtabs %}
