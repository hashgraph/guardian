# Policy Workflow Step 9

Next, we add another container block by clicking on the “Container” button in the top navigation bar because we want now to add the UI pages as TABS as we indicated in the previous block.

This block is to set up sensors by the Installer and, therefore the page of the UI should be BLANK to be able to add data.

![](../../../../../.gitbook/assets/PW\_image\_14.png)

**Programmatically this workflow step looks like this:**

```
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
            // "title" - name of the tab. If the parent is InterfaceContainerBlock the value from title is used for tab name.
            // If the "title" is empty the block name is used as the tab name.
            "title": "Sensors"
          },
```
