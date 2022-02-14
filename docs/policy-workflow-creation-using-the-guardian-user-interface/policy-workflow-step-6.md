# Policy Workflow Step 6



Next, we want to add another step to our policy action. To do this we again go back to the Policy Action itself by clicking on the “init\_installer\_steps” Policy Action icon on the left.

Again we need a Send step since we need to send the updated approval document as a W3C Verifiable Credential from the Guardian to Hedera for further processing. To do this we again click on the “Send” icon in the top navigation bar to add another Policy Action step.

We now proceed in the same way as with the “Send” step from “save\_new\_approve\_document” to configure this policy action step.

Note that the data type must be “Hedera” since the document is to be sent as a verifiable credential for permanent storage to Hedera.

![](https://i.imgur.com/6zP601A.png)

**Programmatically this workflow step looks like this:**

```
    // Now send the document to Hedera Topic.
    {
      "tag": "send_installer_vc_to_hedera",
      "blockType": "sendToGuardian",
      "dataType": "hedera",
      "entityType": "Installer",
      "uiMetaData": {}
    },
```
