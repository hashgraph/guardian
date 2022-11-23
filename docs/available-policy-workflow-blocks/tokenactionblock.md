# tokenActionBlock

This block is responsible in performing automatic actions on the token.

### Properties

| Block Property     | Definition                                                                                                                                                                                                                                                     | Example Input                                                                                                              | Status |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ |
| tag                | Unique name for the logic block.                                                                                                                                                                                                                               | tokenActionBlock                                                                                                           |        |
| permissions        | Which entity has rights to interact at this part of the workflow.                                                                                                                                                                                              | VVB                                                                                                                        |        |
| defaultActive      | Shows whether this block is active at this time and whether it needs to be shown.                                                                                                                                                                              | Checked or unchecked.                                                                                                      |        |
| On errors          | Called if the system error has occurs in the Block                                                                                                                                                                                                             | <p></p><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul>                                      |        |
| Stop Propagation   | End processing here, don't pass control to the next block.                                                                                                                                                                                                     | Checked or unchecked.                                                                                                      |        |
| Token              | The token which is affected by the action                                                                                                                                                                                                                      | iREC token                                                                                                                 |        |
| Account Type       | <p>The type of the account under which the action is performed. If set to ‘Default’ the account of the currently logged in user is used (i.e. the owner of the document).</p><p>If set to ‘Custom’ the account specified in the ‘accountId’ field is used.</p> | Custom                                                                                                                     |        |
| Account Id (Field) | The value from this field is used as the ID of the account under which the action is performed when ‘Account Type’ is set to ‘Custom’.                                                                                                                         | field0                                                                                                                     |        |
| Action             | Action to be performed on Token                                                                                                                                                                                                                                | <p></p><ul><li>Associate</li><li>Dissociate</li><li>Freeze</li><li>Unfreeze</li><li>Grant Kyc</li><li>Revoke Kyc</li></ul> |        |
| Use Template       | This needs to be enabled if we need to use token template, which is created already.                                                                                                                                                                           | Enabled or Disabled                                                                                                        |        |
| Token Template     | Which will take created tokenId from input document by template name                                                                                                                                                                                           | token\_template_\__0                                                                                                       |        |



![](<../.gitbook/assets/image (12).png>)

![](<../.gitbook/assets/image (3) (5).png>)

{% hint style="info" %}
**Note:**

1. Only fields of ‘Hedera Account’ type can be used for ‘accountId’.
2. If the field specified in the ‘accountId’ is not found in the current document then the system will look for it in the parent documents.
3. ‘Associate’ and ‘Dissociate’ actions are not available when ‘Account Type’ is set to ‘Custom’. For these operations ‘[**tokenConfirmationBlock**](tokenconfirmationblock.md)’ should be used instead.
{% endhint %}

### Actions

| Action Name | Purpose                                                                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Associate   | Links the account with the token. This operation is required to enable the account to perform transactions (including receiving) with the token.               |
| Dissociate  | Removes the aforementioned ‘link’.                                                                                                                             |
| Freeze      | Freezes the account                                                                                                                                            |
| Unfreeze    | Unfreezes the account                                                                                                                                          |
| Grant KYC   | This action is mandatory if the token is configured to require KYC. The owner of the token is required to ‘grant KYC’ to enable transactions with the account. |
| Revoke KYC  | This revokes the account’s permission to participate in transactions with the token.                                                                           |



![](<../.gitbook/assets/image (15) (2).png>)
