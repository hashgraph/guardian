# tokenConfirmationBlock

This block enables the owner of the private key for the account to manually perform operations with the token, including those not available in the ‘[**tokenActionBlock**](tokenactionblock.md)**’.**

### **1. Properties**

| Block Property     | Definition                                                                                                                                                                                                                                                     | Example Input                                                                  | Status |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------ |
| tag                | Unique name for the logic block.                                                                                                                                                                                                                               | **tokenConfirmationBlock**                                                     |        |
| permissions        | Which entity has rights to interact at this part of the workflow.                                                                                                                                                                                              | VVB                                                                            |        |
| defaultActive      | Shows whether this block is active at this time and whether it needs to be shown.                                                                                                                                                                              | Checked or unchecked.                                                          |        |
| On errors          | Called if the system error has occurs in the Block                                                                                                                                                                                                             | <ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul> |        |
| Stop Propagation   | End processing here, don't pass control to the next block.                                                                                                                                                                                                     | Checked or unchecked.                                                          |        |
| Token              | The token which is affected by the action                                                                                                                                                                                                                      | iREC token                                                                     |        |
| Account Type       | <p>The type of the account under which the action is performed. If set to ‘Default’ the account of the currently logged in user is used (i.e. the owner of the document).</p><p>If set to ‘Custom’ the account specified in the ‘accountId’ field is used.</p> | Custom                                                                         |        |
| Account Id (Field) | The value from this field is used as the ID of the account under which the action is performed when ‘Account Type’ is set to ‘Custom’.                                                                                                                         | field0                                                                         |        |
| Action             | Action to be performed on Token                                                                                                                                                                                                                                | <ul><li>Associate</li><li>Dissociate</li></ul>                                 |        |
| Use Template       | This needs to be enabled if we need to use token template, which is created already.                                                                                                                                                                           | Enabled/Disabled                                                               |        |
| Token Template     | Which will take created tokenId from input document by template name                                                                                                                                                                                           | token\_template\_\_\_0                                                         |        |

{% hint style="info" %}
**Notes:**

1. Only fields of ‘Hedera Account’ type can be used for ‘accountId’.
2. If the field specified in the ‘accountId’ is not found in the current document then the system will look for it in the parent documents.
3. Users can skip the action by selecting “I will _Action_ manually” option in the UI. This would require the user to perform the corresponding action off-Guardian platform (directly on Hedera chain).
{% endhint %}

![Block Properties](<../../../../../.gitbook/assets/image (8) (3).png>)

![JSON View of the Block](<../../../../../.gitbook/assets/image (9) (3) (2).png>)

![Configuring tokenConfirmationBlock](<../../../../../.gitbook/assets/image (33) (1).png>)

![Creating Event to move to next step](<../../../../../.gitbook/assets/image (16) (5).png>)

### 2. Performing Token Associate using Guardian UI

The user need to input the private key for the account to enable Guardian to perform the action. The key is used once for the operation specified, it is not saved and not logged anywhere.

{% hint style="info" %}
**Note:** Users can skip the action in UI if they prefer to perform it outside Guardian (directly with Hedera blockchain).
{% endhint %}

![](<../../../../../.gitbook/assets/image (4) (5).png>)

### API Parameters

<mark style="color:blue;">`GET`</mark> `/policies/{policyId}/blocks/{uuid}`

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| policyId<mark style="color:red;">\*</mark> | String | Policy ID   |
| uuid<mark style="color:red;">\*</mark>     | String | Block UUID  |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```
{
  "id": "484c57c2-5ceb-41ed-97b3-61c52fce473e",
  "blockType": "tokenConfirmationBlock",
  "action": "associate",
  "accountId": "0.0.1",
  "tokenName": "GHG Token",
  "tokenSymbol": "GHG",
  "tokenId": "0.0.3121118"
}

```
{% endtab %}
{% endtabs %}

<mark style="color:green;">`POST`</mark> `/policies/{policyId}/blocks/{uuid}`

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| policyId<mark style="color:red;">\*</mark> | String | Policy Id   |
| uuid<mark style="color:red;">\*</mark>     | String | Block UUID  |

#### Request Body

| Name                                               | Type   | Description                |
| -------------------------------------------------- | ------ | -------------------------- |
| action<mark style="color:red;">\*</mark>           | String | action                     |
| hederaAccountKey<mark style="color:red;">\*</mark> | String | Hedera Account Private Key |
