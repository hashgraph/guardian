# Policy Workflow Step 11



After the sensor gird information is captured, we need to do something with it. Therefore, we add an action step from the “sensors\_page” policy action step by clicking on the Action button in the top navigation bar.

As before, we set the tag, the permissions, and stop advancing the process until the download is complete via the “stop propagation” flag, and since this will be a download action, the action type is selected to be “download”.

We then need to select the file schema for the download, MRV. And, then we need to set the target URL where the file is stored. And finally, we select, button title and content.

![](https://i.imgur.com/65cl3bG.png)

We now need to connect the download action to the sensor grid block we defined before.

To do that, we click on the “sensors\_grid” button, and then click on “Bind Block” for Field 3 and select the “download\_config\_btn” action to bind the action to the actual definition of the button.

![](https://i.imgur.com/bbhG4gP.png)

**Programmatically workflow step 10 and 11 will looks like this:**

```
          // Sensor page. Contains a grid and a "create new sensor" button.
          "children": [
            {
              //"interfaceDocumentsSource" - block type which outputs information from the DB as grid.
              "blockType": "interfaceDocumentsSource",
              "tag": "sensors_grid",
              "defaultActive": true,
              "permissions": [
                "INSTALLER"
              ],
              //"dependencies" - automatic update. The block is automatically re-rendered if any of the linked components gets updated.
              "dependencies": [
                // Tag of the blocks as a link.
                "SendVCtoGuardian"
              ],
              // When true, this filter out the documents not created by the current user when rendering.
              "onlyOwnDocuments": true,
              //"dataType" - Specificy the table to request the data from. Possible values:
              //  "vc-documents".
              //  "did-documents".
              //  "vp-documents".
              //  "approve".
              //  "root-authorities" - list of users with the RootAuthority role.
              "dataType": "vc-documents",
              // Custom filters, based on any existing fields.
              "filters": {
                // Filter on the basis of schema ID.
                "schema": "9d31b4ee-2280-43ee-81e7-b225ee208802",
                // Filter on the basis of the "entityType" field in the "sendToGuardian" block.
                "type": "Inverter"
              },
              "uiMetaData": {
                //"fields" - list of grid columns
                "fields": [
                  {
                    // Object fields to retrieve the values from. Internal fields are separated by ".", access to array elements is via index.
                    // For example "document.credentialSubject.0.id" - is document.credentialSubject[0].id
                    "name": "document.id",
                    // Title of the column.
                    "title": "ID",
                    // Type of the displayed value, possible options:
                    //  "text" - ordinary text.
                    //  "button" - a button.
                    //  "block" - a block embedded into the column.
                    "type": "test",
                    // Floating hint/tooltip for the column.
                    "tooltip": ""
                  },
                  {
                    "name": "document.credentialSubject.0.id",
                    "title": "DID",
                    "type": "text"
                  },
                  {
                    "name": "document",
                    "title": "Document",
                    "tooltip": "",
                    "type": "button",
                    // The "button" type can contain the following parameters:
                    //"action" - action type, e.g. open a dialog˚.
                    "action": "dialog",
                    //"content" - text inside the column.
                    "content": "View Document",
                    //"uiClass" - button style.
                    "uiClass": "link",
                    //"dialogContent" - dialog title.
                    "dialogContent": "VC",
                    //"dialogClass" - dialog style.
                    "dialogClass": "",
                    //"dialogType" - currently only json type is supported.
                    "dialogType": "json"
                    // additionally specifying a "bindBlock" field would result in the display of the linked block in side the dialog.
                  },
                  {
                    "name": "document.id",
                    "title": "Config",
                    "tooltip": "",
                    // "block" - render the block inside the grid column.
                    "type": "block",
                    "uiClass": "",
                    //"bindBlock" - block to embed into the grid.
                    "bindBlock": "download_config_btn"
                  }
                ]
              }
            },
            // Block to download the config file.
            {
              //"interfaceAction" -  block to create custom actions.
              "blockType": "interfaceAction",
              // The block in embedded into the grid, not rendered independently
              "defaultActive": false,
              "tag": "download_config_btn",
              "permissions": [
                "INSTALLER"
              ],
              //"type" - block type, example values:
              //  "download" - download files.
              //  "selector" - select an action.
              "type": "download",
              //schema and the targetUrl - specific configuration parameters, Only needed in the reference implementation of the Guardian because of the IoT Simulator that is generating MRV data.
              "schema": "c4623dbd-2453-4c12-941f-032792a00727",
              "targetUrl": "http://message-broker:3003/mrv",
              "uiMetaData": {
                //"content" - text inside the column
                "content": "download"
              }
            },
            // Button to create new sensor, displayed after the grid.               
```
