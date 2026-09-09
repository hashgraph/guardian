# Creation of Schema

<mark style="color:green;">`POST`</mark> `/schemas/push/{topicId}`

Creates new schema. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                      | Type   | Description |
| ----------------------------------------- | ------ | ----------- |
| topicId<mark style="color:red;">\*</mark> | String | Topic ID    |

#### Request Body

| Name                               | Type   | Description                          |
| ---------------------------------- | ------ | ------------------------------------ |
| <mark style="color:red;">\*</mark> | String | Object that contains a valid schema. |

{% tabs %}
{% tab title="202: Accepted Accepted" %}
```javascript
{
    content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
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
