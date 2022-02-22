# Policy Workflow Step 24



Next, we click on the “mint\_events”, and then add a send action by clicking on the “Send” button in the top navigation bar to send the MRV data in the CSD004 form – Requesting IREC Issuance for tokens to be issued to the Guardian.

![](https://i.imgur.com/ioUw0WH.png)

**Programmatically this workflow step looks like this:**

```
    // Store the new MRV.
    {
      "tag": "CSD04_requesting_i_Rec_issuance",
      "blockType": "sendToGuardian",
      "dataType": "vc-documents",
      "entityType": "MRV",
      "uiMetaData": {}
    },
```
