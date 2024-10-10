# Policy Workflow Wrap Up

We can then look at the entire process.

![](../../../../../.gitbook/assets/PW\_image\_33.png)

We can also look at the code that has been created programmatically from the defined workflow by clicking on the “<>” button in the three-button chevron on the right-hand side.

![](../../../../../.gitbook/assets/PW\_image\_34.png)

The full coded version of the policy we just demoed is below (Reminder the coded version of this policy is for Guardian verison 1.0.2):

```
//Policy logic starts with block 1.
{
  //blockType - the type of the block:
  //  "InterfaceContainerBlock" - a block which contains and organizes other blocks.
  //  First block should always be of the "InterfaceContainerBlock" type.
  "blockType": "InterfaceContainerBlock",
  //defaultActive shows whether this block is active at this time and whether it needs to be shown.
  "defaultActive": true,
  //permissions - users with these roles are allowed to interact with the block. Can contain the following values:
  //  "OWNER" = creator of the Policy.
  //  "NO_ROLE" = users without a role.
  //  "ANY_ROLE" = users with any role.
  //  "INSTALLER" = only users with a particular role (in this case - INSTALLER).
  "permissions": [
    // As per above, this block is accessible to all users (with any role).
    "ANY_ROLE"
  ],
  //uiMetaData - additional options which don't affect the behavior of the block but are needed for rendering.
  "uiMetaData": {
    //type - block UI behavior, can contain the following values:
    //  "blank" - does not contain any frame, will render all child elements one after the other.
    //  "tabs" - a container which has a tab for each of the child element. It will render the first child element as type "blank".
    "type": "blank"
  },
  //children - list of child blocks in a container block.
  "children": [
    //First policy step - select a role.
    {
      //"PolicyRolesBlock" - block which determines a role for the user.
      "blockType": "PolicyRolesBlock",
      //"tag" - a unique (for the Policy) textual tag for the block which can be used in other blocks for linking.
      "tag": "choose_role",
      //Non ContainerBlock do not contain child elements. They can exist but they are ignored for rendering.
      "children": [],
      "uiMetaData": {
        //html component has title and descriptions, which can be specified in the corresponding elements.
        "title": "registration",
        "description": "choose a role"
      },
      "permissions": [
        //Only users with no roles assigned can access the block.
        "NO_ROLE"
      ],
      //This block is active
      "defaultActive": true,
      //"roles" - available roles from which the user can choose.
      "roles": [
        //In this case the user can only be the INSTALLER.
        "INSTALLER"
      ]
    },
    // After the role is selected the corresponding branch in the policy will become accessible for the user.
    {
      //"InterfaceStepBlock" - similar to the InterfaceContainerBlock, with the difference that it can only render a single child element.
      //Rendered component is determined by the current step.
      //An event on a component automatically passes control to the next component.
      "blockType": "InterfaceStepBlock",
      "defaultActive": true,
      "tag": "init_installer_steps",
      "permissions": [
        //This block is only accessible to users with the INSTALLER role.
        "INSTALLER"
      ],
      "uiMetaData": {
        //Currently there is only one type - "blank".
        //Only 1 active block is rendered.
        "type": "blank"
      },
      "children": [
        //First step after the selection of the INSTALLER roles is to fill out the VC form.
        {
          //"requestVcDocumenBlock" - a type of the block which creates a form from the schema, and sends the document to the server.
          "blockType": "requestVcDocumentBlock",
          "tag": "add_new_installer_request",
          "defaultActive": true,
          "permissions": [
            "INSTALLER"
          ],
          //"schema" - uuid of the schema, which will be used to build the form.
          "schema": "1a5347ba-5e5f-49a7-8734-3dcc953a03ed",
          //"idType" - when the documents is saved it would automatically get an ID.
          // In this example the document ID would be the DID of the current user.
          // Can be one of these values:
          //   "UUID" - new uuid.
          //   "DID" - new DID.
          //   "OWNER" - DID of the current user.
          "idType": "OWNER",
          "uiMetaData": {
            //"type" - style of the render of the form, one of these values:
            //  "page" - the form is rendered as a page.
            //  "dialog" - displays a button, which opens a dialogue with the form when clicked.
            "type": "page",
            // The page contains title and description, as well as the form.
            "title": "New Installer",
            "description": "Description"
          }
        },
        // Next step is to save it in the DB.
        {
          //"sendToGuardianBlock" - a type of the block which can save a new or updated document.
          //This block does not contain defaultActive and does not render, only relevant on the server side.
          "blockType": "sendToGuardianBlock",
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
        // Notify the user after submitting the request for approval.
        {
          //"InformationBlock" - block type which can display a notification or a progress bar.
          "blockType": "InformationBlock",
          "tag": "wait_fo_approve",
          "children": [],
          "uiMetaData": {
            //"type" - notification type, possible values:
            //  "text" - textual message.
            //  "loader" - progress bar.
            "type": "text",
            // Set title and description for the page, only if the "type" is "text".
            "title": "Waiting for approval",
            "description": "Waiting for approval"
          },
          "permissions": [
            "INSTALLER"
          ],
          // Do not pass control to the next block after displaying the message as need to wait for Standard Registry approval.
          "stopPropagation": true,
          "defaultActive": true
        },
        // After the approval continue creating the document.
        // Update document status in the DB.
        {
          "tag": "update_approve_document_status",
          "blockType": "sendToGuardianBlock",
          "dataType": "approve",
          "entityType": "Installer",
          "uiMetaData": {}
        },
        // Now send the document to Hedera Topic.
        {
          "tag": "send_installer_vc_to_hedera",
          "blockType": "sendToGuardianBlock",
          "dataType": "hedera",
          "entityType": "Installer",
          "uiMetaData": {}
        },
        // Finally save the VC document in the vc-documents DB table.
        {
          "tag": "Submission_of_CSD01_Documentation",
          "blockType": "sendToGuardianBlock",
          "dataType": "vc-documents",
          "entityType": "Installer",
          "uiMetaData": {}
        },
        // After the document has been created; the user can access the document with grids.
        // Create an InterfaceContainerBlock to group all pages accessible after registration is completed.
        {
          "blockType": "InterfaceContainerBlock",
          "tag": "installer_header",
          "defaultActive": true,
          "permissions": [
            "INSTALLER"
          ],
          "uiMetaData": {
            // In this example, INSTALLER would be able to access two tabs.
            "type": "tabs"
          },
          "children": [
            // Create an InterfaceContainerBlock to group all components on the sensor page.
            {
              "blockType": "InterfaceContainerBlock",
              "tag": "sensors_page",
              "defaultActive": true,
              "permissions": [
                "INSTALLER"
              ],
              "uiMetaData": {
                "type": "blank",
                // "title" - name of the tab. If the parent is interfaceContainerBlock the value from title is used for tab name.
                // If the "title" is empty the block name is used as the tab name.
                "title": "Sensors"
              },
              // Sensor page. Contains a grid and a "create new sensor" button.
              "children": [
                {
                  //"InterfaceDocumentsSourceBlock" - block type which outputs information from the DB as grid.
                  "blockType": "InterfaceDocumentsSourceBlock",
                  "tag": "sensors_grid",
                  "defaultActive": true,
                  "permissions": [
                    "INSTALLER"
                  ],
                  
                  // When true, this filter out the documents not created by the current user when rendering.
                  "onlyOwnDocuments": true,
                  //"dataType" - Specificy the table to request the data from. Possible values:
                  //  "vc-documents".
                  //  "did-documents".
                  //  "vp-documents".
                  //  "approve".
                  //  "standard-registries" - list of users with the Standard Registry role.
                  "dataType": "vc-documents",
                  // Custom filters, based on any existing fields.
                  "filters": {
                    // Filter on the basis of schema ID.
                    "schema": "9d31b4ee-2280-43ee-81e7-b225ee208802",
                    // Filter on the basis of the "entityType" field in the "sendToGuardianBlock" block.
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
                  //"InterfaceActionBlock" -  block to create custom actions.
                  "blockType": "InterfaceActionBlock",
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
                // Component is embedded into the InterfaceStepBlock to join all steps.
                {
                  "defaultActive": true,
                  "tag": "create_new_sensor_steps",
                  "permissions": [
                    "INSTALLER"
                  ],
                  "blockType": "InterfaceStepBlock",
                  "uiMetaData": {
                    "type": "blank"
                  },
                  "children": [
                    // Button to create new sensor.
                    {
                      "tag": "add_sensor_bnt",
                      "defaultActive": true,
                      "permissions": [
                        "INSTALLER"
                      ],
                      "blockType": "requestVCDocumentBlock",
                      "schema": "9d31b4ee-2280-43ee-81e7-b225ee208802",
                      // Generate new DID for the new sensor.
                      "idType": "DID",
                      "uiMetaData": {
                        // Open the a dialog containing the new sensor.
                        "type": "dialog",
                        // Text on the button.
                        "content": "New Sensors",
                        //Button style.
                        "uiClass": "btn",
                        //Dialog title.
                        "dialogContent": "New Sensors",
                        //Description.
                        "description": "Description",
                        //Dialog style.
                        "dialogClass": ""
                      }
                    },
                    // Save the created sensor VC in the corresponding Heder Topic.
                    {
                      "tag": "send_sensor_vc_to_hedera",
                      "blockType": "sendToGuardianBlock",
                      "dataType": "hedera",
                      "entityType": "Inverter",
                      "uiMetaData": {}
                    },
                    // Also save it in the DB.
                    {
                      "tag": "CSD02_device_registration",
                      "blockType": "sendToGuardianBlock",
                      "dataType": "vc-documents",
                      // Document in the DB is labeled as "Inverter" to enable later filtering in the grid.
                      "entityType": "Inverter",
                      "stopPropagation": false,
                      "uiMetaData": {}
                    }
                  ],
                  //"cyclic" - go back one step to enable the creation of another sensor.
                  "cyclic": true
                }
              ]
            },
            // Create InterfaceContainerBlock to group all components on the page with MRV data.
            {
              "blockType": "InterfaceContainerBlock",
              "tag": "mrv_page",
              "defaultActive": true,
              "permissions": [
                "INSTALLER"
              ],  
              "uiMetaData": {
                "type": "blank",
                "title": "MRV"
              },
              "children": [
                // MRV grid.
                {
                  "tag": "mrv_grid",
                  "defaultActive": true,
                  "permissions": [
                    "INSTALLER"
                  ],
                  "blockType": "InterfaceDocumentsSourceBlock",
                  "dependencies": [
                    "SendToGuardianBlock"
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
        // Block to display rejection info (i.e. the INSTALLER was not approved by Standard Registry).
        {
          "tag": "installer_rejected",
          "blockType": "InformationBlock",
          "children": [],
          "uiMetaData": {
            "type": "text",
            "description": "Your application was rejected",
            "title": "Rejected"
          },
          "stopPropagation": true,
          "permissions": [
            "INSTALLER"
          ],
          "defaultActive": true
        }
      ]
    },
    // This Policy branch is used by users with the Standard Registry roles.
    //Starting with the ContainerBlock.
    {
      "tag": "standard_registry_header",
      "defaultActive": true,
      "permissions": [
        "OWNER"
      ],
      "blockType": "InterfaceContainerBlock",
      "uiMetaData": {
        "type": "tabs"
      },
      "children": [
        // Page containing the list of installers which sent documents for approval.
        {
          "tag": "approve_page",
          "defaultActive": true,
          "permissions": [
            "OWNER"
          ],
          "blockType": "InterfaceContainerBlock",
          "uiMetaData": {
            "type": "blank",
            "title": "Approve Documents"
          },
          "children": [
            // Grid listing VCs of the Installers, which require approval from the Standard Registry.
            {
              "tag": "approve_documents_grid",
              "defaultActive": true,
              "permissions": [
                "OWNER"
              ],
              "blockType": "InterfaceDocumentsSourceBlock",
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
            // Block with the Approve/Reject buttons, embedded into the grid
            {
              "tag": "approve_documents_btn",
              "blockType": "InterfaceActionBlock",
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
    // Policy branch for minting tokens.
    {
      "tag": "mint_events",
      "permissions": [
        "OWNER",
        "INSTALLER"
      ],
      "blockType": "InterfaceContainerBlock",
      "uiMetaData": {
        "type": "blank"
      },
      "children": [
        // Receive the MRV.
        {
          //"externalDataBlock" - receives data from the external source and passes them over the the next block.
          // Each Policy has a policyTag. Data received onto the external API are filtered by the policyTag, and passed on to all externalDataBlock inside the Policy.
          "blockType": "externalDataBlock",
          "tag": "mrv_source",
          "entityType": "MRV",
          // Filter the documents by schema ID. If the document is not related to the given schema it does not get passed further.
          "schema": "c4623dbd-2453-4c12-941f-032792a00727",
          "uiMetaData": {}
        },
        // Store the new MRV.
        {
          "tag": "CSD04_requesting_i_Rec_issuance",
          "blockType": "sendToGuardianBlock",
          "dataType": "vc-documents",
          "entityType": "MRV",
          "uiMetaData": {}
        },
        //Minting
        {
          //"mintDocument" - receives the VC from the previous block and mints based on the rule[s].
          "blockType": "mintDocumentBlock",
          "tag": "mint_token",
          //"tokenId" - ID of the token
          // User should be previously linked with token.
          "tokenId": "0.0.26063342",
          // Rules under which the number of tokens is calculated. Math operations are supported, e.g. the following:
          //  data = { amount: 2 }
          //  rule = "amount * 10"
          // will result in 20 tokens.
          "rule": "1",
          "uiMetaData": {}
        }
      ]
    }
  ]
}
```
