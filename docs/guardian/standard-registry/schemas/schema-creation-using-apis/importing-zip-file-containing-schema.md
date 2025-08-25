# Importing Zip file containing Schema

<mark style="color:green;">`POST`</mark> `/schemas/{topicId}/import/file`

Imports new schema from a zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.

#### Path Parameters

| Name                                      | Type    | Description |
| ----------------------------------------- | ------- | ----------- |
| topicId<mark style="color:red;">\*</mark> | Integer | Topic ID    |

#### Request Body

| Name                               | Type | Description                                 |
| ---------------------------------- | ---- | ------------------------------------------- |
| <mark style="color:red;">\*</mark> | file | A zip file containing schema to be imported |

{% tabs %}
{% tab title="201: Created Successful Operation" %}
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

{% tab title="422: Unprocessable Entity Unprocessable Entity" %}

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
