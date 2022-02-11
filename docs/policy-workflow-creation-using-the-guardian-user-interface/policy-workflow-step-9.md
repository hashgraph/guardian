# Policy Workflow Step 9



Next, we add another container block by clicking on the “Container” button in the top navigation bar because we want now to add the UI pages as TABS as we indicated in the previous block.

This block is to set up sensors by the Installer and, therefore the page of the UI should be BLANK to be able to add data.

![](https://i.imgur.com/gA9WNWl.png)

**Programmatically this workflow step looks like this:**

```
      "children": [
        // Create an interfaceContainerBlock to group all components on the sensor page.
        {
          "blockType": "interfaceContainerBlock",
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
```
