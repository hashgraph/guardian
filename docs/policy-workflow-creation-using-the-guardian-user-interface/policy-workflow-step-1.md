# Policy Workflow Step 1

Navigate to the top row of the interface, and click on the “Step” button which creates the 1st policy action – called Block2 – in the policy workflow, we just created.

You can edit the policy action name and the UI will automatically adjust the graphical representation of the policy action on the left side to “init\_installer\_steps”.

We then select the “Permissions” for this new Policy Action.

And then the UI “Type” as “Blank”.

We then select “Default Active” as true since this policy action must always occur at the beginning of the policy.

Now we have a Policy Action defined, however, without any specific actions

![](../.gitbook/assets/PW\_image\_6.png)

**Programmatically this workflow step looks like this:**

```
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
```
