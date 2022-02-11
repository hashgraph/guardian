# Policy Workflow Step 12



We then click back to the “sensors\_page” button on the left side to add a “Step” into the process by clicking on the “Step” button in the top navigation bar.

We name the tag, add permissions – again installer since this action will still be performed by the installer, select the UI type as “Blank” and set the cyclic flag since we want to add more than one sensor to the grid.

![](https://i.imgur.com/DswrHB4.png)

**Programmatically this workflow step looks like this:**

```
            {
              "defaultActive": true,
              "tag": "create_new_sensor_steps",
              "permissions": [
                "INSTALLER"
              ],
              "blockType": "interfaceStepBlock",
              "uiMetaData": {
                "type": "blank"
              },
```
