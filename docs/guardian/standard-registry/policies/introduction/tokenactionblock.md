# tokenActionBlock

This block is responsible in performing automatic actions on the token.

### Properties

<table><thead><tr><th width="208">Block Property</th><th>Definition</th><th>Example Input</th><th>Status</th></tr></thead><tbody><tr><td>tag</td><td>Unique name for the logic block.</td><td>tokenActionBlock</td><td></td></tr><tr><td>permissions</td><td>Which entity has rights to interact at this part of the workflow.</td><td>VVB</td><td></td></tr><tr><td>defaultActive</td><td>Shows whether this block is active at this time and whether it needs to be shown.</td><td>Checked or unchecked.</td><td></td></tr><tr><td>On errors</td><td>Called if the system error has occurs in the Block</td><td><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul></td><td></td></tr><tr><td>Stop Propagation</td><td>End processing here, don't pass control to the next block.</td><td>Checked or unchecked.</td><td></td></tr><tr><td>Token</td><td>The token which is affected by the action</td><td>iREC token</td><td></td></tr><tr><td>Account Type</td><td><p>The type of the account under which the action is performed. If set to ‘Default’ the account of the currently logged in user is used (i.e. the owner of the document).</p><p>If set to ‘Custom’ the account specified in the ‘accountId’ field is used.</p></td><td>Custom</td><td></td></tr><tr><td>Account Id (Field)</td><td>The value from this field is used as the ID of the account under which the action is performed when ‘Account Type’ is set to ‘Custom’.</td><td>field0</td><td></td></tr><tr><td>Action</td><td>Action to be performed on Token</td><td><ul><li>Associate</li><li>Dissociate</li><li>Freeze</li><li>Unfreeze</li><li>Grant Kyc</li><li>Revoke Kyc</li></ul></td><td></td></tr><tr><td>Use Template</td><td>This needs to be enabled if we need to use token template, which is created already.</td><td>Enabled or Disabled</td><td></td></tr><tr><td>Token Template</td><td>Which will take created tokenId from input document by template name</td><td>token_template<em>_</em>0</td><td></td></tr></tbody></table>

![](<../../../../.gitbook/assets/image (17) (3).png>)

![](<../../../../.gitbook/assets/image (3) (5) (1).png>)

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

![](<../../../../.gitbook/assets/image (15) (3).png>)
