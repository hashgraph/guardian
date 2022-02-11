# Policy Workflow Step 4



Next, we want to add another step to our policy action. To do this we again go back to the Policy Action itself by clicking on the “init\_installer\_steps” Policy Action icon on the left.

This time we need to deal with the new approval document that was sent, so we add an “information” step as a block by clicking on the “Information” icon in the top navigation bar.

Again we are naming the “Tag” to better identify this policy action step. In this case, we want to inform the user of the status of the approval in the previous workflow step.

Next, we are setting the Permission to “Installer”.

Since approval is mandatory, the step must be active by default.

Also, the next step cannot occur before approval is given. Therefore we set “Stop Propagation”.

For the approval UI, we then specify what Type it is from the drop-down. In our case, a simple TEXT UI is enough to display the approval status.

We then finish by giving the UI a Title and Description.

![](https://i.imgur.com/OfodRPF.png)

**Programmatically this workflow step looks like this:**

```
   // Notify the user after submitting the request for approval.
    {
      //"informationBlock" - block type which can display a notification or a progress bar.
      "blockType": "informationBlock",
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
      // Do not pass control to the next block after displaying the message as need to wait for RootAuthority approval.
      "stopPropagation": true,
      "defaultActive": true
    },
```
