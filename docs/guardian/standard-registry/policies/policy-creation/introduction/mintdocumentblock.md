# mintDocumentBlock

This block is responsible for adding configurations on calculating the amount of tokens to be minted.

### Properties

<table><thead><tr><th width="208">Block Property</th><th>Definition</th><th>Example Input</th><th>Status</th></tr></thead><tbody><tr><td>tag</td><td>Unique name for the logic block.</td><td><strong>mintDocumentBlock</strong></td><td></td></tr><tr><td>permissions</td><td>Which entity has rights to interact at this part of the workflow.</td><td>VVB</td><td></td></tr><tr><td>defaultActive</td><td>Shows whether this block is active at this time and whether it needs to be shown.</td><td>Checked or unchecked.</td><td></td></tr><tr><td>On errors</td><td>Called if the system error has occurs in the Block</td><td><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul></td><td></td></tr><tr><td>Stop Propagation</td><td>End processing here, don't pass control to the next block.</td><td>Checked or unchecked.</td><td></td></tr></tbody></table>

### UI Properties

| UI Property        | Definition                                                                                                                                                          | Example Input                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Token              | The token which is affected by the action                                                                                                                           | GHG Token                                                                         |
| Account Type       | The value from this field is used as the ID of the account under which the action is performed when ‘Account Type’ is set to ‘Custom Account Field’.                | <ul><li>Custom Account Field</li><li>Custom Account Value</li></ul>               |
| Rule               | Math expression for calculation of the amount of tokens to mint.                                                                                                    | field7 \* 100                                                                     |
| Account Id (Field) | The value from this field is used as the ID of the account which is used for token transfer action when ‘Account Type’ is set to ‘Custom’.                          | field5                                                                            |
| Account Id (Value) | Allow users to set custom Hedera account id directly in policy configuration (for token transferring). This field is displayed only when Custom Account Value type. | 0.0.48640912                                                                      |
| Memo               | The value in this filed is used to customize the Memo field name.                                                                                                   | "mint date is $ {document.verifiableCredential\[0],credentialSubject\[0].field5}" |
| Use Template       | This needs to be enabled if we need to use token template, which is created already.                                                                                | Enabled/Disabled                                                                  |
| Token Template     | Which will take created tokenId from input document by template name                                                                                                | token\_template\_\_\_0                                                            |

<figure><img src="../../../../../.gitbook/assets/image (31) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Notes:**

1. Only fields of ‘Hedera Account’ type can be used for ‘accountId’.
2. If the field specified in the ‘accountId’ not found in the current document the system will look for it in the parent documents.
{% endhint %}
