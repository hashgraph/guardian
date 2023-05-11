# mintDocumentBlock

This block is responsible for adding configurations on calculating the amount of tokens to be minted.

### Properties

| Block Property   | Definition                                                                        | Example Input                                                                         | Status |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ |
| tag              | Unique name for the logic block.                                                  | mintDocumentBlock                                                                     |        |
| permissions      | Which entity has rights to interact at this part of the workflow.                 | VVB                                                                                   |        |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                                                                 |        |
| On errors        | Called if the system error has occurs in the Block                                | <p></p><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul> |        |
| Stop Propagation | End processing here, don't pass control to the next block.                        | Checked or unchecked.                                                                 |        |

### UI Properties

| UI Property        | Definition                                                                                                                                                          | Example Input                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Token              | The token which is affected by the action                                                                                                                           | GHG Token                                                                         |
| Account Type       | The value from this field is used as the ID of the account under which the action is performed  when ‘Account Type’ is set to ‘Custom Account Field’.               | <ul><li>Custom Account Field</li><li>Custom Account Value</li></ul>               |
| Rule               | Math expression for calculation of the amount of tokens to mint.                                                                                                    | field7 \* 100                                                                     |
| Account Id (Field) | The value from this field is used as the ID of the account which is used for token transfer action when ‘Account Type’ is set to ‘Custom’.                          | field5                                                                            |
| Account Id (Value) | Allow users to set custom Hedera account id directly in policy configuration (for token transferring). This field is displayed only when Custom Account Value type. | 0.0.48640912                                                                      |
| Memo               | The value in this filed is used to customize the Memo field name.                                                                                                   | "mint date is $ {document.verifiableCredential\[0],credentialSubject\[0].field5}" |
| Use Template       | This needs to be enabled if we need to use token template, which is created already.                                                                                | Enabled/Disabled                                                                  |
| Token Template     | Which will take created tokenId from input document by template name                                                                                                | token\_template_\__0                                                              |

<figure><img src="../.gitbook/assets/image (31) (2) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Notes:**

1. Only fields of ‘Hedera Account’ type can be used for ‘accountId’.
2. If the field specified in the ‘accountId’ not found in the current document the system will look for it in the parent documents.
{% endhint %}
