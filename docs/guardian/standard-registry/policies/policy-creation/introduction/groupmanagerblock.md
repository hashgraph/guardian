# groupManagerBlock

This block allows to manage group membership, add and remove users from the group.

### 1. Properties

| Block Property   | Definition                                                                        | Example Input                                                                               | Status |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ |
| tag              | Unique name for the logic block.                                                  | **groupManagerBlock**                                                                       |        |
| permissions      | Which entity has rights to interact at this part of the workflow.                 | NoRole                                                                                      |        |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                                                                       |        |
| On errors        | Called if the system error has occurs in the Block                                | <ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul>              |        |
| Stop Propagation | End processing here, don't pass control to the next block.                        | Checked or unchecked.                                                                       |        |
| Can Invite       | specifies who can create invites                                                  | <p>· Group Owner – only the creator of the group</p><p>· All – all members of the group</p> |        |
| Can Delete       | specifies who can remove users from the group                                     | <p>· Group Owner – only the creator of the group</p><p>. All – all members of the group</p> |        |

<figure><img src="../../../../../.gitbook/assets/image (23) (2) (1).png" alt=""><figcaption></figcaption></figure>

### 2. Usage

#### 2.1 **List of the groups in which the user is included:**

<figure><img src="../../../../../.gitbook/assets/image (13) (4) (1) (1).png" alt=""><figcaption></figcaption></figure>

#### **2.2 List of the users included in the group**

<figure><img src="../../../../../.gitbook/assets/image (33) (2).png" alt=""><figcaption></figcaption></figure>

#### **2.3 Inviting users to groups**

First step is to select the role to invite the user as shown below:

<figure><img src="../../../../../.gitbook/assets/image (34) (1).png" alt=""><figcaption></figcaption></figure>

Next step is to copy and send the unique invite or the link to the invite.

<figure><img src="../../../../../.gitbook/assets/image (35) (2).png" alt=""><figcaption></figcaption></figure>

#### 2.4 **Removing users from groups**

<figure><img src="../../../../../.gitbook/assets/image (1) (11).png" alt=""><figcaption></figcaption></figure>

### API Parameters

<mark style="color:blue;">`GET`</mark> `/policies/{policyId}/blocks/{uuid}`

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| policyId<mark style="color:red;">\*</mark> | String | Policy ID   |
| uuid<mark style="color:red;">\*</mark>     | String | Block UUID  |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
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
{% endtab %}
{% endtabs %}

<mark style="color:green;">`POST`</mark> `/policies/{policyId}/blocks/{uuid}`

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| policyId<mark style="color:red;">\*</mark> | String | Policy ID   |
| uuid<mark style="color:red;">\*</mark>     | String | Block UUID  |

#### Request Body

| Name                                      | Type   | Description      |
| ----------------------------------------- | ------ | ---------------- |
| action<mark style="color:red;">\*</mark>  | String | invite/delete    |
| role<mark style="color:red;">\*</mark>    | String | role             |
| group<mark style="color:red;">\*</mark>   | String | group            |
| user<mark style="color:red;">\*</mark>    | String | User DID         |
| message<mark style="color:red;">\*</mark> | String | removing message |
