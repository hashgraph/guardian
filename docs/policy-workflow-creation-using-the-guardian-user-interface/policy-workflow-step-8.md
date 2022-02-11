# Policy Workflow Step 8



Next, we want to add another step to our policy action. To do this we again go back to the Policy Action itself by clicking on the “init\_installer\_steps” Policy Action icon on the left.

At this point, we need to create a sub Policy Action process as a dependent workflow. We can always do this by adding a container block by clicking on the “Container” button in the top navigation bar.

We now configure this new container block through the “Tag”, Permissions, setting the Default Active (since this step must be initiated), and selecting the UI type (TABS in our case since we will have to fill in different types of information in different sections).

![](https://i.imgur.com/cT6JAa1.png)

**Programmatically this workflow step looks like this:**

```
   // Create an interfaceContainerBlock to group all pages accessible after registration is completed.
    {
      "blockType": "interfaceContainerBlock",
      "tag": "installer_header",
      "defaultActive": true,
      "permissions": [
        "INSTALLER"
      ],
      "uiMetaData": {
        // In this example, INSTALLER would be able to access two tabs.
        "type": "tabs"
      },
```
