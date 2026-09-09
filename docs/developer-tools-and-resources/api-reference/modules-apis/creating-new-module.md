# Creating new Module

## Creates a new module.

<mark style="color:green;">`POST`</mark> `/modules`

Creates a new module. Only users with the Standard Registry role are allowed to make the request.

#### Request Body

| Name                               | Type | Description                               |
| ---------------------------------- | ---- | ----------------------------------------- |
| <mark style="color:red;">\*</mark> | Json | Object that contains module configuration |

{% tabs %}
{% tab title="201: Created Successful Operation" %}
\\\`\\\`\\\`\\\`scheme \\\`\\\`\\\`typescript { createDate: string updateDate: string \\\_id: string name: string description: string config: Config creator: string owner: string type: string status: string uuid: string codeVersion: string configFileId: string id: string } \\\`\\\`\\\` \\\`\\\`\\\`\\\` \\\{% endtab %\\}

\{% tab title="401: Unauthorized Unauthorized" %\} \`

\`\`javascript { // Response }

````

</div>

<div data-gb-custom-block data-tag="tab" data-title='403: Forbidden Forbidden'>

```javascript
{
    // Response
}
````

\{% endtab %\}

\{% tab title="422: Unprocessable Entity Unprocessable Entity" %\}

```
Invalid module config
```

\{% endtab %\}

\{% tab title="500: Internal Server Error Internal Server Error" %\}

```

javascript
{
   content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
}
```
{% endtab %}
{% endtabs %}
