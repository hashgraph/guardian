# Policy Workflow Step 15

We need to add another step to close out the sub-steps in the cycle. This is accomplished by creating the IREC document CSD002 – Device Registration. This is created just like the document from earlier steps called CSD001 as a verifiable credential and stored in the guardian.

We click back to the “create\_new\_sensors\_steps” process step and add a “Send” action by clicking on the “Send” button in the top navigation bar.

We then add a tag, type - of course, a verifiable credential, and entity – our inverter sensor. And done. We have completed the steps to add an inverter sensor to a project.

![](https://i.imgur.com/8jRpiQJ.png)

**Programmatically this workflow step looks like this:**

```
                // Also save it in the DB.
                {
                  "tag": "CSD02_device_registration",
                  "blockType": "sendToGuardian",
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
```

Lastly, just create a new Container Block to group all components on the page with MRV data.

![](https://i.imgur.com/3Ggu3yV.png)

**Programmatically this workflow step looks like this:**

```
        // Create interfaceContainerBlock to group all components on the page with MRV data.
        {
          "blockType": "interfaceContainerBlock",
          "tag": "mrv_page",
          "defaultActive": true,
          "permissions": [
            "INSTALLER"
          ],  
          "uiMetaData": {
            "type": "blank",
            "title": "MRV"
          },
```

And done. We have completed the steps to add an inverter sensor to a project.
