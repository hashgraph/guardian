# Policy Workflow Step 7



Next, we want to add another step to our policy action. To do this we again go back to the Policy Action itself by clicking on the “init\_installer\_steps” Policy Action icon on the left.

Again we need a Send step since we now have to submit the CSD01, the official IREC Participant Application form, as an official verifiable credential.

Note that compared to the previous “Send” step, the Data Type is now a VC since we are submitting the official form as a verifiable credential but not to Hedera. This form is stored on the Guardian for auditors to review in the trust chain.

![](https://i.imgur.com/XqlJgq6.png)

**Programmatically this workflow step looks like this:**

```
    // Finally save the VC document in the vc-documents DB table.
    {
      "tag": "Submission_of_CSD01_Documentation",
      "blockType": "sendToGuardian",
      "dataType": "vc-documents",
      "entityType": "Installer",
      "uiMetaData": {}
    },
    // After the document has been created; the user can access the document with grids.
```
