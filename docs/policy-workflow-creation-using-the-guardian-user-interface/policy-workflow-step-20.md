# Policy Workflow Step 20



An “approve\_page” needs a document source to approve a document. Therefore, we are adding a document source below the “approve\_page” by clicking on the “Documents” button in the top navigation bar.

The “approve\_documents\_grid” has the permission for the Root Authority, must be active by default is of data type “approve.”

In contrast to the installer case where we create documents and send them for approval, we have no dependencies on the incoming documents. We take account of this by adding the “save\_new\_approve\_documents” dependency.

Next, we add the required custom UI fields on the approval UI form. Note that since this is a general approval form we do not have to specify a schema or an entity type for the UI.

![](https://i.imgur.com/sLYUF60.png)

Below are the screenshots of the field inputs

![](https://i.imgur.com/QhLlhqw.png)

***

![](https://i.imgur.com/TEIQq0w.png)

***

![](https://i.imgur.com/XE0ipG7.png)

***

![](https://i.imgur.com/sFnas74.png)

***

![](https://i.imgur.com/uH3CC8S.png)

**Programmatically this workflow step looks like this:**

```
        // Grid listing VCs of the Installers, which require approval from the RootAuthority.
        {
          "tag": "approve_documents_grid",
          "defaultActive": true,
          "permissions": [
            "OWNER"
          ],
          "blockType": "interfaceDocumentsSource",
          // Displays all VC documents from all Installers.
          "onlyOwnDocuments": false,
          "dataType": "approve",
          "dependencies": [
            // Refreshed when a VC is stored in the DB
            "save_new_approve_document"
          ],
          "uiMetaData": {
            "fields": [
              {
                "name": "document.issuer",
                "title": "Owner",
                "type": "text",
                "tooltip": "Installer did"
              },
              {
                "name": "createDate",
                "title": "Create Date",
                "type": "text"
              },
              {
                "name": "document",
                "title": "Document",
                "tooltip": "",
                "type": "button",
                "action": "dialog",
                "content": "View Document",
                "uiClass": "link",
                "dialogContent": "VC",
                "dialogClass": "",
                "dialogType": "json"
              },
              {
                "name": "status",
                "title": "Status",
                "type": "text"
              },
              // Column with the Approve/Reject buttons
              {
                "name": "status",
                "title": "Operation",
                "tooltip": "",
                "type": "block",
                "action": "block",
                "content": "",
                "uiClass": "",
                "bindBlock": "approve_documents_btn"
              }
            ]
          },
          "children": [],
          "filters": {}
        },
```
