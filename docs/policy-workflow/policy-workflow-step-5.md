# Policy Workflow Step 5



Next, we want to add another step to our policy action. To do this we again go back to the Policy Action itself by clicking on the “init\_installer\_steps” Policy Action icon on the left.

Again we need a Send step since we need to send the approval we obtained from the Installer to the Guardian to update the Policy Workflow State Object which we created with the approval document. This update is necessary to proceed with the steps in our Policy Action. To do this we again click on the “Send” icon in the top navigation bar to add another Policy Action step.

We now proceed as with the previous “Send” step “save\_new\_approve\_document” to configure the policy action step.

![](https://i.imgur.com/bHuGLc0.png)

**Programmatically this workflow step looks like this:**

```
    // After the approval continue creating the document.
    // Update document status in the DB.
    {
      "tag": "update_approve_document_status",
      "blockType": "sendToGuardian",
      "dataType": "approve",
      "entityType": "Installer",
      "uiMetaData": {}
    },
```
