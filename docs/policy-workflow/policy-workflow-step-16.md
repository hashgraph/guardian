# Policy Workflow Step 16

As with the sensors page, we add a document source by clicking on the “Document” button in the top navigation bar.

We configure the “mrv\_grid” UI page in the same way as we did the “sensors\_grid” document source for the sensors. Just a different schema and naming.

Note that in contrast to the download functionality for Field 2 for the “sensors\_grid” we are now using the link functionality to view the document.

![](https://i.imgur.com/Revddk6.png)

Below are screenshots of the field inputs

![](https://i.imgur.com/mUUIMav.png)

***

![](https://i.imgur.com/2k3zzb4.png)

***

![](https://i.imgur.com/wWYh1qG.png)

**Programmatically this workflow step looks like this:**

```
          "children": [
            // MRV grid.
            {
              "tag": "mrv_grid",
              "defaultActive": true,
              "permissions": [
                "INSTALLER"
              ],
              "blockType": "interfaceDocumentsSource",
              "dependencies": [
                "SendVCtoGuardian"
              ],
              "onlyOwnDocuments": true,
              "dataType": "vc-documents",
              "filters": {
                "schema": "c4623dbd-2453-4c12-941f-032792a00727",
                "type": "MRV"
              },
              "uiMetaData": {
                "fields": [
                  {
                    "name": "document.id",
                    "title": "ID",
                    "type": "button"
                  },
                  {
                    "name": "document.issuer",
                    "title": "Sensor DID",
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
                  }
                ]
              }
            }
          ]
        }
      ]
    },
```

This completes this sequence of sub-steps for the MRV data. We have completed the installation set-up, and we can first hide the “Installer\_header” policy action steps, and then return to the top level, the “int\_installer\_steps”
