# groupManagerBlock

This block allows to manage group membership, add and remove users from the group.

### 1. Properties

| Block Property   | Definition                                                                        | Example Input                                                                               | Status |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ |
| tag              | Unique name for the logic block.                                                  | groupManagerBlock                                                                           |        |
| permissions      | Which entity has rights to interact at this part of the workflow.                 | NoRole                                                                                      |        |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                                                                       |        |
| On errors        | Called if the system error has occurs in the Block                                | <p></p><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul>       |        |
| Stop Propagation | End processing here, don't pass control to the next block.                        | Checked or unchecked.                                                                       |        |
| Can Invite       | specifies who can create invites                                                  | <p>· Group Owner – only the creator of the group</p><p>· All – all members of the group</p> |        |
| Can Delete       | specifies who can remove users from the group                                     | <p>· Group Owner – only the creator of the group</p><p>. All – all members of the group</p> |        |



<figure><img src="../.gitbook/assets/image (23) (4).png" alt=""><figcaption></figcaption></figure>

### 2. Usage

#### 2.1  **List of the groups in which the user is included:**

<figure><img src="../.gitbook/assets/image (13) (4) (1).png" alt=""><figcaption></figcaption></figure>

#### **2.2  List of the users included in the group**

<figure><img src="../.gitbook/assets/image (33) (2).png" alt=""><figcaption></figcaption></figure>

#### **2.3  Inviting users to groups**

First step is to select the role to invite the user as shown below:

<figure><img src="../.gitbook/assets/image (34) (1).png" alt=""><figcaption></figcaption></figure>

Next step is to copy and send the unique invite or the link to the invite.

<figure><img src="../.gitbook/assets/image (35).png" alt=""><figcaption></figcaption></figure>

#### 2.4  **Removing users from groups**

<figure><img src="../.gitbook/assets/image (1) (3) (2) (1).png" alt=""><figcaption></figcaption></figure>

### API Parameters

{% swagger method="get" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Block UUID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
  "data": [
    {
      "id": "6b3efd88-037c-4335-a4d1-02776e23973c",
      "role": "VVB(manager)",
      "groupName": "VVBs",
      "groupLabel": "vvb_group1",
      "type": "Owner",
      "groupRelationshipType": "Multiple",
      "groupAccessType": "Private",
      "canInvite": true,
      "canDelete": true,
      "roles": [
        "VVB"
      ],
      "data": [
        {
          "did": "did:hedera:testnet:HdSCbrXJjjfvzymnnzzybNVWQGGGY48p6JGo6Ao5UHnT_0.0.3075949",
          "username": "Virtual User 1",
          "role": "VVB(manager)",
          "type": "Owner",
          "current": true
        },
        {
          "did": "did:hedera:testnet:CJotqpGfK9zVqDHgjtkHg5EPvkTShQVc3hZjojw8St3N_0.0.3075949",
          "username": "Virtual User 2",
          "role": "VVB",
          "type": "Member",
          "current": false
        }
      ]
    }
  ]
}


```
{% endswagger-response %}
{% endswagger %}

{% swagger method="post" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Block UUID
{% endswagger-parameter %}

{% swagger-parameter in="body" name="action" type="String" required="true" %}
invite/delete
{% endswagger-parameter %}

{% swagger-parameter in="body" name="role" type="String" required="true" %}
role
{% endswagger-parameter %}

{% swagger-parameter in="body" name="group" type="String" required="true" %}
group
{% endswagger-parameter %}

{% swagger-parameter in="body" name="user" type="String" required="true" %}
User DID
{% endswagger-parameter %}

{% swagger-parameter in="body" name="message" type="String" required="true" %}
removing message
{% endswagger-parameter %}
{% endswagger %}
