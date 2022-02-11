# Policy Workflow Step 21

Upon completion, we click back on the “approve\_page” field and add an approval action step by clicking on the “Action” button in the top navigation bar.

Again we add a tag and permission. Note that we choose the action type of “selector.” This allows us to add Options as fields to the UI for different types of selections – approval/rejection.

Note that for the approve option we are binding the action to the “update\_approve\_document\_status” we defined before.

Note that for the reject option we are binding the action to the “installer\_rejected” action we previously defined.

![](https://i.imgur.com/qMY0via.png)

Next, we return to the “approve\_documents\_grid” step and add the “approve\_documents\_btn” action as a binding block to Field 4 since Field 4 captures the approval or rejection of the document. Note, the choice of block for Field 4 makes sense now, because the bound action is a block itself.

![](https://i.imgur.com/szoRpPF.png)

**Programmatically this workflow step looks like this:**

```
        // Block with the Approve/Reject buttons, embedded into the grid
        {
          "tag": "approve_documents_btn",
          "blockType": "interfaceAction",
          "permissions": [
            "OWNER"
          ],
          "type": "selector",
          // For the selector type:
          "uiMetaData": {
            //"field" - field which is linked to the selector.
            "field": "status",
            //"options" - list of the possible options.
            "options": [
              //Button:
              {
                //Button text.
                "name": "Approve",
                //Value which will be stored in the "field".
                //In this example document.status = "APPROVED"
                "value": "APPROVED",
                //Button style.
                "uiClass": "btn-approve",
                //Specify which block to pass control to.
                //If the "Approve" button was clicked, the control would be passed to the update_approve_document_status block.
                "bindBlock": "update_approve_document_status"
              },
              {
                "name": "Reject",
                "value": "REJECTED",
                "uiClass": "btn-reject",
                //If the "Reject" button was clicked pass control to the installer_rejected block.
                "bindBlock": "installer_rejected"
              }
            ]
          }
        }
      ]
    }
  ]
},
```

This completes the definition of the approval page.
