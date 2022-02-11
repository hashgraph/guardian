# Policy Workflow Step 13



Since this is a cyclic step, we need to add the requirements as sub-steps to be completed in each cycle, and an exit condition.

We add the first sub-step by clicking on the “Request” button in the top navigation bar.

Again we add a tag, set the permissions, make this step active by default since it is required, select the schema type of the document – inverter in this case since we are adding an inverter sensor, and select the Id Type, since sensors are given DIDs, we select DID.

Next, we select the UI as a “Dialog” as we have done before from the drop-down. We then add content and title.

![](https://i.imgur.com/QEqdlDd.png)

**Programmatically this workflow step looks like this:**

```
              "children": [
                // Button to create new sensor.
                {
                  "tag": "add_sensor_bnt",
                  "defaultActive": true,
                  "permissions": [
                    "INSTALLER"
                  ],
                  "blockType": "requestVcDocument",
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
```
