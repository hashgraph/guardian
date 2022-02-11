# Step 3

Now we want to add another step in the Policy Action. To do this we go back to the Policy Action we are defining by clicking on the “init\_installer\_steps” Policy Action icon on the left.

After having created the “add\_new\_installer\_request”, we need to send the request for saving the document to the Guardian. To do this we click on the “Send” icon in the top navigation bar to add another Policy Action step that allows us to send the request we created in the previous step for processing.

Again, we name the “Tag” under the “Properties” for this step.

Then we identify the Entity Type which is the Installer in our case since the installer is to be added.

Then we add the “Data Type” from the drop-down to approve since the document to be sent is the approval of a new installer.

Note, that we do not select a “Permission” because anyone should be able to send the document once it is created. Also, it should not be active by default.

Also, note, that this step does not create a new document, so the “Force New Document” is unchecked. And since we want to send the document, the “Stop Propagation” function is also not enabled.

![](https://i.imgur.com/rKy002K.png)

**Programmatically this workflow step looks like this:**

```
    // Next step is to save it in the DB.
    {
      //"sendToGuardian" - a type of the block which can save a new or updated document.
      //This block does not contain defaultActive and does not render, only relevant on the server side.
      "blockType": "sendToGuardian",
      "tag": "save_new_approve_document",
      //"dataType" - where to save the document, possible values:
      //  "approve" - approve DB table.
      //  "vc-documents" - vc-documents DB table.
      //  "did-documents" - did-documents DB table.
      //  "hedera" - document would be sent to the corresponding Policy topic in Hedera.
      // In this example VC would be stored in a approve table, waiting for approval.
      "dataType": "approve",
      //"entityType" - mark the document in the DB. Needed for filtering.
      "entityType": "Installer",
      //"stopPropagation" - end processing here, don't pass control to the next block.
      "stopPropagation": false,
      "uiMetaData": {}
    },

```
