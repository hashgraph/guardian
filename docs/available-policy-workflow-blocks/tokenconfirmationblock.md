# tokenConfirmationBlock

This Block enables the owner of the private key for the account to manually perform operations with the token, including those not available in the ‘[**tokenActionBlock**](tokenactionblock.md)**’.**

### **1. Properties**

| Block Property     | Definition                                                                                                                                                                                                                                                     | Example Input                                                                         | Status |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ |
| tag                | Unique name for the logic block.                                                                                                                                                                                                                               | tokenConfirmationBlock                                                                |        |
| permissions        | Which entity has rights to interact at this part of the workflow.                                                                                                                                                                                              | VVB                                                                                   |        |
| defaultActive      | Shows whether this block is active at this time and whether it needs to be shown.                                                                                                                                                                              | Checked or unchecked.                                                                 |        |
| On errors          | Called if the system error has occurs in the Block                                                                                                                                                                                                             | <p></p><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul> |        |
| Stop Propagation   | End processing here, don't pass control to the next block.                                                                                                                                                                                                     | Checked or unchecked.                                                                 |        |
| Token              | Token which is affected by the action                                                                                                                                                                                                                          | iREC token                                                                            |        |
| Account Type       | <p>The type of the account under which the action is performed. If set to ‘Default’ the account of the currently logged in user is used (i.e. the owner of the document).</p><p>If set to ‘Custom’ the account specified in the ‘accountId’ field is used.</p> | Custom                                                                                |        |
| Account Id (Field) | The value from this field is used as the ID of the account under which the action is performed when ‘Account Type’ is set to ‘Custom’.                                                                                                                         | field0                                                                                |        |
| Action             | Action to be performed on Token                                                                                                                                                                                                                                | <p></p><ul><li>Associate</li><li>Dissociate</li></ul>                                 |        |



{% hint style="info" %}
**Notes:**

1. Only fields of ‘Hedera Account’ type can be used for ‘accountId’.
2. If the field specified in the ‘accountId’ is not found in the current document then the system will look for it in the parent documents.
3. Users can skip the action by selecting “I will _Action_ manually” option in the UI. This would require the user to perform the corresponding action off-Guardian platform (directly on Hedera chain).
{% endhint %}

![Block Properties](<../.gitbook/assets/image (8).png>)

![JSON View of the Block](<../.gitbook/assets/image (7).png>)

![Configuring tokenConfirmationBlock](../.gitbook/assets/image.png)

![Creating Event to move to next step](<../.gitbook/assets/image (16).png>)

### 2. Performing Token Associate using Guardian UI

The user need to input the private key for the account to enable Guardian to perform the action. The key is used once for the operation specified, it is not saved and not logged anywhere.

{% hint style="info" %}
**Note:** Users can skip the action in UI if they prefer to perform it outside Guardian (directly with Hedera blockchain).
{% endhint %}

![](<../.gitbook/assets/image (4).png>)

