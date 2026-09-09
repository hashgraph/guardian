# Disconnects the user from the selected remote policy on the current Guardian instance only.

<mark style="color:green;">`PUT`</mark> `/external-policies/{messageId}/disconnect`

Disconnects the user from the selected remote policy on the current Guardian instance only

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type    | Description                                                                                                                                                        |
| --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| messageId | string  | Message ID                                                                                                                                                         |
| full      | Boolean | Disconnects the user from the selected remote policy on the current Guardian instance and from the same policy on the Main Guardian instance where it is deployed. |

**Response**

{% tabs %}
{% tab title="200" %}
```json5
description: Successful operation.
          content:
            application/json:
              schema:
                type: array
                items:
                  type: boolean
```
{% endtab %}

{% tab title="401" %}
```json5
description: Unauthorized.
```
{% endtab %}

{% tab title="403" %}
```json5
description: Forbidden.
```
{% endtab %}

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
