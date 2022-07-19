# mintDocumentBlock

This Block is responsible for adding configurations on calculating the amount of tokens to be minted.

### Properties

| Block Property     | Definition                                                                                                                                                                                                                                                     | Example Input                                                                         | Status |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ |
| tag                | Unique name for the logic block.                                                                                                                                                                                                                               | mintDocumentBlock                                                                     |        |
| permissions        | Which entity has rights to interact at this part of the workflow.                                                                                                                                                                                              | VVB                                                                                   |        |
| defaultActive      | Shows whether this block is active at this time and whether it needs to be shown.                                                                                                                                                                              | Checked or unchecked.                                                                 |        |
| On errors          | Called if the system error has occurs in the Block                                                                                                                                                                                                             | <p></p><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul> |        |
| Stop Propagation   | End processing here, don't pass control to the next block.                                                                                                                                                                                                     | Checked or unchecked.                                                                 |        |
| Token              | Token which is affected by the action                                                                                                                                                                                                                          | iREC token                                                                            |        |
| Account Type       | <p>The type of the account under which the action is performed. If set to ‘Default’ the account of the currently logged in user is used (i.e. the owner of the document).</p><p>If set to ‘Custom’ the account specified in the ‘accountId’ field is used.</p> | Custom                                                                                |        |
| Account Id (Field) | The value from this field is used as the ID of the account under which the action is performed when ‘Account Type’ is set to ‘Custom’.                                                                                                                         | field0                                                                                |        |
| Rule               | Math expression for calculation of the amount of tokens to mint.                                                                                                                                                                                               | field1 / 10 + field2                                                                  |        |

{% hint style="info" %}
**Notes:**

1. Only fields of ‘Hedera Account’ type can be used for ‘accountId’.
2. If the field specified in the ‘accountId’ not found in the current document the system will look for it in the parent documents.
{% endhint %}

![](<../.gitbook/assets/image (5).png>)

![](<../.gitbook/assets/image (6).png>)
